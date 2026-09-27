import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDB } from '../db/index.ts';
import { decryptSecret } from './crypto.ts';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface UploadResult {
  url: string;
  storageType: 'LOCAL' | 'R2';
  key: string;
  fileSize: number;
  mimeType: string;
}

export function getR2Client(): S3Client | null {
  try {
    const db = getDB();
    const config = db.r2_settings || {};

    const accountId = (config.account_id || '').trim();
    const accessKeyId = (config.access_key_id || '').trim();
    const rawSecret = config.secret_access_key || '';
    const secretAccessKey = decryptSecret(rawSecret).trim();
    const endpoint = (config.endpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')).trim();

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      return null;
    }

    return new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  } catch (err) {
    console.error('[R2] Error initializing S3Client:', err);
    return null;
  }
}

export async function testR2Connection(params?: {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  endpoint?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const db = getDB();
    const config = db.r2_settings || {};

    const accountId = (params?.accountId ?? config.account_id ?? '').trim();
    const accessKeyId = (params?.accessKeyId ?? config.access_key_id ?? '').trim();

    let secretAccessKey = params?.secretAccessKey;
    if (!secretAccessKey || secretAccessKey.startsWith('•••')) {
      secretAccessKey = decryptSecret(config.secret_access_key || '').trim();
    } else {
      secretAccessKey = secretAccessKey.trim();
    }

    const bucketName = (params?.bucketName ?? config.bucket_name ?? 'devsphere-media').trim();
    const endpoint = (params?.endpoint ?? config.endpoint ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')).trim();

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      return {
        success: false,
        message: 'Missing Cloudflare R2 credentials (Access Key ID, Secret Access Key, or Endpoint/Account ID).'
      };
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    // Test bucket existence with HeadBucketCommand
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    return {
      success: true,
      message: `Successfully connected to Cloudflare R2 bucket "${bucketName}".`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Cloudflare R2 connection test failed: ${err.message || 'Check credentials and bucket permissions'}`
    };
  }
}

export async function uploadMediaFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  folder: string = 'media'
): Promise<UploadResult> {
  const db = getDB();
  const r2Settings = db.r2_settings || {};
  const isR2Active = r2Settings.is_active === 1;

  const ext = path.extname(originalFilename) || (mimeType.startsWith('video/') ? '.mp4' : '.jpg');
  const safeFilename = `${crypto.randomUUID()}${ext}`;
  const key = `${folder}/${safeFilename}`;

  // If Cloudflare R2 is configured and enabled in Admin Panel, upload to R2
  if (isR2Active) {
    const s3 = getR2Client();
    const bucketName = r2Settings.bucket_name || 'devsphere-media';

    if (s3) {
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: mimeType
          })
        );

        let publicUrl = '';
        if (r2Settings.public_url) {
          const baseUrl = r2Settings.public_url.replace(/\/$/, '');
          publicUrl = `${baseUrl}/${key}`;
        } else {
          publicUrl = `https://${bucketName}.r2.dev/${key}`;
        }

        return {
          url: publicUrl,
          storageType: 'R2',
          key,
          fileSize: buffer.length,
          mimeType
        };
      } catch (err) {
        console.warn('[R2] Upload to Cloudflare R2 failed, falling back to local resilient storage:', err);
      }
    }
  }

  // Local resilient storage fallback (ensures Preview starts and media uploads always work without R2 configured)
  const subFolder = path.join(UPLOADS_DIR, folder);
  if (!fs.existsSync(subFolder)) {
    fs.mkdirSync(subFolder, { recursive: true });
  }

  const filePath = path.join(subFolder, safeFilename);
  fs.writeFileSync(filePath, buffer);

  const localUrl = `/uploads/${folder}/${safeFilename}`;
  return {
    url: localUrl,
    storageType: 'LOCAL',
    key,
    fileSize: buffer.length,
    mimeType
  };
}
