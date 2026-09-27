import { Request, Response } from 'express';
import { getDB, saveMemoryDB } from '../db/index.ts';

// Get available active audio tracks for a video (Public / Viewers)
export async function getVideoAudioTracks(req: Request, res: Response): Promise<void> {
  try {
    const videoId = parseInt(req.params.videoId);
    if (isNaN(videoId)) {
      res.status(400).json({ success: false, message: 'Invalid video ID' });
      return;
    }

    const db = getDB();
    const tracks = (db.video_audio_tracks || [])
      .filter(t => t.video_id === videoId && t.is_active === 1)
      .sort((a, b) => b.is_default - a.is_default);

    res.json({ success: true, data: tracks });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get all audio tracks for video including inactive (Admin only)
export async function getAdminVideoAudioTracks(req: Request, res: Response): Promise<void> {
  try {
    const videoId = parseInt(req.params.videoId);
    if (isNaN(videoId)) {
      res.status(400).json({ success: false, message: 'Invalid video ID' });
      return;
    }

    const db = getDB();
    const tracks = (db.video_audio_tracks || [])
      .filter(t => t.video_id === videoId)
      .sort((a, b) => b.id - a.id);

    res.json({ success: true, data: tracks });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Create / Upload Audio Track (Admin / SuperAdmin ONLY)
export async function createVideoAudioTrack(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const currentUserRole = req.user?.role;
    const videoId = parseInt(req.params.videoId);

    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, message: 'Permission denied: Audio track management requires Admin privileges' });
      return;
    }

    const { language_name, language_code, title, audio_url, is_default = 0, is_active = 1 } = req.body;

    if (!language_name || !language_code || !audio_url) {
      res.status(400).json({ success: false, message: 'Language name, code, and audio URL are required' });
      return;
    }

    const db = getDB();
    if (!db.video_audio_tracks) {
      db.video_audio_tracks = [];
    }

    const nextId = db.video_audio_tracks.length ? Math.max(...db.video_audio_tracks.map(t => t.id)) + 1 : 1;
    const now = new Date().toISOString();

    // If marked as default, clear default on other tracks for this video
    if (Number(is_default) === 1) {
      db.video_audio_tracks.forEach(t => {
        if (t.video_id === videoId) t.is_default = 0;
      });
    }

    const newTrack = {
      id: nextId,
      video_id: videoId,
      language_name: language_name.trim(),
      language_code: language_code.trim().toLowerCase(),
      title: title ? title.trim() : `${language_name} Audio Track`,
      storage_key: `audio_tracks/video_${videoId}_${language_code}.mp3`,
      audio_url,
      is_default: Number(is_default) === 1 ? 1 : 0,
      is_active: Number(is_active) === 1 ? 1 : 0,
      created_by: currentUserId || 1,
      created_at: now,
      updated_at: now
    };

    db.video_audio_tracks.push(newTrack);
    saveMemoryDB();

    res.json({ success: true, message: 'Audio track added successfully', data: newTrack });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Update Audio Track (Admin / SuperAdmin ONLY)
export async function updateVideoAudioTrack(req: Request, res: Response): Promise<void> {
  try {
    const currentUserRole = req.user?.role;
    const trackId = parseInt(req.params.trackId);

    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, message: 'Permission denied: Admin privileges required' });
      return;
    }

    const { language_name, language_code, title, audio_url, is_default, is_active } = req.body;
    const db = getDB();
    const track = (db.video_audio_tracks || []).find(t => t.id === trackId);

    if (!track) {
      res.status(404).json({ success: false, message: 'Audio track not found' });
      return;
    }

    if (language_name !== undefined) track.language_name = language_name;
    if (language_code !== undefined) track.language_code = language_code.toLowerCase();
    if (title !== undefined) track.title = title;
    if (audio_url !== undefined) track.audio_url = audio_url;
    if (is_active !== undefined) track.is_active = Number(is_active) === 1 ? 1 : 0;

    if (is_default !== undefined && Number(is_default) === 1) {
      db.video_audio_tracks.forEach(t => {
        if (t.video_id === track.video_id) t.is_default = 0;
      });
      track.is_default = 1;
    } else if (is_default !== undefined) {
      track.is_default = 0;
    }

    track.updated_at = new Date().toISOString();
    saveMemoryDB();

    res.json({ success: true, message: 'Audio track updated successfully', data: track });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Delete Audio Track (Admin / SuperAdmin ONLY)
export async function deleteVideoAudioTrack(req: Request, res: Response): Promise<void> {
  try {
    const currentUserRole = req.user?.role;
    const trackId = parseInt(req.params.trackId);

    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, message: 'Permission denied: Admin privileges required' });
      return;
    }

    const db = getDB();
    const initialLen = db.video_audio_tracks?.length || 0;
    db.video_audio_tracks = (db.video_audio_tracks || []).filter(t => t.id !== trackId);

    if (db.video_audio_tracks.length !== initialLen) {
      saveMemoryDB();
    }

    res.json({ success: true, message: 'Audio track deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
