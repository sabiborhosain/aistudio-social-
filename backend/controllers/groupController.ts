import { Request, Response } from 'express';
import { getDB, saveMemoryDB } from '../db/index.ts';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Get all public groups and groups user belongs to
export async function getGroups(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const { category, search, filter } = req.query;

    const db = getDB();
    let groups = db.groups || [];

    if (category && category !== 'All') {
      groups = groups.filter(g => g.category.toLowerCase() === (category as string).toLowerCase());
    }

    if (search) {
      const q = (search as string).toLowerCase();
      groups = groups.filter(g => g.name.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q)));
    }

    if (filter === 'joined' && currentUserId) {
      const myGroupIds = db.group_members.filter(m => m.user_id === currentUserId).map(m => m.group_id);
      groups = groups.filter(g => myGroupIds.includes(g.id));
    }

    // Attach membership status and owner
    const mapped = groups.map(g => {
      const memberRecord = currentUserId
        ? db.group_members.find(m => m.group_id === g.id && m.user_id === currentUserId)
        : null;

      const hasPendingRequest = currentUserId
        ? db.group_join_requests.some(r => r.group_id === g.id && r.user_id === currentUserId && r.status === 'PENDING')
        : false;

      const owner = db.user_profiles.find(p => p.user_id === g.owner_id);

      return {
        ...g,
        currentUserRole: memberRecord ? memberRecord.role : null,
        isMember: !!memberRecord,
        hasPendingRequest,
        owner
      };
    });

    res.json({ success: true, data: mapped });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get single group details
export async function getGroup(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const { slugOrId } = req.params;

    const db = getDB();
    const group = db.groups.find(
      g => g.id.toString() === slugOrId || g.slug === slugOrId
    );

    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    const memberRecord = currentUserId
      ? db.group_members.find(m => m.group_id === group.id && m.user_id === currentUserId)
      : null;

    const hasPendingRequest = currentUserId
      ? db.group_join_requests.some(r => r.group_id === group.id && r.user_id === currentUserId && r.status === 'PENDING')
      : false;

    const owner = db.user_profiles.find(p => p.user_id === group.owner_id);

    res.json({
      success: true,
      data: {
        ...group,
        currentUserRole: memberRecord ? memberRecord.role : null,
        isMember: !!memberRecord,
        hasPendingRequest,
        owner
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Create group
export async function createGroup(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { name, description, category, privacy = 'PUBLIC', avatar_url, cover_url, rules } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Group name is required' });
      return;
    }

    const db = getDB();
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let count = 1;
    while (db.groups.some(g => g.slug === slug)) {
      slug = `${baseSlug}-${count++}`;
    }

    const nextGroupId = db.groups.length ? Math.max(...db.groups.map(g => g.id)) + 1 : 1;
    const now = new Date().toISOString();

    const newGroup = {
      id: nextGroupId,
      name: name.trim(),
      slug,
      description: description || null,
      category: category || 'General',
      privacy: (privacy === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC') as 'PUBLIC' | 'PRIVATE',
      avatar_url: avatar_url || null,
      cover_url: cover_url || null,
      rules: rules || null,
      owner_id: currentUserId,
      members_count: 1,
      posts_count: 0,
      created_at: now,
      updated_at: now
    };
    db.groups.push(newGroup);

    // Creator is OWNER
    const nextMemId = db.group_members.length ? Math.max(...db.group_members.map(m => m.id)) + 1 : 1;
    db.group_members.push({
      id: nextMemId,
      group_id: nextGroupId,
      user_id: currentUserId,
      role: 'OWNER',
      is_muted: 0,
      joined_at: now
    });

    saveMemoryDB();

    res.json({
      success: true,
      data: {
        ...newGroup,
        currentUserRole: 'OWNER',
        isMember: true
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Join group
export async function joinGroup(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const groupId = parseInt(req.params.id);

    if (!currentUserId || isNaN(groupId)) {
      res.status(400).json({ success: false, message: 'Invalid group' });
      return;
    }

    const db = getDB();
    const group = db.groups.find(g => g.id === groupId);
    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    // Check if banned
    const isBanned = db.group_bans.some(b => b.group_id === groupId && b.user_id === currentUserId);
    if (isBanned) {
      res.status(403).json({ success: false, message: 'You are banned from this group' });
      return;
    }

    // Check if already a member
    const existing = db.group_members.find(m => m.group_id === groupId && m.user_id === currentUserId);
    if (existing) {
      res.json({ success: true, message: 'Already a member', role: existing.role });
      return;
    }

    if (group.privacy === 'PRIVATE') {
      // Create join request
      const existingReq = db.group_join_requests.find(
        r => r.group_id === groupId && r.user_id === currentUserId && r.status === 'PENDING'
      );
      if (existingReq) {
        res.json({ success: true, message: 'Join request already submitted', status: 'PENDING' });
        return;
      }

      const nextReqId = db.group_join_requests.length ? Math.max(...db.group_join_requests.map(r => r.id)) + 1 : 1;
      db.group_join_requests.push({
        id: nextReqId,
        group_id: groupId,
        user_id: currentUserId,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      saveMemoryDB();

      res.json({ success: true, message: 'Join request sent to group admins', status: 'PENDING' });
      return;
    }

    // Public group: join immediately
    const nextMemId = db.group_members.length ? Math.max(...db.group_members.map(m => m.id)) + 1 : 1;
    db.group_members.push({
      id: nextMemId,
      group_id: groupId,
      user_id: currentUserId,
      role: 'MEMBER',
      is_muted: 0,
      joined_at: new Date().toISOString()
    });

    group.members_count = (group.members_count || 0) + 1;
    saveMemoryDB();

    res.json({ success: true, message: 'Joined group successfully', role: 'MEMBER' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Leave group
export async function leaveGroup(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const groupId = parseInt(req.params.id);

    if (!currentUserId || isNaN(groupId)) {
      res.status(400).json({ success: false, message: 'Invalid group' });
      return;
    }

    const db = getDB();
    const group = db.groups.find(g => g.id === groupId);
    const member = db.group_members.find(m => m.group_id === groupId && m.user_id === currentUserId);

    if (!member) {
      res.status(400).json({ success: false, message: 'You are not a member of this group' });
      return;
    }

    if (member.role === 'OWNER') {
      res.status(400).json({ success: false, message: 'Group owner cannot leave. Please transfer ownership or delete group.' });
      return;
    }

    db.group_members = db.group_members.filter(m => !(m.group_id === groupId && m.user_id === currentUserId));
    if (group && group.members_count > 0) {
      group.members_count -= 1;
    }

    saveMemoryDB();
    res.json({ success: true, message: 'Left group successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get group members
export async function getGroupMembers(req: Request, res: Response): Promise<void> {
  try {
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) {
      res.status(400).json({ success: false, message: 'Invalid group ID' });
      return;
    }

    const db = getDB();
    const members = db.group_members
      .filter(m => m.group_id === groupId)
      .map(m => {
        const profile = db.user_profiles.find(p => p.user_id === m.user_id);
        return {
          ...m,
          profile
        };
      });

    res.json({ success: true, data: members });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get pending join requests
export async function getGroupJoinRequests(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const currentUserRole = req.user?.role;
    const groupId = parseInt(req.params.id);

    const db = getDB();
    const member = db.group_members.find(m => m.group_id === groupId && m.user_id === currentUserId);
    const isGroupAdmin = member && (member.role === 'OWNER' || member.role === 'ADMIN' || (member.role as any) === 'MODERATOR');
    const isPlatformAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN';

    if (!isGroupAdmin && !isPlatformAdmin) {
      res.status(403).json({ success: false, message: 'Permission denied' });
      return;
    }

    const requests = db.group_join_requests
      .filter(r => r.group_id === groupId && r.status === 'PENDING')
      .map(r => {
        const user = db.user_profiles.find(p => p.user_id === r.user_id);
        return { ...r, user };
      });

    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Approve join request
export async function approveJoinRequest(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const currentUserRole = req.user?.role;
    const groupId = parseInt(req.params.id);
    const requestId = parseInt(req.params.requestId);

    const db = getDB();
    const member = db.group_members.find(m => m.group_id === groupId && m.user_id === currentUserId);
    const isGroupAdmin = member && (member.role === 'OWNER' || member.role === 'ADMIN' || (member.role as any) === 'MODERATOR');
    const isPlatformAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN';

    if (!isGroupAdmin && !isPlatformAdmin) {
      res.status(403).json({ success: false, message: 'Permission denied' });
      return;
    }

    const reqRecord = db.group_join_requests.find(r => r.id === requestId && r.group_id === groupId);
    if (!reqRecord) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    reqRecord.status = 'APPROVED' as any;
    reqRecord.updated_at = new Date().toISOString();

    // Add to members
    const nextMemId = db.group_members.length ? Math.max(...db.group_members.map(m => m.id)) + 1 : 1;
    db.group_members.push({
      id: nextMemId,
      group_id: groupId,
      user_id: reqRecord.user_id,
      role: 'MEMBER',
      is_muted: 0,
      joined_at: new Date().toISOString()
    });

    const group = db.groups.find(g => g.id === groupId);
    if (group) group.members_count = (group.members_count || 0) + 1;

    saveMemoryDB();
    res.json({ success: true, message: 'Request approved' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Reject join request
export async function rejectJoinRequest(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const currentUserRole = req.user?.role;
    const groupId = parseInt(req.params.id);
    const requestId = parseInt(req.params.requestId);

    const db = getDB();
    const member = db.group_members.find(m => m.group_id === groupId && m.user_id === currentUserId);
    const isGroupAdmin = member && (member.role === 'OWNER' || member.role === 'ADMIN' || (member.role as any) === 'MODERATOR');
    const isPlatformAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN';

    if (!isGroupAdmin && !isPlatformAdmin) {
      res.status(403).json({ success: false, message: 'Permission denied' });
      return;
    }

    const reqRecord = db.group_join_requests.find(r => r.id === requestId && r.group_id === groupId);
    if (reqRecord) {
      reqRecord.status = 'REJECTED' as any;
      reqRecord.updated_at = new Date().toISOString();
      saveMemoryDB();
    }

    res.json({ success: true, message: 'Request rejected' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Update member role (promote/demote)
export async function updateMemberRole(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const currentUserRole = req.user?.role;
    const groupId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);
    const { role } = req.body;

    const db = getDB();
    const currentMem = db.group_members.find(m => m.group_id === groupId && m.user_id === currentUserId);
    const isGroupOwner = currentMem?.role === 'OWNER';
    const isPlatformSuperAdmin = currentUserRole === 'SUPER_ADMIN';

    if (!isGroupOwner && !isPlatformSuperAdmin) {
      res.status(403).json({ success: false, message: 'Only group owner or platform admin can change member roles' });
      return;
    }

    const targetMem = db.group_members.find(m => m.group_id === groupId && m.user_id === targetUserId);
    if (!targetMem) {
      res.status(404).json({ success: false, message: 'Member not found in group' });
      return;
    }

    if (['ADMIN', 'MODERATOR', 'MEMBER'].includes(role)) {
      targetMem.role = role;
      saveMemoryDB();
      res.json({ success: true, message: `Member role updated to ${role}` });
    } else {
      res.status(400).json({ success: false, message: 'Invalid role' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Remove member from group
export async function removeMember(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const currentUserRole = req.user?.role;
    const groupId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);

    const db = getDB();
    const currentMem = db.group_members.find(m => m.group_id === groupId && m.user_id === currentUserId);
    const isGroupAdmin = currentMem && (currentMem.role === 'OWNER' || currentMem.role === 'ADMIN');
    const isPlatformAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN';

    if (!isGroupAdmin && !isPlatformAdmin) {
      res.status(403).json({ success: false, message: 'Permission denied' });
      return;
    }

    db.group_members = db.group_members.filter(m => !(m.group_id === groupId && m.user_id === targetUserId));
    const group = db.groups.find(g => g.id === groupId);
    if (group && group.members_count > 0) group.members_count -= 1;

    saveMemoryDB();
    res.json({ success: true, message: 'Member removed from group' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get group posts
export async function getGroupPosts(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const groupId = parseInt(req.params.id);

    if (isNaN(groupId)) {
      res.status(400).json({ success: false, message: 'Invalid group ID' });
      return;
    }

    const db = getDB();
    const group = db.groups.find(g => g.id === groupId);
    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    // Check if private and not a member
    if (group.privacy === 'PRIVATE') {
      const isMember = currentUserId && db.group_members.some(m => m.group_id === groupId && m.user_id === currentUserId);
      const isPlatformAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
      if (!isMember && !isPlatformAdmin) {
        res.status(403).json({ success: false, message: 'This is a private group. Join to view discussions.' });
        return;
      }
    }

    const posts = db.posts
      .filter((p: any) => p.group_id === groupId && p.is_deleted === 0)
      .sort((a, b) => {
        if (b.is_pinned !== a.is_pinned) return b.is_pinned - a.is_pinned;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .map(p => {
        const author = db.user_profiles.find(prof => prof.user_id === p.user_id);
        const blocks = db.post_blocks.filter(b => b.post_id === p.id).sort((a, b) => a.block_order - b.block_order);
        const userReaction = currentUserId
          ? db.post_reactions.find(r => r.user_id === currentUserId && r.post_id === p.id)?.reaction_type || null
          : null;

        return {
          ...p,
          author,
          blocks,
          userReaction,
          group
        };
      });

    res.json({ success: true, data: posts });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
