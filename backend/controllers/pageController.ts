import { Request, Response } from 'express';
import { getDB, saveMemoryDB } from '../db/index.ts';

export async function getPages(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const category = req.query.category as string;
    const db = getDB();

    let list = db.pages;
    if (category && category !== 'ALL') {
      list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    const enriched = list.map(page => {
      const isFollowing = currentUserId
        ? db.page_followers.some(f => f.page_id === page.id && f.user_id === currentUserId)
        : false;
      const owner = db.user_profiles.find(u => u.user_id === page.user_id);
      return {
        ...page,
        isFollowing,
        owner
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getPageBySlug(req: Request, res: Response): Promise<void> {
  try {
    const slug = req.params.slug;
    const currentUserId = req.user?.userId;
    const db = getDB();

    const page = db.pages.find(p => p.slug.toLowerCase() === slug.toLowerCase());
    if (!page) {
      res.status(404).json({ success: false, message: 'Page not found.' });
      return;
    }

    const isFollowing = currentUserId
      ? db.page_followers.some(f => f.page_id === page.id && f.user_id === currentUserId)
      : false;
    const owner = db.user_profiles.find(u => u.user_id === page.user_id);

    res.json({
      success: true,
      data: {
        ...page,
        isFollowing,
        owner
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createPage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      name,
      slug,
      description,
      category = 'Technology',
      avatarUrl,
      coverUrl,
      website,
      phone,
      email,
      location
    } = req.body;

    if (!name?.trim() || !slug?.trim()) {
      res.status(400).json({ success: false, message: 'Page name and URL slug are required.' });
      return;
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    const db = getDB();

    if (db.pages.some(p => p.slug === cleanSlug)) {
      res.status(409).json({ success: false, message: 'This page handle or URL slug is already taken.' });
      return;
    }

    const newId = db.pages.length ? Math.max(...db.pages.map(p => p.id)) + 1 : 1;

    const newPage = {
      id: newId,
      user_id: userId,
      name: name.trim(),
      slug: cleanSlug,
      description: description?.trim() || null,
      category,
      avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1516116211227-bbc3e617d59b?auto=format&fit=crop&w=400&q=80',
      cover_url: coverUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      website: website?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      location: location?.trim() || null,
      followers_count: 1,
      is_verified: 0,
      created_at: new Date().toISOString()
    };
    db.pages.push(newPage);

    // Auto follow creator
    db.page_followers.push({
      id: db.page_followers.length + 1,
      page_id: newId,
      user_id: userId,
      created_at: new Date().toISOString()
    });

    saveMemoryDB();

    res.status(201).json({
      success: true,
      message: 'Page created successfully!',
      data: {
        ...newPage,
        isFollowing: true
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function toggleFollowPage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const pageId = parseInt(req.params.id);
    const db = getDB();
    const page = db.pages.find(p => p.id === pageId);

    if (!page) {
      res.status(404).json({ success: false, message: 'Page not found.' });
      return;
    }

    const existingIndex = db.page_followers.findIndex(f => f.page_id === pageId && f.user_id === userId);

    let isFollowing = false;
    if (existingIndex !== -1) {
      db.page_followers.splice(existingIndex, 1);
      page.followers_count = Math.max(0, page.followers_count - 1);
      isFollowing = false;
    } else {
      db.page_followers.push({
        id: db.page_followers.length + 1,
        page_id: pageId,
        user_id: userId,
        created_at: new Date().toISOString()
      });
      page.followers_count += 1;
      isFollowing = true;
    }

    saveMemoryDB();

    res.json({
      success: true,
      data: {
        followersCount: page.followers_count,
        isFollowing
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
