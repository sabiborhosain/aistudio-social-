import crypto from 'crypto';
import { JWT_SECRET } from '../config/constants.ts';

// Derive a 32-byte encryption key for AES-256-GCM from JWT_SECRET
const ENCRYPTION_SALT = 'devsphere_secure_system_settings_salt_2026';
const encryptionKey = crypto.scryptSync(JWT_SECRET || 'devsphere_fallback_salt_key_secure', ENCRYPTION_SALT, 32);

/**
 * Encrypt sensitive plain text using AES-256-GCM authenticated encryption.
 * Format: enc:gcm:<iv_hex>:<authTag_hex>:<encrypted_hex>
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  // Avoid re-encrypting already encrypted values
  if (plainText.startsWith('enc:gcm:')) {
    return plainText;
  }
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `enc:gcm:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('[Crypto] Encryption error:', err);
    return plainText;
  }
}

/**
 * Decrypt an AES-256-GCM encrypted secret.
 * Falls back to plain text if not encrypted or in legacy format.
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText) return '';
  if (!cipherText.startsWith('enc:gcm:')) {
    return cipherText;
  }
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 5) return cipherText;
    const [, , ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn('[Crypto] Decryption failed, returning plain/empty:', err);
    return '';
  }
}

/**
 * Mask sensitive credentials for safe API responses (never send real secret to frontend).
 */
export function maskSecret(secret: string, visibleSuffixLen: number = 4): string {
  if (!secret) return '';
  const decrypted = decryptSecret(secret);
  if (!decrypted) return '';
  if (decrypted.length <= visibleSuffixLen) {
    return '••••••••';
  }
  return '••••••••••••••••' + decrypted.slice(-visibleSuffixLen);
}
