import { Request, Response } from 'express';
import { getDB, saveMemoryDB } from '../db/index.ts';

export async function getReels(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 10));

    const db = getDB();
    const reels = db.videos
      .filter(v => v.is_short === 1 && !v.is_deleted)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = reels.length;
    const startIndex = (page - 1) * limit;
    const paginated = reels.slice(startIndex, startIndex + limit);

    const enriched = paginated.map(v => {
      const author = db.user_profiles.find(p => p.user_id === v.user_id);
      const isLiked = currentUserId
        ? db.video_reactions.some(r => r.video_id === v.id && r.user_id === currentUserId)
        : false;
      const isFollowing = currentUserId
        ? db.followers.some(f => f.follower_id === currentUserId && f.following_id === v.user_id)
        : false;

      return {
        ...v,
        author,
        isLiked,
        isFollowing
      };
    });

    res.json({
      success: true,
      data: {
        reels: enriched,
        pagination: {
          page,
          limit,
          total,
          hasMore: startIndex + limit < total
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getVideos(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const search = (req.query.q as string)?.toLowerCase().trim();
    const db = getDB();

    let list = db.videos.filter(v => v.is_short === 0 && !v.is_deleted);

    if (search) {
      list = list.filter(v =>
        v.title.toLowerCase().includes(search) ||
        (v.description && v.description.toLowerCase().includes(search))
      );
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const enriched = list.map(v => {
      const author = db.user_profiles.find(p => p.user_id === v.user_id);
      const isLiked = currentUserId
        ? db.video_reactions.some(r => r.video_id === v.id && r.user_id === currentUserId)
        : false;

      return {
        ...v,
        author,
        isLiked
      };
    });

    res.json({
      success: true,
      data: enriched
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createVideo(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      duration = 0,
      isShort = false,
      storageType = 'LOCAL'
    } = req.body;

    if (!title?.trim() || !videoUrl) {
      res.status(400).json({ success: false, message: 'Title and video URL are required.' });
      return;
    }

    const db = getDB();
    const newId = db.videos.length ? Math.max(...db.videos.map(v => v.id)) + 1 : 1;

    const newVideo = {
      id: newId,
      user_id: userId,
      title: title.trim(),
      description: description?.trim() || null,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
      duration: Number(duration) || 60,
      views_count: 0,
      likes_count: 0,
      comments_count: 0,
      storage_type: storageType as any,
      is_short: isShort ? 1 : 0,
      is_deleted: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.videos.unshift(newVideo);
    saveMemoryDB();

    const author = db.user_profiles.find(p => p.user_id === userId);

    res.status(201).json({
      success: true,
      message: isShort ? 'Short video (Reel) uploaded successfully!' : 'Video published successfully!',
      data: {
        ...newVideo,
        author,
        isLiked: false
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function reactToVideo(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const videoId = parseInt(req.params.id);
    const db = getDB();
    const video = db.videos.find(v => v.id === videoId && !v.is_deleted);
    if (!video) {
      res.status(404).json({ success: false, message: 'Video not found.' });
      return;
    }

    const existingIndex = db.video_reactions.findIndex(r => r.video_id === videoId && r.user_id === userId);

    let isLiked = false;
    if (existingIndex !== -1) {
      db.video_reactions.splice(existingIndex, 1);
      video.likes_count = Math.max(0, video.likes_count - 1);
      isLiked = false;
    } else {
      const newId = db.video_reactions.length ? Math.max(...db.video_reactions.map(r => r.id)) + 1 : 1;
      db.video_reactions.push({
        id: newId,
        video_id: videoId,
        user_id: userId,
        reaction_type: 'LIKE',
        created_at: new Date().toISOString()
      });
      video.likes_count += 1;
      isLiked = true;
    }

    saveMemoryDB();

    res.json({
      success: true,
      data: {
        likesCount: video.likes_count,
        isLiked
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function recordVideoView(req: Request, res: Response): Promise<void> {
  try {
    const videoId = parseInt(req.params.id);
    const db = getDB();
    const video = db.videos.find(v => v.id === videoId && !v.is_deleted);
    if (video) {
      video.views_count += 1;
      saveMemoryDB();
    }
    res.json({ success: true, data: { viewsCount: video?.views_count || 0 } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
