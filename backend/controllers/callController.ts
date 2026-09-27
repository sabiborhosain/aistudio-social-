import { Request, Response } from 'express';
import { getDB, saveMemoryDB, isMySQL, getMySQLPool } from '../db/index.ts';
import { sendToUser } from '../services/websocketService.ts';

async function runMySQL(sql: string, params: any[] = []): Promise<any> {
  if (!isMySQL()) return null;
  const pool = getMySQLPool();
  if (!pool) return null;
  try {
    const [res] = await pool.query(sql, params);
    return res;
  } catch (err: any) {
    console.error('[MySQL Error in callController]:', err.message);
    return null;
  }
}

// Get user's call history
export async function getCallHistory(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const db = getDB();
    const calls = db.calls
      .filter(c => c.caller_id === currentUserId || c.receiver_id === currentUserId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(c => {
        const caller = db.user_profiles.find(p => p.user_id === c.caller_id);
        const receiver = db.user_profiles.find(p => p.user_id === c.receiver_id);
        return {
          ...c,
          caller,
          receiver,
          isIncoming: c.receiver_id === currentUserId
        };
      });

    res.json({ success: true, data: calls });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Initiate a call
export async function initiateCall(req: Request, res: Response): Promise<void> {
  try {
    const callerId = req.user?.userId;
    const { receiver_id, receiverId, call_type, callType } = req.body;
    const resolvedReceiverId = parseInt(receiver_id || receiverId);
    const resolvedType = (callType || call_type || 'VOICE').toUpperCase() as 'VOICE' | 'VIDEO';

    if (!callerId || isNaN(resolvedReceiverId)) {
      res.status(400).json({ success: false, message: 'Valid receiver ID required' });
      return;
    }

    if (callerId === resolvedReceiverId) {
      res.status(400).json({ success: false, message: 'Cannot call yourself' });
      return;
    }

    const db = getDB();

    // Check if blocked
    const isBlocked = db.blocked_users.some(
      b => (b.user_id === callerId && b.blocked_user_id === resolvedReceiverId) ||
           (b.user_id === resolvedReceiverId && b.blocked_user_id === callerId)
    );
    if (isBlocked) {
      res.status(403).json({ success: false, message: 'Cannot call this user' });
      return;
    }

    const nextCallId = db.calls.length ? Math.max(...db.calls.map(c => c.id)) + 1 : 1;
    const now = new Date().toISOString();

    const newCall: any = {
      id: nextCallId,
      caller_id: callerId,
      receiver_id: resolvedReceiverId,
      call_type: resolvedType,
      status: 'RINGING',
      started_at: null,
      ended_at: null,
      duration_seconds: 0,
      created_at: now
    };
    db.calls.push(newCall);

    saveMemoryDB();

    // MySQL write
    await runMySQL(
      'INSERT INTO calls (id, caller_id, receiver_id, call_type, status, duration_seconds, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())',
      [nextCallId, callerId, resolvedReceiverId, resolvedType, 'RINGING']
    );
    await runMySQL(
      'INSERT INTO call_participants (call_id, user_id, role, status, joined_at) VALUES (?, ?, ?, ?, NOW()), (?, ?, ?, ?, NULL)',
      [nextCallId, callerId, 'CALLER', 'ACCEPTED', nextCallId, resolvedReceiverId, 'RECEIVER', 'RINGING']
    );

    const callerProfile = db.user_profiles.find(p => p.user_id === callerId);
    const receiverProfile = db.user_profiles.find(p => p.user_id === resolvedReceiverId);

    // Relay incoming call to receiver via WebSocket
    sendToUser(resolvedReceiverId, 'call:incoming', {
      callId: nextCallId,
      callerId,
      caller: callerProfile,
      callType: resolvedType,
      timestamp: now
    });

    res.json({
      success: true,
      data: {
        ...newCall,
        caller: callerProfile,
        receiver: receiverProfile
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Update call status (ACCEPT, REJECT, END)
export async function updateCallStatus(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const callId = parseInt(req.params.id);
    const { status, duration_seconds, duration } = req.body;

    if (!currentUserId || isNaN(callId)) {
      res.status(400).json({ success: false, message: 'Invalid call ID' });
      return;
    }

    const db = getDB();
    const call: any = db.calls.find(c => c.id === callId);

    if (!call) {
      res.status(404).json({ success: false, message: 'Call record not found' });
      return;
    }

    if (call.caller_id !== currentUserId && call.receiver_id !== currentUserId) {
      res.status(403).json({ success: false, message: 'Not participant of this call' });
      return;
    }

    const now = new Date().toISOString();
    const resolvedDuration = duration_seconds !== undefined ? parseInt(duration_seconds) : (duration !== undefined ? parseInt(duration) : undefined);

    if (status === 'ACCEPTED') {
      call.status = 'ACCEPTED';
      call.started_at = now;
      await runMySQL('UPDATE calls SET status = ?, started_at = NOW() WHERE id = ?', ['ACCEPTED', callId]);
      await runMySQL('UPDATE call_participants SET status = ?, joined_at = NOW() WHERE call_id = ? AND user_id = ?', ['ACCEPTED', callId, currentUserId]);
      sendToUser(call.caller_id, 'call:accepted', { callId, receiverId: currentUserId });
    } else if (status === 'REJECTED') {
      call.status = 'REJECTED';
      call.ended_at = now;
      await runMySQL('UPDATE calls SET status = ?, ended_at = NOW() WHERE id = ?', ['REJECTED', callId]);
      await runMySQL('UPDATE call_participants SET status = ?, left_at = NOW() WHERE call_id = ? AND user_id = ?', ['REJECTED', callId, currentUserId]);
      sendToUser(call.caller_id, 'call:rejected', { callId, receiverId: currentUserId });
    } else if (status === 'MISSED') {
      call.status = 'MISSED';
      call.ended_at = now;
      await runMySQL('UPDATE calls SET status = ?, ended_at = NOW() WHERE id = ?', ['MISSED', callId]);
      sendToUser(call.caller_id, 'call:missed', { callId, receiverId: currentUserId });
    } else if (status === 'ENDED') {
      call.status = 'ENDED';
      call.ended_at = now;
      if (resolvedDuration !== undefined) {
        call.duration_seconds = resolvedDuration;
      } else if (call.started_at) {
        call.duration_seconds = Math.max(0, Math.floor((new Date(now).getTime() - new Date(call.started_at).getTime()) / 1000));
      }

      await runMySQL(
        'UPDATE calls SET status = ?, ended_at = NOW(), duration_seconds = ? WHERE id = ?',
        ['ENDED', call.duration_seconds || 0, callId]
      );
      await runMySQL('UPDATE call_participants SET status = ?, left_at = NOW() WHERE call_id = ?', ['LEFT', callId]);

      const otherUserId = call.caller_id === currentUserId ? call.receiver_id : call.caller_id;
      sendToUser(otherUserId, 'call:ended', { callId, endedBy: currentUserId, duration: call.duration_seconds });
    }

    saveMemoryDB();
    res.json({ success: true, data: call });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get WebRTC ICE Server Configuration
export async function getWebRTCSettings(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDB();
    const settings = db.webrtc_settings || {
      stun_server: 'stun:stun.l.google.com:19302',
      turn_server: '',
      turn_username: '',
      turn_credential: ''
    };

    // Format iceServers array for RTCPeerConnection
    const iceServers: any[] = [
      { urls: settings.stun_server || 'stun:stun.l.google.com:19302' }
    ];

    if (settings.turn_server) {
      iceServers.push({
        urls: settings.turn_server,
        username: settings.turn_username,
        credential: settings.turn_credential
      });
    }

    res.json({
      success: true,
      data: {
        settings,
        iceServers
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Update WebRTC settings (Admin only)
export async function updateWebRTCSettings(req: Request, res: Response): Promise<void> {
  try {
    const { stun_server, turn_server, turn_username, turn_credential } = req.body;
    const db = getDB();

    db.webrtc_settings = {
      stun_server: stun_server || 'stun:stun.l.google.com:19302',
      turn_server: turn_server || '',
      turn_username: turn_username || '',
      turn_credential: turn_credential || ''
    };

    saveMemoryDB();

    await runMySQL(
      `INSERT INTO webrtc_settings (id, stun_server, turn_server, turn_username, turn_credential)
       VALUES (1, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         stun_server = VALUES(stun_server),
         turn_server = VALUES(turn_server),
         turn_username = VALUES(turn_username),
         turn_credential = VALUES(turn_credential)`,
      [db.webrtc_settings.stun_server, db.webrtc_settings.turn_server, db.webrtc_settings.turn_username, db.webrtc_settings.turn_credential]
    );

    res.json({ success: true, message: 'WebRTC STUN/TURN configuration updated', data: db.webrtc_settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
