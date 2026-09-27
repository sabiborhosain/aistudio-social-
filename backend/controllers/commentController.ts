import { Request, Response } from 'express';
import { getDB, saveMemoryDB } from '../db/index.ts';
import { Comment } from '../types/index.ts';

export async function getComments(req: Request, res: Response): Promise<void> {
  try {
    const postId = parseInt(req.params.postId);
    const currentUserId = req.user?.userId;
    const db = getDB();

    const postComments = db.comments.filter(c => c.post_id === postId && !c.is_deleted);

    // Group replies into parent comments
    const topLevelComments: Comment[] = [];
    const replyMap = new Map<number, Comment[]>();

    postComments.forEach(c => {
      const author = db.user_profiles.find(p => p.user_id === c.user_id);
      const userReaction = currentUserId
        ? db.comment_reactions.find(r => r.comment_id === c.id && r.user_id === currentUserId)?.reaction_type
        : null;

      const enriched: Comment = {
        ...c,
        author,
        userReaction: userReaction as any,
        replies: []
      };

      if (c.parent_id) {
        if (!replyMap.has(c.parent_id)) {
          replyMap.set(c.parent_id, []);
        }
        replyMap.get(c.parent_id)!.push(enriched);
      } else {
        topLevelComments.push(enriched);
      }
    });

    topLevelComments.forEach(top => {
      top.replies = replyMap.get(top.id) || [];
    });

    // Sort newest first
    topLevelComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    res.json({
      success: true,
      data: topLevelComments
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function addComment(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const postId = parseInt(req.params.postId);
    const { content, codeSnippet, codeLanguage, imageUrl, parentId } = req.body;

    if (!content?.trim() && !codeSnippet?.trim() && !imageUrl) {
      res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
      return;
    }

    const db = getDB();
    const post = db.posts.find(p => p.id === postId && !p.is_deleted);
    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found.' });
      return;
    }

    const newCommentId = db.comments.length ? Math.max(...db.comments.map(c => c.id)) + 1 : 1;

    const newComment = {
      id: newCommentId,
      post_id: postId,
      user_id: userId,
      parent_id: parentId ? Number(parentId) : null,
      content: content?.trim() || '',
      code_snippet: codeSnippet?.trim() || null,
      code_language: codeLanguage || (codeSnippet ? 'typescript' : null),
      image_url: imageUrl || null,
      likes_count: 0,
      is_deleted: 0,
      created_at: new Date().toISOString()
    };
    (db.comments as any[]).push(newComment);

    post.comments_count += 1;

    // Send notification to post author if not self
    if (post.user_id !== userId && (db as any).notifications) {
      const actor = db.user_profiles.find(p => p.user_id === userId);
      (db as any).notifications.push({
        id: (db as any).notifications.length + 1,
        user_id: post.user_id,
        actor_id: userId,
        entity_type: 'COMMENT',
        entity_id: post.id,
        message: `${actor?.full_name || 'Someone'} commented on your post: "${newComment.content.slice(0, 30)}..."`,
        is_read: 0,
        created_at: new Date().toISOString()
      });
    }

    saveMemoryDB();

    const author = db.user_profiles.find(p => p.user_id === userId);

    res.status(201).json({
      success: true,
      message: 'Comment posted.',
      data: {
        ...newComment,
        author,
        userReaction: null,
        replies: []
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function reactToComment(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const commentId = parseInt(req.params.id);
    const db = getDB();
    const comment = db.comments.find(c => c.id === commentId && !c.is_deleted);

    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found.' });
      return;
    }

    const existingIndex = db.comment_reactions.findIndex(r => r.comment_id === commentId && r.user_id === userId);

    let hasLiked = false;
    if (existingIndex !== -1) {
      db.comment_reactions.splice(existingIndex, 1);
      comment.likes_count = Math.max(0, comment.likes_count - 1);
      hasLiked = false;
    } else {
      const newId = db.comment_reactions.length ? Math.max(...db.comment_reactions.map(r => r.id)) + 1 : 1;
      db.comment_reactions.push({
        id: newId,
        comment_id: commentId,
        user_id: userId,
        reaction_type: 'LIKE',
        created_at: new Date().toISOString()
      });
      comment.likes_count += 1;
      hasLiked = true;
    }

    saveMemoryDB();

    res.json({
      success: true,
      data: {
        likesCount: comment.likes_count,
        hasLiked
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteComment(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const commentId = parseInt(req.params.id);

    const db = getDB();
    const comment = db.comments.find(c => c.id === commentId && !c.is_deleted);

    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found.' });
      return;
    }

    if (comment.user_id !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, message: 'You do not have permission to delete this comment.' });
      return;
    }

    comment.is_deleted = 1;
    const post = db.posts.find(p => p.id === comment.post_id);
    if (post && post.comments_count > 0) {
      post.comments_count -= 1;
    }

    saveMemoryDB();

    res.json({ success: true, message: 'Comment deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
