import { Request, Response } from 'express';
import { uploadMediaFile } from '../services/r2.ts';

export async function uploadMedia(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file was uploaded.' });
      return;
    }

    const folder = req.body.folder || (req.file.mimetype.startsWith('video/') ? 'videos' : 'images');

    const result = await uploadMediaFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    );

    res.json({
      success: true,
      message: 'Media uploaded successfully.',
      data: result
    });
  } catch (err: any) {
    console.error('[Media] Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}
