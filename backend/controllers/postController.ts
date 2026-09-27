import { Request, Response } from 'express';
import { getDB, saveMemoryDB } from '../db/index.ts';
import { Post, PostBlock, ReactionType, PostType } from '../types/index.ts';

export async function getFeed(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const feedType = (req.query.feedType as string) || 'all'; // all, following, code
    const currentUserId = req.user?.userId;

    const db = getDB();

    let allPosts = db.posts.filter(p => !p.is_deleted);

    if (feedType === 'code') {
      allPosts = allPosts.filter(p => p.post_type === 'CODE' || p.post_type === 'MIXED');
    } else if (feedType === 'following' && currentUserId) {
      const followingIds = db.followers
        .filter(f => f.follower_id === currentUserId)
        .map(f => f.following_id);
      allPosts = allPosts.filter(p => followingIds.includes(p.user_id) || p.user_id === currentUserId);
    }

    // Sort pinned first, then newest
    allPosts.sort((a, b) => {
      if (b.is_pinned !== a.is_pinned) return b.is_pinned - a.is_pinned;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const total = allPosts.length;
    const startIndex = (page - 1) * limit;
    const paginated = allPosts.slice(startIndex, startIndex + limit);

    const enrichedPosts: Post[] = paginated.map(p => {
      const author = db.user_profiles.find(prof => prof.user_id === p.user_id);
      const blocks = db.post_blocks
        .filter(b => b.post_id === p.id)
        .sort((a, b) => a.block_order - b.block_order);

      const userReaction = currentUserId
        ? db.post_reactions.find(r => r.post_id === p.id && r.user_id === currentUserId)?.reaction_type
        : null;

      const isSaved = currentUserId
        ? db.saved_posts.some(s => s.post_id === p.id && s.user_id === currentUserId)
        : false;

      return {
        ...p,
        post_type: p.post_type as PostType,
        privacy: p.privacy as any,
        author,
        blocks: blocks as any,
        userReaction: userReaction as ReactionType | null,
        isSaved
      };
    });

    res.json({
      success: true,
      data: {
        posts: enrichedPosts,
        pagination: {
          page,
          limit,
          total,
          hasMore: startIndex + limit < total
        }
      }
    });
  } catch (err: any) {
    console.error('[Posts] Get feed error:', err);
    res.status(500).json({ success: false, message: err.message, code: 'SERVER_ERROR' });
  }
}

export async function getPostById(req: Request, res: Response): Promise<void> {
  try {
    const postId = parseInt(req.params.id);
    const currentUserId = req.user?.userId;
    const db = getDB();

    const post = db.posts.find(p => p.id === postId && !p.is_deleted);
    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found.', code: 'NOT_FOUND' });
      return;
    }

    const author = db.user_profiles.find(prof => prof.user_id === post.user_id);
    const blocks = db.post_blocks
      .filter(b => b.post_id === post.id)
      .sort((a, b) => a.block_order - b.block_order);

    const userReaction = currentUserId
      ? db.post_reactions.find(r => r.post_id === post.id && r.user_id === currentUserId)?.reaction_type
      : null;

    const isSaved = currentUserId
      ? db.saved_posts.some(s => s.post_id === post.id && s.user_id === currentUserId)
      : false;

    res.json({
      success: true,
      data: {
        ...post,
        author,
        blocks,
        userReaction,
        isSaved
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createPost(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      content,
      postType = 'NORMAL',
      privacy = 'PUBLIC',
      locationName,
      feelingEmoji,
      feelingText,
      pageId,
      groupId,
      blocks = []
    } = req.body;

    const db = getDB();
    const newPostId = db.posts.length ? Math.max(...db.posts.map(p => p.id)) + 1 : 1;

    // Detect if post has code blocks
    let derivedType = postType;
    if (blocks.some((b: any) => b.type === 'CODE' || b.block_type === 'CODE')) {
      derivedType = blocks.length > 1 ? 'MIXED' : 'CODE';
    } else if (blocks.some((b: any) => b.type === 'IMAGE' || b.type === 'VIDEO' || b.block_type === 'IMAGE' || b.block_type === 'VIDEO')) {
      derivedType = 'MEDIA';
    }

    const newPost: any = {
      id: newPostId,
      user_id: userId,
      page_id: pageId ? Number(pageId) : null,
      group_id: groupId ? Number(groupId) : null,
      post_type: derivedType,
      privacy,
      content: content?.trim() || null,
      location_name: locationName?.trim() || null,
      feeling_emoji: feelingEmoji || null,
      feeling_text: feelingText || null,
      reactions_count: 0,
      comments_count: 0,
      shares_count: 0,
      views_count: 0,
      is_pinned: 0,
      is_deleted: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.posts.unshift(newPost);

    // Increment author post count
    const authorProfile = db.user_profiles.find(p => p.user_id === userId);
    if (authorProfile) {
      authorProfile.posts_count += 1;
    }

    // Increment group post count if applicable
    if (groupId) {
      const grp = db.groups.find(g => g.id === Number(groupId));
      if (grp) {
        grp.posts_count = (grp.posts_count || 0) + 1;
      }
    }

    // Insert blocks
    const savedBlocks: PostBlock[] = [];
    if (Array.isArray(blocks) && blocks.length > 0) {
      blocks.forEach((blk: any, idx: number) => {
        const blockId = db.post_blocks.length ? Math.max(...db.post_blocks.map(b => b.id)) + 1 : 1;
        const newBlock = {
          id: blockId,
          post_id: newPostId,
          block_order: idx,
          block_type: blk.type || blk.block_type || 'TEXT',
          content: blk.content || '',
          meta_json: blk.meta || blk.meta_json || null
        };
        db.post_blocks.push(newBlock);
        savedBlocks.push(newBlock);
      });
    }

    saveMemoryDB();

    res.status(201).json({
      success: true,
      message: 'Post published successfully.',
      data: {
        ...newPost,
        author: authorProfile,
        blocks: savedBlocks,
        userReaction: null,
        isSaved: false
      }
    });
  } catch (err: any) {
    console.error('[Posts] Create post error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function reactToPost(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const postId = parseInt(req.params.id);
    const { reactionType = 'LIKE' } = req.body;

    const db = getDB();
    const post = db.posts.find(p => p.id === postId && !p.is_deleted);
    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found.' });
      return;
    }

    const existingIndex = db.post_reactions.findIndex(r => r.post_id === postId && r.user_id === userId);

    let activeReaction: string | null = null;

    if (existingIndex !== -1) {
      const existing = db.post_reactions[existingIndex];
      if (existing.reaction_type === reactionType) {
        // Toggle off
        db.post_reactions.splice(existingIndex, 1);
        post.reactions_count = Math.max(0, post.reactions_count - 1);
        activeReaction = null;
      } else {
        // Switch reaction
        existing.reaction_type = reactionType;
        activeReaction = reactionType;
      }
    } else {
      // Add new reaction
      const newReactionId = db.post_reactions.length ? Math.max(...db.post_reactions.map(r => r.id)) + 1 : 1;
      db.post_reactions.push({
        id: newReactionId,
        post_id: postId,
        user_id: userId,
        reaction_type: reactionType,
        created_at: new Date().toISOString()
      });
      post.reactions_count += 1;
      activeReaction = reactionType;

      // Add notification for author
      if (post.user_id !== userId && (db as any).notifications) {
        const actor = db.user_profiles.find(p => p.user_id === userId);
        (db as any).notifications.push({
          id: (db as any).notifications.length + 1,
          user_id: post.user_id,
          actor_id: userId,
          entity_type: 'REACTION',
          entity_id: post.id,
          message: `${actor?.full_name || 'Someone'} reacted ${reactionType} to your post.`,
          is_read: 0,
          created_at: new Date().toISOString()
        });
      }
    }

    saveMemoryDB();

    res.json({
      success: true,
      data: {
        reactionsCount: post.reactions_count,
        userReaction: activeReaction
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function toggleSavePost(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const postId = parseInt(req.params.id);
    const db = getDB();
    const existingIndex = db.saved_posts.findIndex(s => s.post_id === postId && s.user_id === userId);

    let isSaved = false;
    if (existingIndex !== -1) {
      db.saved_posts.splice(existingIndex, 1);
      isSaved = false;
    } else {
      const newId = db.saved_posts.length ? Math.max(...db.saved_posts.map(s => s.id)) + 1 : 1;
      db.saved_posts.push({
        id: newId,
        user_id: userId,
        post_id: postId,
        created_at: new Date().toISOString()
      });
      isSaved = true;
    }

    saveMemoryDB();

    res.json({
      success: true,
      message: isSaved ? 'Post saved to your bookmarks.' : 'Post removed from saved bookmarks.',
      data: { isSaved }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSavedPosts(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const db = getDB();
    const savedPostIds = db.saved_posts
      .filter(s => s.user_id === userId)
      .map(s => s.post_id);

    const savedPosts = db.posts
      .filter(p => savedPostIds.includes(p.id) && !p.is_deleted)
      .map(p => {
        const author = db.user_profiles.find(prof => prof.user_id === p.user_id);
        const blocks = db.post_blocks
          .filter(b => b.post_id === p.id)
          .sort((a, b) => a.block_order - b.block_order);
        const userReaction = db.post_reactions.find(
          r => r.post_id === p.id && r.user_id === userId
        )?.reaction_type;

        return {
          ...p,
          post_type: p.post_type as PostType,
          privacy: p.privacy as any,
          author,
          blocks: blocks as any,
          userReaction: userReaction as ReactionType | null,
          isSaved: true
        };
      });

    res.json({
      success: true,
      data: {
        posts: savedPosts,
        pagination: {
          page: 1,
          limit: savedPosts.length,
          total: savedPosts.length,
          hasMore: false
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deletePost(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const postId = parseInt(req.params.id);

    const db = getDB();
    const post = db.posts.find(p => p.id === postId && !p.is_deleted);

    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found.' });
      return;
    }

    // Must be post author or admin
    if (post.user_id !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, message: 'You do not have permission to delete this post.' });
      return;
    }

    post.is_deleted = 1;
    post.updated_at = new Date().toISOString();

    const authorProfile = db.user_profiles.find(p => p.user_id === post.user_id);
    if (authorProfile && authorProfile.posts_count > 0) {
      authorProfile.posts_count -= 1;
    }

    saveMemoryDB();

    res.json({ success: true, message: 'Post successfully deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function sharePost(req: Request, res: Response): Promise<void> {
  try {
    const postId = parseInt(req.params.id);
    const db = getDB();
    const post = db.posts.find(p => p.id === postId && !p.is_deleted);

    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found.' });
      return;
    }

    post.shares_count += 1;
    saveMemoryDB();

    res.json({
      success: true,
      message: 'Post link copied / shared.',
      data: { sharesCount: post.shares_count }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
