import { Request, Response } from 'express';
import { getDB, saveMemoryDB } from '../db/index.ts';

export async function createReport(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { reportedType, reportedId, reason, details } = req.body;
    if (!reportedType || !reportedId || !reason) {
      res.status(400).json({ success: false, message: 'Reported entity and reason are required.' });
      return;
    }

    const db = getDB();
    const newId = db.reports.length ? Math.max(...db.reports.map(r => r.id)) + 1 : 1;

    const newReport = {
      id: newId,
      reporter_id: userId,
      reported_type: reportedType,
      reported_id: Number(reportedId),
      reason,
      details: details || null,
      status: 'PENDING' as const,
      moderator_id: null,
      moderator_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.reports.push(newReport);
    saveMemoryDB();

    res.status(201).json({
      success: true,
      message: 'Report submitted. Our moderation team will review this shortly.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const db = getDB() as any;
    if (!db.notifications) {
      db.notifications = [];
    }

    const notifs = (db.notifications as any[])
      .filter((n: any) => n.user_id === userId)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((n: any) => {
        const actor = db.user_profiles.find((p: any) => p.user_id === n.actor_id);
        return {
          ...n,
          actor
        };
      });

    const unreadCount = notifs.filter((n: any) => !n.is_read).length;

    res.json({
      success: true,
      data: {
        notifications: notifs,
        unreadCount
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function markNotificationAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const notifId = parseInt(req.params.id);

    const db = getDB() as any;
    if (!db.notifications) db.notifications = [];

    const notif = (db.notifications as any[]).find((n: any) => n.id === notifId && n.user_id === userId);
    if (notif) {
      notif.is_read = 1;
      saveMemoryDB();
    }

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
