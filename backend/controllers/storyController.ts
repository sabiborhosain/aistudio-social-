import { Request, Response } from 'express';
import { getDB, saveMemoryDB } from '../db/index.ts';

export async function getStories(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const db = getDB();
    const now = new Date();

    // Filter out expired stories (24h rule)
    const activeStories = db.stories.filter(s => !s.is_deleted && new Date(s.expires_at) > now);

    // Group stories by user_id
    const userMap = new Map<number, any>();

    activeStories.forEach(s => {
      const hasViewed = currentUserId ? db.story_views.some(v => v.story_id === s.id && v.user_id === currentUserId) : false;
      const author = db.user_profiles.find(p => p.user_id === s.user_id);

      if (!userMap.has(s.user_id)) {
        userMap.set(s.user_id, {
          userId: s.user_id,
          author,
          stories: [],
          allViewed: true
        });
      }

      const group = userMap.get(s.user_id);
      group.stories.push({
        ...s,
        hasViewed
      });
      if (!hasViewed) {
        group.allViewed = false;
      }
    });

    // Sort: current user first, then unviewed, then viewed
    const storyGroups = Array.from(userMap.values()).sort((a, b) => {
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      if (a.allViewed !== b.allViewed) return a.allViewed ? 1 : -1;
      return 0;
    });

    res.json({
      success: true,
      data: storyGroups
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createStory(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { mediaUrl, mediaType = 'IMAGE', textContent, backgroundColor = '#0f172a' } = req.body;

    if (!mediaUrl && !textContent?.trim()) {
      res.status(400).json({ success: false, message: 'Story must contain media or text content.' });
      return;
    }

    const db = getDB();
    const newStoryId = db.stories.length ? Math.max(...db.stories.map(s => s.id)) + 1 : 1;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const newStory = {
      id: newStoryId,
      user_id: userId,
      media_url: mediaUrl || null,
      media_type: mediaType as any,
      text_content: textContent?.trim() || null,
      background_color: backgroundColor,
      views_count: 0,
      expires_at: expiresAt,
      is_deleted: 0,
      created_at: new Date().toISOString()
    };
    db.stories.push(newStory);
    saveMemoryDB();

    const author = db.user_profiles.find(p => p.user_id === userId);

    res.status(201).json({
      success: true,
      message: 'Story published successfully (expires in 24h).',
      data: {
        ...newStory,
        author,
        hasViewed: false
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function viewStory(req: Request, res: Response): Promise<void> {
  try {
    const storyId = parseInt(req.params.id);
    const userId = req.user?.userId;

    const db = getDB();
    const story = db.stories.find(s => s.id === storyId && !s.is_deleted);
    if (!story) {
      res.status(404).json({ success: false, message: 'Story not found.' });
      return;
    }

    if (userId) {
      const alreadyViewed = db.story_views.some(v => v.story_id === storyId && v.user_id === userId);
      if (!alreadyViewed) {
        db.story_views.push({
          id: db.story_views.length + 1,
          story_id: storyId,
          user_id: userId,
          viewed_at: new Date().toISOString()
        });
        story.views_count += 1;
        saveMemoryDB();
      }
    }

    res.json({ success: true, data: { viewsCount: story.views_count } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteStory(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const storyId = parseInt(req.params.id);

    const db = getDB();
    const story = db.stories.find(s => s.id === storyId && !s.is_deleted);
    if (!story) {
      res.status(404).json({ success: false, message: 'Story not found.' });
      return;
    }

    if (story.user_id !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized to delete this story.' });
      return;
    }

    story.is_deleted = 1;
    saveMemoryDB();

    res.json({ success: true, message: 'Story removed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
