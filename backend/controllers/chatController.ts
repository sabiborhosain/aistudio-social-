import { Request, Response } from 'express';
import { getDB, saveMemoryDB, isMySQL, getMySQLPool } from '../db/index.ts';
import { sendToUsers, isUserOnline } from '../services/websocketService.ts';

async function runMySQL(sql: string, params: any[] = []): Promise<any> {
  if (!isMySQL()) return null;
  const pool = getMySQLPool();
  if (!pool) return null;
  try {
    const [res] = await pool.query(sql, params);
    return res;
  } catch (err: any) {
    console.error('[MySQL Error in chatController]:', err.message);
    return null;
  }
}

// Get list of conversations for current user
export async function getConversations(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const db = getDB();

    // Find conversation IDs where user is a member
    const memberships = db.conversation_members.filter(m => m.user_id === currentUserId);
    const convIds = memberships.map(m => m.conversation_id);

    const conversations = db.conversations
      .filter(c => convIds.includes(c.id))
      .map(c => {
        const mems = db.conversation_members.filter(m => m.conversation_id === c.id);
        const myMembership = mems.find(m => m.user_id === currentUserId);

        // For direct chats, find the other user
        let otherUser = null;
        if (c.type === 'DIRECT') {
          const otherMember = mems.find(m => m.user_id !== currentUserId);
          if (otherMember) {
            const profile = db.user_profiles.find(p => p.user_id === otherMember.user_id);
            if (profile) {
              otherUser = {
                ...profile,
                isOnline: isUserOnline(profile.user_id)
              };
            }
          }
        }

        // Get last message
        const convMessages = db.messages
          .filter(m => m.conversation_id === c.id && m.is_deleted === 0)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const lastMessage = convMessages.length ? convMessages[convMessages.length - 1] : null;

        // Calculate unread count
        const lastReadMsgId = myMembership?.last_read_message_id || 0;
        const unreadCount = convMessages.filter(
          m => m.sender_id !== currentUserId && m.id > lastReadMsgId
        ).length;

        return {
          ...c,
          otherUser,
          otherMember: otherUser,
          lastMessage,
          last_message: lastMessage,
          unreadCount,
          unread_count: unreadCount
        };
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    res.json({ success: true, data: conversations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get or create direct conversation with target user
export async function getOrCreateDirectConversation(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const targetUserId = req.params.targetUserId
      ? parseInt(req.params.targetUserId)
      : parseInt(req.body.recipientId || req.body.targetUserId);

    if (!currentUserId || isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: 'Valid user IDs required' });
      return;
    }

    if (currentUserId === targetUserId) {
      res.status(400).json({ success: false, message: 'Cannot start conversation with yourself' });
      return;
    }

    const db = getDB();

    // Check if target user is blocked
    const isBlocked = db.blocked_users.some(
      b => (b.user_id === currentUserId && b.blocked_user_id === targetUserId) ||
           (b.user_id === targetUserId && b.blocked_user_id === currentUserId)
    );
    if (isBlocked) {
      res.status(403).json({ success: false, message: 'Cannot message this user' });
      return;
    }

    // Look for existing DIRECT conversation between both users
    const myConvs = db.conversation_members.filter(m => m.user_id === currentUserId).map(m => m.conversation_id);
    const targetConvs = db.conversation_members.filter(m => m.user_id === targetUserId).map(m => m.conversation_id);

    const sharedConvIds = myConvs.filter(id => targetConvs.includes(id));
    let directConv = db.conversations.find(c => sharedConvIds.includes(c.id) && c.type === 'DIRECT');

    if (!directConv) {
      // Create new conversation
      const nextConvId = db.conversations.length ? Math.max(...db.conversations.map(c => c.id)) + 1 : 1;
      const now = new Date().toISOString();
      directConv = {
        id: nextConvId,
        type: 'DIRECT',
        title: null,
        created_at: now,
        updated_at: now
      };
      db.conversations.push(directConv);

      // Add members
      const nextMemId = db.conversation_members.length ? Math.max(...db.conversation_members.map(m => m.id)) + 1 : 1;
      db.conversation_members.push(
        {
          id: nextMemId,
          conversation_id: nextConvId,
          user_id: currentUserId,
          joined_at: now,
          last_read_message_id: null as any,
          last_read_at: now,
          is_muted: 0
        },
        {
          id: nextMemId + 1,
          conversation_id: nextConvId,
          user_id: targetUserId,
          joined_at: now,
          last_read_message_id: null as any,
          last_read_at: null,
          is_muted: 0
        }
      );

      saveMemoryDB();

      await runMySQL(
        'INSERT INTO conversations (id, type, title, created_at, updated_at) VALUES (?, ?, NULL, NOW(), NOW()) ON DUPLICATE KEY UPDATE updated_at = NOW()',
        [nextConvId, 'DIRECT']
      );
      await runMySQL(
        'INSERT INTO conversation_members (conversation_id, user_id, joined_at, last_read_at, is_muted) VALUES (?, ?, NOW(), NOW(), 0), (?, ?, NOW(), NULL, 0) ON DUPLICATE KEY UPDATE joined_at = joined_at',
        [nextConvId, currentUserId, nextConvId, targetUserId]
      );
    }

    const otherProfile = db.user_profiles.find(p => p.user_id === targetUserId);
    const partner = otherProfile ? { ...otherProfile, isOnline: isUserOnline(targetUserId) } : null;

    res.json({
      success: true,
      data: {
        ...directConv,
        otherUser: partner,
        otherMember: partner
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get messages for a conversation
export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const conversationId = parseInt(req.params.id);

    if (!currentUserId || isNaN(conversationId)) {
      res.status(400).json({ success: false, message: 'Invalid conversation ID' });
      return;
    }

    const db = getDB();

    // Verify membership
    const isMember = db.conversation_members.some(
      m => m.conversation_id === conversationId && m.user_id === currentUserId
    );
    if (!isMember) {
      res.status(403).json({ success: false, message: 'You are not a member of this conversation' });
      return;
    }

    // Get other member's last_read_message_id to compute seen state
    const otherMembers = db.conversation_members.filter(
      m => m.conversation_id === conversationId && m.user_id !== currentUserId
    );
    const highestReadByOther = Math.max(0, ...otherMembers.map(m => m.last_read_message_id || 0));

    // Update current member's read state
    const myMem = db.conversation_members.find(
      m => m.conversation_id === conversationId && m.user_id === currentUserId
    );
    const convMessages = db.messages
      .filter(m => m.conversation_id === conversationId && m.is_deleted === 0)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (convMessages.length > 0 && myMem) {
      const latestMsgId = convMessages[convMessages.length - 1].id;
      if (!myMem.last_read_message_id || myMem.last_read_message_id < latestMsgId) {
        myMem.last_read_message_id = latestMsgId;
        myMem.last_read_at = new Date().toISOString();
        saveMemoryDB();
        await runMySQL(
          'UPDATE conversation_members SET last_read_message_id = ?, last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
          [latestMsgId, conversationId, currentUserId]
        );
      }
    }

    const messages = convMessages.map(m => {
      const sender = db.user_profiles.find(p => p.user_id === m.sender_id);
      const attachments = db.message_attachments.filter(a => a.message_id === m.id);

      let parentMessage = null;
      if (m.parent_id) {
        const parent = db.messages.find(pm => pm.id === m.parent_id);
        if (parent) {
          const parentSender = db.user_profiles.find(p => p.user_id === parent.sender_id);
          parentMessage = {
            ...parent,
            sender: parentSender
          };
        }
      }

      return {
        ...m,
        sender,
        attachments,
        parentMessage,
        isSeen: m.sender_id === currentUserId && m.id <= highestReadByOther
      };
    });

    res.json({ success: true, data: messages });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Send a message
export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const conversationId = parseInt(req.params.id);
    const {
      content,
      textInput,
      message_type,
      messageType,
      code_language,
      codeLanguage,
      code_title,
      codeTitle,
      code_snippet,
      codeSnippet,
      parent_id,
      parentId,
      attachments
    } = req.body;

    if (!currentUserId || isNaN(conversationId)) {
      res.status(400).json({ success: false, message: 'Invalid conversation ID' });
      return;
    }

    const resolvedContent = content || textInput || codeSnippet || code_snippet || '';
    const resolvedType = (messageType || message_type || (codeSnippet || code_snippet ? 'CODE' : 'TEXT')).toUpperCase();
    const resolvedLang = codeLanguage || code_language || null;
    const resolvedTitle = codeTitle || code_title || null;
    const resolvedParent = parent_id || parentId || null;

    if (!resolvedContent && (!attachments || attachments.length === 0)) {
      res.status(400).json({ success: false, message: 'Message content or attachment is required' });
      return;
    }

    const db = getDB();

    // Verify membership
    const members = db.conversation_members.filter(m => m.conversation_id === conversationId);
    const currentMember = members.find(m => m.user_id === currentUserId);
    if (!currentMember) {
      res.status(403).json({ success: false, message: 'You are not a member of this conversation' });
      return;
    }

    // Check if blocked by any member
    for (const m of members) {
      if (m.user_id !== currentUserId) {
        const isBlocked = db.blocked_users.some(
          b => (b.user_id === m.user_id && b.blocked_user_id === currentUserId) ||
               (b.user_id === currentUserId && b.blocked_user_id === m.user_id)
        );
        if (isBlocked) {
          res.status(403).json({ success: false, message: 'You cannot send messages to this conversation' });
          return;
        }
      }
    }

    const nextMsgId = db.messages.length ? Math.max(...db.messages.map(m => m.id)) + 1 : 1;
    const now = new Date().toISOString();

    const newMessage = {
      id: nextMsgId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      message_type: resolvedType as 'TEXT' | 'IMAGE' | 'FILE' | 'CODE',
      content: resolvedContent,
      code_language: resolvedLang,
      code_title: resolvedTitle,
      parent_id: resolvedParent ? parseInt(resolvedParent) : null,
      is_edited: 0,
      is_deleted: 0,
      created_at: now,
      updated_at: now
    };
    db.messages.push(newMessage as any);

    // Save attachments if any
    const createdAttachments: any[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        const nextAttId = db.message_attachments.length ? Math.max(...db.message_attachments.map(a => a.id)) + 1 : 1;
        const newAtt = {
          id: nextAttId,
          message_id: nextMsgId,
          file_name: att.fileName || att.file_name || 'attachment',
          file_url: att.fileUrl || att.file_url || '',
          file_size: att.fileSize || att.file_size || 0,
          mime_type: att.fileType || att.mime_type || 'application/octet-stream',
          storage_type: att.storage_type || (att.fileUrl?.includes('r2.cloudflarestorage.com') ? 'R2' : 'LOCAL'),
          created_at: now
        };
        db.message_attachments.push(newAtt as any);
        createdAttachments.push(newAtt);

        await runMySQL(
          'INSERT INTO message_attachments (id, message_id, file_name, file_url, file_size, file_type, storage_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
          [nextAttId, nextMsgId, newAtt.file_name, newAtt.file_url, newAtt.file_size, newAtt.mime_type, '']
        );
      }
    }

    // Update conversation updated_at
    const conv = db.conversations.find(c => c.id === conversationId);
    if (conv) {
      conv.updated_at = now;
    }

    // Mark current user's read state to this new message
    currentMember.last_read_message_id = nextMsgId;
    currentMember.last_read_at = now;

    saveMemoryDB();

    // MySQL write
    await runMySQL(
      'INSERT INTO messages (id, conversation_id, sender_id, message_type, content, code_language, code_title, parent_id, is_edited, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(), NOW())',
      [nextMsgId, conversationId, currentUserId, resolvedType, resolvedContent, resolvedLang, resolvedTitle, resolvedParent ? parseInt(resolvedParent) : null]
    );
    await runMySQL('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);
    await runMySQL(
      'UPDATE conversation_members SET last_read_message_id = ?, last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
      [nextMsgId, conversationId, currentUserId]
    );

    const senderProfile = db.user_profiles.find(p => p.user_id === currentUserId);

    let parentMsgPreview = null;
    if (newMessage.parent_id) {
      const pm = db.messages.find(m => m.id === newMessage.parent_id);
      if (pm) {
        const ps = db.user_profiles.find(p => p.user_id === pm.sender_id);
        parentMsgPreview = { ...pm, sender: ps };
      }
    }

    const fullMessage = {
      ...newMessage,
      sender: senderProfile,
      attachments: createdAttachments,
      parentMessage: parentMsgPreview,
      isSeen: false
    };

    // Broadcast realtime event to conversation members
    const recipientUserIds = members.filter(m => m.user_id !== currentUserId).map(m => m.user_id);
    sendToUsers(recipientUserIds, 'chat:message_received', {
      conversationId,
      message: fullMessage
    });

    res.json({ success: true, data: fullMessage });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Edit a message
export async function editMessage(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const messageId = parseInt(req.params.id);
    const { content, code_language, code_title } = req.body;

    if (!currentUserId || isNaN(messageId)) {
      res.status(400).json({ success: false, message: 'Invalid message ID' });
      return;
    }

    const db = getDB();
    const msg = db.messages.find(m => m.id === messageId);

    if (!msg || msg.sender_id !== currentUserId) {
      res.status(404).json({ success: false, message: 'Message not found or unauthorized' });
      return;
    }

    if (content) msg.content = content;
    if (code_language !== undefined) msg.code_language = code_language;
    if (code_title !== undefined) msg.code_title = code_title;
    msg.is_edited = 1;
    msg.updated_at = new Date().toISOString();

    saveMemoryDB();

    await runMySQL(
      'UPDATE messages SET content = ?, code_language = ?, code_title = ?, is_edited = 1, updated_at = NOW() WHERE id = ?',
      [msg.content, msg.code_language, msg.code_title, messageId]
    );

    res.json({ success: true, data: msg });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Delete a message (soft delete)
export async function deleteMessage(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const messageId = parseInt(req.params.id);

    if (!currentUserId || isNaN(messageId)) {
      res.status(400).json({ success: false, message: 'Invalid message ID' });
      return;
    }

    const db = getDB();
    const msg = db.messages.find(m => m.id === messageId);

    if (!msg || msg.sender_id !== currentUserId) {
      res.status(404).json({ success: false, message: 'Message not found or unauthorized' });
      return;
    }

    msg.is_deleted = 1;
    msg.updated_at = new Date().toISOString();

    saveMemoryDB();

    await runMySQL('UPDATE messages SET is_deleted = 1, updated_at = NOW() WHERE id = ?', [messageId]);

    res.json({ success: true, message: 'Message deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Mark conversation as read
export async function markConversationAsRead(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const conversationId = parseInt(req.params.id);

    if (!currentUserId || isNaN(conversationId)) {
      res.status(400).json({ success: false, message: 'Invalid conversation ID' });
      return;
    }

    const db = getDB();
    const mem = db.conversation_members.find(
      m => m.conversation_id === conversationId && m.user_id === currentUserId
    );

    if (!mem) {
      res.status(404).json({ success: false, message: 'Not a member of this conversation' });
      return;
    }

    const convMessages = db.messages.filter(m => m.conversation_id === conversationId && m.is_deleted === 0);
    const latestMsgId = convMessages.length ? Math.max(...convMessages.map(m => m.id)) : 0;

    mem.last_read_message_id = latestMsgId;
    mem.last_read_at = new Date().toISOString();

    saveMemoryDB();

    await runMySQL(
      'UPDATE conversation_members SET last_read_message_id = ?, last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
      [latestMsgId, conversationId, currentUserId]
    );

    res.json({ success: true, message: 'Conversation marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
