import { Request, Response } from 'express';
import { getDB, saveMemoryDB, isMySQL, getMySQLPool } from '../db/index.ts';
import { sendToUser } from '../services/websocketService.ts';

// Helper to run MySQL query safely
async function runMySQL(sql: string, params: any[] = []): Promise<any> {
  if (!isMySQL()) return null;
  const pool = getMySQLPool();
  if (!pool) return null;
  try {
    const [res] = await pool.query(sql, params);
    return res;
  } catch (err: any) {
    console.error('[MySQL Error in friendController]:', err.message);
    return null;
  }
}

// Get current user's friends or friends of another user
export async function getFriends(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const targetUserId = req.params.targetUserId
      ? parseInt(req.params.targetUserId)
      : (req.query.userId ? parseInt(req.query.userId as string) : currentUserId);

    if (!targetUserId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const db = getDB();

    // Find friendships
    const userFriendships = db.friendships.filter(f => f.user_id === targetUserId);
    const friendIds = userFriendships.map(f => f.friend_id);

    const friends = friendIds.map(fid => {
      const profile = db.user_profiles.find(p => p.user_id === fid);
      return profile ? { ...profile, friendship_id: userFriendships.find(f => f.friend_id === fid)?.id } : null;
    }).filter(Boolean);

    res.json({ success: true, data: friends });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get incoming friend requests
export async function getIncomingRequests(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const db = getDB();
    const requests = db.friend_requests
      .filter(r => r.receiver_id === currentUserId && r.status === 'PENDING')
      .map(r => {
        const sender = db.user_profiles.find(p => p.user_id === r.sender_id);
        return {
          ...r,
          sender
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get sent friend requests
export async function getSentRequests(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const db = getDB();
    const requests = db.friend_requests
      .filter(r => r.sender_id === currentUserId && r.status === 'PENDING')
      .map(r => {
        const receiver = db.user_profiles.find(p => p.user_id === r.receiver_id);
        return {
          ...r,
          receiver
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get mutual friends between current user and target user
export async function getMutualFriends(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const targetUserId = parseInt(req.params.targetUserId);

    if (!currentUserId || isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: 'Valid user IDs required' });
      return;
    }

    const db = getDB();
    const myFriends = new Set(db.friendships.filter(f => f.user_id === currentUserId).map(f => f.friend_id));
    const theirFriends = new Set(db.friendships.filter(f => f.user_id === targetUserId).map(f => f.friend_id));

    const mutualProfiles: any[] = [];
    myFriends.forEach(fid => {
      if (theirFriends.has(fid) && fid !== currentUserId && fid !== targetUserId) {
        const p = db.user_profiles.find(prof => prof.user_id === fid);
        if (p) mutualProfiles.push(p);
      }
    });

    res.json({
      success: true,
      data: {
        count: mutualProfiles.length,
        mutualFriends: mutualProfiles,
        friends: mutualProfiles
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get friendship status with target user
export async function getFriendshipStatus(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const targetUserId = parseInt(req.params.targetUserId);

    if (!currentUserId || isNaN(targetUserId)) {
      res.json({ success: true, data: { status: 'NONE' } });
      return;
    }

    if (currentUserId === targetUserId) {
      res.json({ success: true, data: { status: 'NONE', isSelf: true } });
      return;
    }

    const db = getDB();

    // Check blocked
    const isBlocked = db.blocked_users.some(
      b => (b.user_id === currentUserId && b.blocked_user_id === targetUserId) ||
           (b.user_id === targetUserId && b.blocked_user_id === currentUserId)
    );
    if (isBlocked) {
      res.json({ success: true, data: { status: 'BLOCKED' } });
      return;
    }

    // Check friends
    const areFriends = db.friendships.some(f => f.user_id === currentUserId && f.friend_id === targetUserId);
    if (areFriends) {
      res.json({ success: true, data: { status: 'FRIENDS' } });
      return;
    }

    // Check pending request sent by me
    const sentReq = db.friend_requests.find(
      r => r.sender_id === currentUserId && r.receiver_id === targetUserId && r.status === 'PENDING'
    );
    if (sentReq) {
      res.json({ success: true, data: { status: 'REQUEST_SENT', requestId: sentReq.id } });
      return;
    }

    // Check pending request received from them
    const receivedReq = db.friend_requests.find(
      r => r.sender_id === targetUserId && r.receiver_id === currentUserId && r.status === 'PENDING'
    );
    if (receivedReq) {
      res.json({ success: true, data: { status: 'REQUEST_RECEIVED', requestId: receivedReq.id } });
      return;
    }

    res.json({ success: true, data: { status: 'NONE' } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Send a friend request
export async function sendFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    const senderId = req.user?.userId;
    const receiverId = parseInt(req.params.targetUserId || req.body.targetUserId);

    if (!senderId || isNaN(receiverId)) {
      res.status(400).json({ success: false, message: 'Invalid target user' });
      return;
    }

    if (senderId === receiverId) {
      res.status(400).json({ success: false, message: 'You cannot send a friend request to yourself' });
      return;
    }

    const db = getDB();

    // Check if target user exists
    const receiver = db.users.find(u => u.id === receiverId);
    if (!receiver) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Check if blocked
    const isBlocked = db.blocked_users.some(
      b => (b.user_id === senderId && b.blocked_user_id === receiverId) ||
           (b.user_id === receiverId && b.blocked_user_id === senderId)
    );
    if (isBlocked) {
      res.status(403).json({ success: false, message: 'Cannot send friend request to this user' });
      return;
    }

    // Check if already friends
    const alreadyFriends = db.friendships.some(f => f.user_id === senderId && f.friend_id === receiverId);
    if (alreadyFriends) {
      res.status(400).json({ success: false, message: 'You are already friends with this user' });
      return;
    }

    // Check if reverse request exists (auto-accept!)
    const reverseReq = db.friend_requests.find(
      r => r.sender_id === receiverId && r.receiver_id === senderId && r.status === 'PENDING'
    );

    if (reverseReq) {
      reverseReq.status = 'ACCEPTED';
      reverseReq.updated_at = new Date().toISOString();

      const nextId = db.friendships.length ? Math.max(...db.friendships.map(f => f.id)) + 1 : 1;
      db.friendships.push(
        { id: nextId, user_id: senderId, friend_id: receiverId, created_at: new Date().toISOString() },
        { id: nextId + 1, user_id: receiverId, friend_id: senderId, created_at: new Date().toISOString() }
      );

      // Update counters
      const p1 = db.user_profiles.find(p => p.user_id === senderId);
      const p2 = db.user_profiles.find(p => p.user_id === receiverId);
      if (p1) p1.friends_count = (p1.friends_count || 0) + 1;
      if (p2) p2.friends_count = (p2.friends_count || 0) + 1;

      saveMemoryDB();

      // MySQL write
      await runMySQL('UPDATE friend_requests SET status = ?, updated_at = NOW() WHERE id = ?', ['ACCEPTED', reverseReq.id]);
      await runMySQL('INSERT IGNORE INTO friendships (user_id, friend_id, created_at) VALUES (?, ?, NOW()), (?, ?, NOW())', [
        senderId, receiverId, receiverId, senderId
      ]);
      await runMySQL('UPDATE user_profiles SET friends_count = friends_count + 1 WHERE user_id IN (?, ?)', [senderId, receiverId]);

      sendToUser(receiverId, 'friend:request_accepted', {
        friendId: senderId,
        friend: p1
      });

      res.json({ success: true, message: 'Friend request accepted', status: 'FRIENDS', data: { id: reverseReq.id } });
      return;
    }

    // Check if already sent
    const existingReq = db.friend_requests.find(
      r => r.sender_id === senderId && r.receiver_id === receiverId && r.status === 'PENDING'
    );
    if (existingReq) {
      res.json({ success: true, message: 'Friend request already sent', status: 'REQUEST_SENT', data: { id: existingReq.id } });
      return;
    }

    const newReqId = db.friend_requests.length ? Math.max(...db.friend_requests.map(r => r.id)) + 1 : 1;
    const newRequest = {
      id: newReqId,
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'PENDING' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.friend_requests.push(newRequest);

    // Send notification
    const senderProfile = db.user_profiles.find(p => p.user_id === senderId);
    const notifId = db.notifications.length ? Math.max(...db.notifications.map(n => n.id)) + 1 : 1;
    db.notifications.push({
      id: notifId,
      user_id: receiverId,
      actor_id: senderId,
      entity_type: 'FRIEND' as any,
      entity_id: newReqId,
      message: `${senderProfile?.full_name || 'Someone'} sent you a friend request.`,
      is_read: 0,
      created_at: new Date().toISOString()
    });

    saveMemoryDB();

    // MySQL write
    await runMySQL(
      'INSERT INTO friend_requests (id, sender_id, receiver_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE status = ?',
      [newReqId, senderId, receiverId, 'PENDING', 'PENDING']
    );
    await runMySQL(
      'INSERT INTO notifications (user_id, actor_id, entity_type, entity_id, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())',
      [receiverId, senderId, 'FRIEND', newReqId, `${senderProfile?.full_name || 'Someone'} sent you a friend request.`]
    );

    // Dispatch realtime socket notification
    sendToUser(receiverId, 'friend:request_received', {
      requestId: newReqId,
      sender: senderProfile
    });

    res.json({ success: true, message: 'Friend request sent', status: 'REQUEST_SENT', data: { id: newReqId } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Accept a friend request
export async function acceptFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const reqOrUserId = parseInt(req.params.requestId || req.params.targetUserId);

    if (!currentUserId || isNaN(reqOrUserId)) {
      res.status(400).json({ success: false, message: 'Invalid request' });
      return;
    }

    const db = getDB();
    // Look up by request ID or by sender_id
    let friendReq = db.friend_requests.find(r => r.id === reqOrUserId);
    if (!friendReq) {
      friendReq = db.friend_requests.find(r => r.sender_id === reqOrUserId && r.receiver_id === currentUserId && r.status === 'PENDING');
    }

    if (!friendReq || friendReq.receiver_id !== currentUserId) {
      res.status(404).json({ success: false, message: 'Friend request not found or not addressed to you' });
      return;
    }

    if (friendReq.status === 'ACCEPTED') {
      res.json({ success: true, message: 'Request already accepted', status: 'FRIENDS' });
      return;
    }

    friendReq.status = 'ACCEPTED';
    friendReq.updated_at = new Date().toISOString();

    // Create bidirectional friendship
    const nextFid = db.friendships.length ? Math.max(...db.friendships.map(f => f.id)) + 1 : 1;
    db.friendships.push(
      { id: nextFid, user_id: currentUserId, friend_id: friendReq.sender_id, created_at: new Date().toISOString() },
      { id: nextFid + 1, user_id: friendReq.sender_id, friend_id: currentUserId, created_at: new Date().toISOString() }
    );

    // Update friend counts
    const p1 = db.user_profiles.find(p => p.user_id === currentUserId);
    const p2 = db.user_profiles.find(p => p.user_id === friendReq.sender_id);
    if (p1) p1.friends_count = (p1.friends_count || 0) + 1;
    if (p2) p2.friends_count = (p2.friends_count || 0) + 1;

    // Notification to sender
    const notifId = db.notifications.length ? Math.max(...db.notifications.map(n => n.id)) + 1 : 1;
    db.notifications.push({
      id: notifId,
      user_id: friendReq.sender_id,
      actor_id: currentUserId,
      entity_type: 'FRIEND' as any,
      entity_id: friendReq.id,
      message: `${p1?.full_name || 'Someone'} accepted your friend request.`,
      is_read: 0,
      created_at: new Date().toISOString()
    });

    saveMemoryDB();

    // MySQL write
    await runMySQL('UPDATE friend_requests SET status = ?, updated_at = NOW() WHERE id = ?', ['ACCEPTED', friendReq.id]);
    await runMySQL('INSERT IGNORE INTO friendships (user_id, friend_id, created_at) VALUES (?, ?, NOW()), (?, ?, NOW())', [
      currentUserId, friendReq.sender_id, friendReq.sender_id, currentUserId
    ]);
    await runMySQL('UPDATE user_profiles SET friends_count = friends_count + 1 WHERE user_id IN (?, ?)', [currentUserId, friendReq.sender_id]);
    await runMySQL(
      'INSERT INTO notifications (user_id, actor_id, entity_type, entity_id, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())',
      [friendReq.sender_id, currentUserId, 'FRIEND', friendReq.id, `${p1?.full_name || 'Someone'} accepted your friend request.`]
    );

    sendToUser(friendReq.sender_id, 'friend:request_accepted', {
      friendId: currentUserId,
      friend: p1
    });

    res.json({ success: true, message: 'Friend request accepted', status: 'FRIENDS' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Reject a friend request
export async function rejectFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const reqOrUserId = parseInt(req.params.requestId || req.params.targetUserId);

    if (!currentUserId || isNaN(reqOrUserId)) {
      res.status(400).json({ success: false, message: 'Invalid request' });
      return;
    }

    const db = getDB();
    let friendReq = db.friend_requests.find(r => r.id === reqOrUserId);
    if (!friendReq) {
      friendReq = db.friend_requests.find(r => r.sender_id === reqOrUserId && r.receiver_id === currentUserId && r.status === 'PENDING');
    }

    if (!friendReq || friendReq.receiver_id !== currentUserId) {
      res.status(404).json({ success: false, message: 'Friend request not found' });
      return;
    }

    friendReq.status = 'REJECTED';
    friendReq.updated_at = new Date().toISOString();
    saveMemoryDB();

    await runMySQL('UPDATE friend_requests SET status = ?, updated_at = NOW() WHERE id = ?', ['REJECTED', friendReq.id]);

    res.json({ success: true, message: 'Friend request rejected', status: 'NONE' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Cancel a sent friend request
export async function cancelFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const paramId = parseInt(req.params.targetUserId || req.params.requestId);

    if (!currentUserId || isNaN(paramId)) {
      res.status(400).json({ success: false, message: 'Invalid target user or request ID' });
      return;
    }

    const db = getDB();
    // 1. Check if paramId matches a request id
    let idx = db.friend_requests.findIndex(
      r => r.id === paramId && (r.sender_id === currentUserId || r.receiver_id === currentUserId)
    );

    // 2. Or if paramId was the target receiver_id
    if (idx === -1) {
      idx = db.friend_requests.findIndex(
        r => r.sender_id === currentUserId && r.receiver_id === paramId && r.status === 'PENDING'
      );
    }

    if (idx !== -1) {
      const removed = db.friend_requests.splice(idx, 1)[0];
      saveMemoryDB();
      await runMySQL('DELETE FROM friend_requests WHERE id = ?', [removed.id]);
    }

    res.json({ success: true, message: 'Friend request cancelled', status: 'NONE' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Unfriend a user
export async function unfriend(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const targetUserId = parseInt(req.params.targetUserId);

    if (!currentUserId || isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid target user' });
      return;
    }

    const db = getDB();
    const initialLen = db.friendships.length;
    db.friendships = db.friendships.filter(
      f => !(f.user_id === currentUserId && f.friend_id === targetUserId) &&
           !(f.user_id === targetUserId && f.friend_id === currentUserId)
    );

    if (db.friendships.length !== initialLen) {
      const p1 = db.user_profiles.find(p => p.user_id === currentUserId);
      const p2 = db.user_profiles.find(p => p.user_id === targetUserId);
      if (p1 && p1.friends_count > 0) p1.friends_count -= 1;
      if (p2 && p2.friends_count > 0) p2.friends_count -= 1;
      saveMemoryDB();

      await runMySQL(
        'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
        [currentUserId, targetUserId, targetUserId, currentUserId]
      );
      await runMySQL(
        'UPDATE user_profiles SET friends_count = GREATEST(0, friends_count - 1) WHERE user_id IN (?, ?)',
        [currentUserId, targetUserId]
      );
    }

    res.json({ success: true, message: 'Unfriended successfully', status: 'NONE' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Block a user
export async function blockUser(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const targetUserId = parseInt(req.params.targetUserId);
    const reason = req.body.reason || null;

    if (!currentUserId || isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid target user' });
      return;
    }

    if (currentUserId === targetUserId) {
      res.status(400).json({ success: false, message: 'You cannot block yourself' });
      return;
    }

    const db = getDB();

    // Remove any existing friendships
    db.friendships = db.friendships.filter(
      f => !(f.user_id === currentUserId && f.friend_id === targetUserId) &&
           !(f.user_id === targetUserId && f.friend_id === currentUserId)
    );

    // Remove pending friend requests
    db.friend_requests = db.friend_requests.filter(
      r => !(r.sender_id === currentUserId && r.receiver_id === targetUserId) &&
           !(r.sender_id === targetUserId && r.receiver_id === currentUserId)
    );

    // Check if already blocked
    const alreadyBlocked = db.blocked_users.some(
      b => b.user_id === currentUserId && b.blocked_user_id === targetUserId
    );

    if (!alreadyBlocked) {
      const nextId = db.blocked_users.length ? Math.max(...db.blocked_users.map(b => b.id)) + 1 : 1;
      db.blocked_users.push({
        id: nextId,
        user_id: currentUserId,
        blocked_user_id: targetUserId,
        reason,
        created_at: new Date().toISOString()
      });
      await runMySQL('INSERT IGNORE INTO blocked_users (user_id, blocked_user_id, created_at) VALUES (?, ?, NOW())', [
        currentUserId, targetUserId
      ]);
    }

    saveMemoryDB();

    await runMySQL(
      'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [currentUserId, targetUserId, targetUserId, currentUserId]
    );
    await runMySQL(
      'DELETE FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
      [currentUserId, targetUserId, targetUserId, currentUserId]
    );

    res.json({ success: true, message: 'User blocked successfully', status: 'BLOCKED' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Unblock a user
export async function unblockUser(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const targetUserId = parseInt(req.params.targetUserId);

    if (!currentUserId || isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid target user' });
      return;
    }

    const db = getDB();
    db.blocked_users = db.blocked_users.filter(
      b => !(b.user_id === currentUserId && b.blocked_user_id === targetUserId)
    );

    saveMemoryDB();
    await runMySQL('DELETE FROM blocked_users WHERE user_id = ? AND blocked_user_id = ?', [currentUserId, targetUserId]);

    res.json({ success: true, message: 'User unblocked successfully', status: 'NONE' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get list of blocked users
export async function getBlockedUsers(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const db = getDB();
    const blocks = db.blocked_users
      .filter(b => b.user_id === currentUserId)
      .map(b => {
        const profile = db.user_profiles.find(p => p.user_id === b.blocked_user_id);
        return {
          ...b,
          blocked_profile: profile,
          user: profile
        };
      });

    res.json({ success: true, data: blocks });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
