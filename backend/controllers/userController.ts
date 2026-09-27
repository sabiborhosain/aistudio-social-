import { Request, Response } from 'express';
import { getDB, saveMemoryDB, isMySQL, getMySQLPool } from '../db/index.ts';

export async function getUserProfile(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    let rawIdentifier = req.params.username || req.params.id || req.params.userId || (req.query.userId as string);
    if (!rawIdentifier || rawIdentifier === 'me' || rawIdentifier === 'undefined' || rawIdentifier === 'null') {
      if (currentUserId) {
        rawIdentifier = String(currentUserId);
      } else {
        res.status(400).json({ success: false, message: 'User identifier required.' });
        return;
      }
    }
    const identifier = decodeURIComponent(rawIdentifier).trim();
    const isNum = !isNaN(Number(identifier)) && Number(identifier) > 0;

    let profile: any = null;
    let userRole: string | undefined = undefined;
    let userStatus: string | undefined = undefined;

    // 1. If MySQL is connected, query MySQL first
    if (isMySQL()) {
      const pool = getMySQLPool();
      if (pool) {
        try {
          let pQuery = 'SELECT * FROM user_profiles WHERE LOWER(username) = LOWER(?)';
          let pParams: any[] = [identifier];
          if (isNum) {
            pQuery = 'SELECT * FROM user_profiles WHERE LOWER(username) = LOWER(?) OR user_id = ? OR id = ?';
            pParams = [identifier, Number(identifier), Number(identifier)];
          }

          const [pRows]: any = await pool.query(pQuery, pParams);
          if (pRows && pRows.length > 0) {
            profile = pRows[0];
            const [uRows]: any = await pool.query('SELECT role, status FROM users WHERE id = ?', [profile.user_id]);
            if (uRows && uRows.length > 0) {
              userRole = uRows[0].role;
              userStatus = uRows[0].status;
            }
          } else {
            // Check if user exists in users table by id or email
            let uQuery = 'SELECT * FROM users WHERE LOWER(email) = LOWER(?)';
            let uParams: any[] = [identifier];
            if (isNum) {
              uQuery = 'SELECT * FROM users WHERE id = ? OR LOWER(email) = LOWER(?)';
              uParams = [Number(identifier), identifier];
            }
            const [uRows]: any = await pool.query(uQuery, uParams);
            if (uRows && uRows.length > 0) {
              const u = uRows[0];
              userRole = u.role;
              userStatus = u.status;
              const generatedUsername = u.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
              await pool.query(
                `INSERT INTO user_profiles (user_id, username, full_name, avatar_url, cover_url, bio, created_at, updated_at)
                 VALUES (?, ?, ?, ?, NULL, 'DevSphere Engineer', NOW(), NOW())
                 ON DUPLICATE KEY UPDATE updated_at = NOW()`,
                [
                  u.id,
                  generatedUsername,
                  generatedUsername.charAt(0).toUpperCase() + generatedUsername.slice(1),
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${generatedUsername}`
                ]
              );
              const [newPRows]: any = await pool.query('SELECT * FROM user_profiles WHERE user_id = ?', [u.id]);
              if (newPRows && newPRows.length > 0) {
                profile = newPRows[0];
              }
            }
          }
        } catch (dbErr: any) {
          console.warn('[userController] MySQL query error, falling back to memoryDB:', dbErr.message);
        }
      }
    }

    // 2. Fallback to memoryDB if not found or MySQL disabled
    if (!profile) {
      const db = getDB();
      profile = db.user_profiles.find(
        p => p.username.toLowerCase() === identifier.toLowerCase() || (isNum && p.user_id === Number(identifier))
      );

      if (!profile) {
        // Check if user exists in db.users
        const u = db.users.find(
          u => (isNum && u.id === Number(identifier)) || u.email.toLowerCase() === identifier.toLowerCase()
        );
        if (u) {
          const generatedUsername = u.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
          const nextId = db.user_profiles.length ? Math.max(...db.user_profiles.map(p => p.id)) + 1 : 1;
          profile = {
            id: nextId,
            user_id: u.id,
            username: generatedUsername,
            full_name: generatedUsername.charAt(0).toUpperCase() + generatedUsername.slice(1),
            avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${generatedUsername}`,
            cover_url: null,
            bio: 'DevSphere Engineer',
            location: null,
            website: null,
            work: null,
            education: null,
            gender: null,
            followers_count: 0,
            following_count: 0,
            friends_count: 0,
            posts_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          db.user_profiles.push(profile);
          saveMemoryDB();
          userRole = u.role;
          userStatus = u.status;
        }
      } else {
        const u = db.users.find(u => u.id === profile.user_id);
        userRole = u?.role;
        userStatus = u?.status;
      }
    }

    if (!profile) {
      res.status(404).json({ success: false, message: 'User profile not found.' });
      return;
    }

    const db = getDB();
    const isFollowing = currentUserId
      ? db.followers.some(f => f.follower_id === currentUserId && f.following_id === profile.user_id)
      : false;

    // Get user's recent posts
    const userPosts = db.posts
      .filter(p => p.user_id === profile.user_id && !p.is_deleted)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(p => {
        const blocks = db.post_blocks.filter(b => b.post_id === p.id).sort((a, b) => a.block_order - b.block_order);
        const userReaction = currentUserId
          ? db.post_reactions.find(r => r.post_id === p.id && r.user_id === currentUserId)?.reaction_type
          : null;
        return {
          ...p,
          author: profile,
          blocks,
          userReaction
        };
      });

    res.json({
      success: true,
      data: {
        profile,
        userRole: userRole || 'USER',
        userStatus: userStatus || 'ACTIVE',
        isFollowing,
        posts: userPosts
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  try {
    const q = (req.query.q as string)?.toLowerCase().trim();
    if (!q) {
      res.json({ success: true, data: [] });
      return;
    }

    const db = getDB();
    const matches = db.user_profiles
      .filter(p => p.username.toLowerCase().includes(q) || p.full_name.toLowerCase().includes(q))
      .slice(0, 15);

    res.json({ success: true, data: matches });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function toggleFollow(req: Request, res: Response): Promise<void> {
  try {
    const followerId = req.user?.userId;
    if (!followerId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const targetUserId = parseInt(req.params.id);
    if (followerId === targetUserId) {
      res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
      return;
    }

    const db = getDB();
    const targetProfile = db.user_profiles.find(p => p.user_id === targetUserId);
    const myProfile = db.user_profiles.find(p => p.user_id === followerId);

    if (!targetProfile || !myProfile) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const existingIndex = db.followers.findIndex(
      f => f.follower_id === followerId && f.following_id === targetUserId
    );

    let isFollowing = false;
    if (existingIndex !== -1) {
      db.followers.splice(existingIndex, 1);
      targetProfile.followers_count = Math.max(0, targetProfile.followers_count - 1);
      myProfile.following_count = Math.max(0, myProfile.following_count - 1);
      isFollowing = false;
    } else {
      db.followers.push({
        id: db.followers.length + 1,
        follower_id: followerId,
        following_id: targetUserId,
        created_at: new Date().toISOString()
      });
      targetProfile.followers_count += 1;
      myProfile.following_count += 1;
      isFollowing = true;

      // Notification
      if ((db as any).notifications) {
        (db as any).notifications.push({
          id: (db as any).notifications.length + 1,
          user_id: targetUserId,
          actor_id: followerId,
          entity_type: 'FOLLOW',
          entity_id: followerId,
          message: `${myProfile.full_name} started following you.`,
          is_read: 0,
          created_at: new Date().toISOString()
        });
      }
    }

    saveMemoryDB();

    res.json({
      success: true,
      data: {
        isFollowing,
        followersCount: targetProfile.followers_count
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      fullName,
      bio,
      location,
      website,
      work,
      education,
      gender,
      avatarUrl,
      coverUrl
    } = req.body;

    const db = getDB();
    const profile = db.user_profiles.find(p => p.user_id === userId);
    if (!profile) {
      res.status(404).json({ success: false, message: 'Profile not found.' });
      return;
    }

    if (fullName) profile.full_name = fullName.trim();
    if (bio !== undefined) profile.bio = bio;
    if (location !== undefined) profile.location = location;
    if (website !== undefined) profile.website = website;
    if (work !== undefined) profile.work = work;
    if (education !== undefined) profile.education = education;
    if (gender !== undefined) profile.gender = gender;
    if (avatarUrl) profile.avatar_url = avatarUrl;
    if (coverUrl) profile.cover_url = coverUrl;

    profile.updated_at = new Date().toISOString();
    saveMemoryDB();

    if (isMySQL()) {
      const pool = getMySQLPool();
      if (pool) {
        try {
          await pool.query(
            `UPDATE user_profiles
             SET full_name = ?, bio = ?, location = ?, website = ?, work = ?, education = ?, gender = ?,
                 avatar_url = COALESCE(?, avatar_url), cover_url = COALESCE(?, cover_url), updated_at = NOW()
             WHERE user_id = ?`,
            [
              fullName ? fullName.trim() : profile.full_name,
              bio !== undefined ? bio : profile.bio,
              location !== undefined ? location : profile.location,
              website !== undefined ? website : profile.website,
              work !== undefined ? work : profile.work,
              education !== undefined ? education : profile.education,
              gender !== undefined ? gender : profile.gender,
              avatarUrl || null,
              coverUrl || null,
              userId
            ]
          );
        } catch (dbErr: any) {
          console.warn('[userController] MySQL updateProfile warning:', dbErr.message);
        }
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: profile
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { theme, emailNotifications, soundEnabled, codeTheme } = req.body;

    const db = getDB();
    let settings = db.user_settings.find(s => s.user_id === userId);
    if (!settings) {
      settings = {
        id: db.user_settings.length + 1,
        user_id: userId!,
        theme: 'light',
        email_notifications: 1,
        sound_enabled: 1,
        code_theme: 'vivid-dark'
      };
      db.user_settings.push(settings);
    }

    if (theme) settings.theme = theme;
    if (emailNotifications !== undefined) settings.email_notifications = emailNotifications ? 1 : 0;
    if (soundEnabled !== undefined) settings.sound_enabled = soundEnabled ? 1 : 0;
    if (codeTheme) settings.code_theme = codeTheme;

    saveMemoryDB();

    res.json({ success: true, message: 'Settings saved.', data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updatePrivacy(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { whoCanSeePosts, whoCanSendRequests, whoCanSeeFriends } = req.body;

    const db = getDB();
    let privacy = db.privacy_settings.find(p => p.user_id === userId);
    if (!privacy) {
      privacy = {
        id: db.privacy_settings.length + 1,
        user_id: userId!,
        who_can_see_posts: 'PUBLIC',
        who_can_send_requests: 'EVERYONE',
        who_can_see_friends: 'PUBLIC'
      };
      db.privacy_settings.push(privacy);
    }

    if (whoCanSeePosts) privacy.who_can_see_posts = whoCanSeePosts;
    if (whoCanSendRequests) privacy.who_can_send_requests = whoCanSendRequests;
    if (whoCanSeeFriends) privacy.who_can_see_friends = whoCanSeeFriends;

    saveMemoryDB();

    res.json({ success: true, message: 'Privacy settings updated.', data: privacy });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
