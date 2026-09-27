import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants.ts';
import { getDB, saveMemoryDB } from '../db/index.ts';

interface AuthenticatedSocket extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

// Map of userId -> Set of active WebSockets (supports multiple tabs / devices)
const userSockets = new Map<number, Set<AuthenticatedSocket>>();

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedSocket, req) => {
    ws.isAlive = true;

    // Try extracting token from URL query string ?token=...
    try {
      const url = new URL(req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');
      if (token) {
        authenticateSocket(ws, token);
      }
    } catch {
      // Ignored
    }

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (messageRaw: string) => {
      try {
        const payload = JSON.parse(messageRaw.toString());
        handleSocketMessage(ws, payload);
      } catch (err) {
        console.error('[WebSocket] Malformed message:', err);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        removeUserSocket(ws.userId, ws);
      }
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Socket error:', err);
      if (ws.userId) {
        removeUserSocket(ws.userId, ws);
      }
    });
  });

  // Heartbeat ping/pong every 30 seconds
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((wsClient) => {
      const client = wsClient as AuthenticatedSocket;
      if (client.isAlive === false) {
        if (client.userId) {
          removeUserSocket(client.userId, client);
        }
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('[DevSphere WebSocket] Realtime WebSocket server mounted at /ws');
  return wss;
}

function authenticateSocket(ws: AuthenticatedSocket, token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    if (!decoded || !decoded.userId) return false;

    ws.userId = decoded.userId;

    if (!userSockets.has(decoded.userId)) {
      userSockets.set(decoded.userId, new Set());
      // Broadcast online status to connections
      broadcastPresence(decoded.userId, true);
    }
    userSockets.get(decoded.userId)!.add(ws);

    // Send confirmation back to socket
    send(ws, 'auth:success', { userId: decoded.userId });
    return true;
  } catch {
    send(ws, 'auth:error', { message: 'Invalid or expired token' });
    return false;
  }
}

function removeUserSocket(userId: number, ws: AuthenticatedSocket) {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.delete(ws);
    if (sockets.size === 0) {
      userSockets.delete(userId);
      broadcastPresence(userId, false);
    }
  }
}

function broadcastPresence(userId: number, isOnline: boolean) {
  const payload = {
    userId,
    isOnline,
    lastSeen: new Date().toISOString()
  };

  // Broadcast to all connected sockets
  wss?.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      send(client as AuthenticatedSocket, 'user:presence', payload);
    }
  });
}

function handleSocketMessage(ws: AuthenticatedSocket, message: any) {
  const { event, data } = message;

  // Authentication event
  if (event === 'auth') {
    if (data?.token) {
      authenticateSocket(ws, data.token);
    }
    return;
  }

  // Ensure socket is authenticated for subsequent events
  if (!ws.userId) {
    send(ws, 'error', { message: 'Unauthorized. Please authenticate first.' });
    return;
  }

  const currentUserId = ws.userId;
  const db = getDB();

  switch (event) {
    // ---------------- CHAT TYPING INDICATOR ----------------
    case 'chat:typing': {
      const { conversationId, isTyping } = data || {};
      if (!conversationId) return;

      // Find other members of conversation
      const members = db.conversation_members.filter(m => m.conversation_id === conversationId);
      for (const m of members) {
        if (m.user_id !== currentUserId) {
          sendToUser(m.user_id, 'chat:typing', {
            conversationId,
            userId: currentUserId,
            isTyping: !!isTyping
          });
        }
      }
      break;
    }

    // ---------------- WEBRTC SIGNALING ----------------
    case 'call:invite': {
      const { receiverId, callType, callId } = data || {};
      if (!receiverId) return;

      // Check if blocked
      const isBlocked = db.blocked_users.some(
        b => (b.user_id === receiverId && b.blocked_user_id === currentUserId) ||
             (b.user_id === currentUserId && b.blocked_user_id === receiverId)
      );

      if (isBlocked) {
        send(ws, 'call:error', { message: 'Cannot place call to this user.' });
        return;
      }

      const callerProfile = db.user_profiles.find(p => p.user_id === currentUserId);

      // Notify receiver
      sendToUser(receiverId, 'call:incoming', {
        callId,
        callerId: currentUserId,
        caller: callerProfile,
        callType: callType || 'VOICE',
        timestamp: new Date().toISOString()
      });
      break;
    }

    case 'call:accept': {
      const { callerId, callId } = data || {};
      if (callerId) {
        sendToUser(callerId, 'call:accepted', { callId, receiverId: currentUserId });
      }
      break;
    }

    case 'call:reject': {
      const { callerId, callId, reason } = data || {};
      if (callerId) {
        sendToUser(callerId, 'call:rejected', { callId, receiverId: currentUserId, reason: reason || 'declined' });
      }
      break;
    }

    case 'call:end': {
      const { otherUserId, callId, duration } = data || {};
      if (otherUserId) {
        sendToUser(otherUserId, 'call:ended', { callId, endedBy: currentUserId, duration });
      }
      break;
    }

    case 'call:offer': {
      const { receiverId, sdp, callId } = data || {};
      if (receiverId && sdp) {
        sendToUser(receiverId, 'call:offer', { callId, callerId: currentUserId, sdp });
      }
      break;
    }

    case 'call:answer': {
      const { callerId, sdp, callId } = data || {};
      if (callerId && sdp) {
        sendToUser(callerId, 'call:answer', { callId, receiverId: currentUserId, sdp });
      }
      break;
    }

    case 'call:ice_candidate': {
      const { targetUserId, candidate, callId } = data || {};
      if (targetUserId && candidate) {
        sendToUser(targetUserId, 'call:ice_candidate', { callId, fromUserId: currentUserId, candidate });
      }
      break;
    }

    default:
      break;
  }
}

function send(ws: WebSocket, event: string, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, data }));
  }
}

export function sendToUser(userId: number, event: string, data: any) {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return false;

  let delivered = false;
  sockets.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data }));
      delivered = true;
    }
  });
  return delivered;
}

export function sendToUsers(userIds: number[], event: string, data: any) {
  for (const uid of userIds) {
    sendToUser(uid, event, data);
  }
}

export function broadcast(event: string, data: any, excludeUserId?: number) {
  if (!wss) return;
  wss.clients.forEach(client => {
    const authSocket = client as AuthenticatedSocket;
    if (authSocket.readyState === WebSocket.OPEN) {
      if (excludeUserId && authSocket.userId === excludeUserId) return;
      authSocket.send(JSON.stringify({ event, data }));
    }
  });
}

export function isUserOnline(userId: number): boolean {
  const sockets = userSockets.get(userId);
  return !!sockets && sockets.size > 0;
}

export function getOnlineUserIds(): number[] {
  return Array.from(userSockets.keys());
}
