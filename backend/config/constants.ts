// DevSphere Security & Token Configuration
// Safe development fallback is provided for preview environments.
// In production, configure JWT_SECRET via environment variables.

export const JWT_SECRET = process.env.JWT_SECRET || 'devsphere_jwt_dev_preview_secret_2026_secure_fallback';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
