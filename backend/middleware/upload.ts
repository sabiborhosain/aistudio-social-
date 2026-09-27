import multer from 'multer';

// Use memory storage so we can stream to R2 or write to local storage smoothly
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB max for video reels
  },
  fileFilter: (_req, file, cb) => {
    // Whitelist image and video formats
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only images and videos are permitted.'));
    }
  }
});
