import { Request, Response } from 'express';
import {
  getDB,
  saveMemoryDB,
  isMySQL,
  persistR2SettingsToMySQL,
  persistSmtpSettingsToMySQL,
  persistSystemSettingsToMySQL
} from '../db/index.ts';
import { testR2Connection } from '../services/r2.ts';
import { sendEmail } from '../services/email.ts';
import { encryptSecret, decryptSecret, maskSecret } from '../services/crypto.ts';

export async function getAdminStats(req: Request, res: Response): Promise<void> {
  try {
    const db = getDB();

    const totalUsers = db.users.length;
    const activeUsers = db.users.filter(u => u.status === 'ACTIVE').length;
    const suspendedUsers = db.users.filter(u => u.status === 'SUSPENDED').length;
    const bannedUsers = db.users.filter(u => u.status === 'BANNED').length;

    const totalPosts = db.posts.filter(p => !p.is_deleted).length;
    const codePosts = db.posts.filter(p => !p.is_deleted && (p.post_type === 'CODE' || p.post_type === 'MIXED')).length;
    const totalComments = db.comments.filter(c => !c.is_deleted).length;
    const totalReels = db.videos.filter(v => v.is_short === 1 && !v.is_deleted).length;
    const totalPages = db.pages.length;
    const pendingReports = db.reports.filter(r => r.status === 'PENDING').length;

    const isR2Configured = Boolean(
      db.r2_settings.account_id &&
      db.r2_settings.access_key_id &&
      db.r2_settings.secret_access_key
    );

    const isSmtpConfigured = Boolean(
      db.smtp_settings.host &&
      db.smtp_settings.username &&
      db.smtp_settings.password
    );

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        banned: bannedUsers
      },
      content: {
        totalPosts,
        codePosts,
        totalComments,
        totalReels,
        totalPages
      },
      moderation: {
        pendingReports
      },
      storage: {
        r2Active: db.r2_settings.is_active === 1,
        isConfigured: isR2Configured,
        bucket: db.r2_settings.bucket_name
      },
      smtp: {
        isActive: db.smtp_settings.is_active === 1,
        isConfigured: isSmtpConfigured,
        host: db.smtp_settings.host
      },
      database: {
        engine: isMySQL() ? 'MySQL 8.0' : 'Local JSON Resilient Fallback',
        isMySQL: isMySQL()
      }
    };

    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAdminUsers(req: Request, res: Response): Promise<void> {
  try {
    const search = (req.query.q as string)?.toLowerCase().trim();
    const status = req.query.status as string;
    const role = req.query.role as string;

    const db = getDB();

    let list = db.users.map(u => {
      const profile = db.user_profiles.find(p => p.user_id === u.id);
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        isEmailVerified: Boolean(u.is_email_verified),
        mustChangePassword: Boolean(u.must_change_password),
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
        profile
      };
    });

    if (status && status !== 'ALL') {
      list = list.filter(u => u.status === status);
    }

    if (role && role !== 'ALL') {
      list = list.filter(u => u.role === role);
    }

    if (search) {
      list = list.filter(
        u =>
          u.email.toLowerCase().includes(search) ||
          (u.profile && (u.profile.username.toLowerCase().includes(search) || u.profile.full_name.toLowerCase().includes(search)))
      );
    }

    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.userId;
    const targetUserId = parseInt(req.params.id);
    const { status, reason } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status value.' });
      return;
    }

    const db = getDB();
    const user = db.users.find(u => u.id === targetUserId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    // Prevent banning the primary super admin
    if (user.id === 1 && status !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Primary super administrator account cannot be banned.' });
      return;
    }

    const oldStatus = user.status;
    user.status = status;
    user.updated_at = new Date().toISOString();

    // Log admin action
    db.admin_logs.push({
      id: db.admin_logs.length + 1,
      admin_id: adminId,
      action: `USER_STATUS_CHANGE_${status}`,
      target_type: 'USER',
      target_id: targetUserId,
      ip_address: req.ip || '127.0.0.1',
      details: `Status changed from ${oldStatus} to ${status}. Reason: ${reason || 'Admin action'}`,
      created_at: new Date().toISOString()
    });

    saveMemoryDB();

    res.json({
      success: true,
      message: `User status changed to ${status}.`,
      data: { userId: targetUserId, status }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAdminReports(req: Request, res: Response): Promise<void> {
  try {
    const db = getDB();
    const reports = db.reports
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(r => {
        const reporter = db.user_profiles.find(p => p.user_id === r.reporter_id);

        let entityPreview: any = null;
        if (r.reported_type === 'POST') {
          entityPreview = db.posts.find(p => p.id === r.reported_id);
        } else if (r.reported_type === 'COMMENT') {
          entityPreview = db.comments.find(c => c.id === r.reported_id);
        } else if (r.reported_type === 'VIDEO') {
          entityPreview = db.videos.find(v => v.id === r.reported_id);
        } else if (r.reported_type === 'USER') {
          entityPreview = db.user_profiles.find(u => u.user_id === r.reported_id);
        } else if (r.reported_type === 'PAGE') {
          entityPreview = db.pages.find(p => p.id === r.reported_id);
        }

        return {
          ...r,
          reporter,
          entityPreview
        };
      });

    res.json({ success: true, data: reports });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function resolveAdminReport(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.userId;
    const reportId = parseInt(req.params.id);
    const { status = 'RESOLVED', action = 'NONE', notes } = req.body;

    const db = getDB();
    const report = db.reports.find(r => r.id === reportId);
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found.' });
      return;
    }

    report.status = status;
    (report as any).moderator_id = adminId;
    report.moderator_notes = notes || null;
    report.updated_at = new Date().toISOString();

    // If moderator chooses to delete content
    if (action === 'DELETE_CONTENT') {
      if (report.reported_type === 'POST') {
        const post = db.posts.find(p => p.id === report.reported_id);
        if (post) post.is_deleted = 1;
      } else if (report.reported_type === 'COMMENT') {
        const comment = db.comments.find(c => c.id === report.reported_id);
        if (comment) comment.is_deleted = 1;
      } else if (report.reported_type === 'VIDEO') {
        const video = db.videos.find(v => v.id === report.reported_id);
        if (video) video.is_deleted = 1;
      }
    }

    db.admin_logs.push({
      id: db.admin_logs.length + 1,
      admin_id: adminId,
      action: `REPORT_${status}`,
      target_type: report.reported_type,
      target_id: report.reported_id,
      ip_address: req.ip || '127.0.0.1',
      details: `Report #${reportId} resolved with action ${action}. Notes: ${notes || ''}`,
      created_at: new Date().toISOString()
    });

    saveMemoryDB();

    res.json({ success: true, message: `Report updated to ${status}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAdminLogs(req: Request, res: Response): Promise<void> {
  try {
    const db = getDB();
    const logs = db.admin_logs
      .slice(-100)
      .reverse()
      .map(log => {
        const admin = db.user_profiles.find(p => p.user_id === log.admin_id);
        return {
          ...log,
          admin
        };
      });

    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// =========================================================================
// CLOUDFLARE R2 STORAGE SETTINGS (Stored securely in DB with AES-256 encryption)
// =========================================================================

export async function getR2Config(req: Request, res: Response): Promise<void> {
  try {
    const db = getDB();
    const config = { ...db.r2_settings };

    const isConfigured = Boolean(
      config.account_id &&
      config.access_key_id &&
      config.secret_access_key
    );

    // Never return the real plaintext secret to frontend
    const maskedSecret = maskSecret(config.secret_access_key);

    res.json({
      success: true,
      data: {
        account_id: config.account_id || '',
        access_key_id: config.access_key_id || '',
        secret_access_key: maskedSecret,
        bucket_name: config.bucket_name || 'devsphere-media',
        endpoint: config.endpoint || '',
        public_url: config.public_url || '',
        is_active: config.is_active === 1,
        is_configured: isConfigured,
        connection_status: isConfigured ? 'Configured' : 'Not Configured'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateR2Config(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.userId;
    const {
      account_id,
      access_key_id,
      secret_access_key,
      bucket_name,
      endpoint,
      public_url,
      is_active,
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      publicUrl,
      isActive
    } = req.body;

    const db = getDB();

    const newAccountId = (account_id ?? accountId);
    if (newAccountId !== undefined) db.r2_settings.account_id = newAccountId.trim();

    const newAccessKeyId = (access_key_id ?? accessKeyId);
    if (newAccessKeyId !== undefined) db.r2_settings.access_key_id = newAccessKeyId.trim();

    // If a new raw secret is entered (not masked placeholder), encrypt it before storing
    const newSecret = (secret_access_key ?? secretAccessKey);
    if (newSecret && typeof newSecret === 'string' && !newSecret.startsWith('•••') && newSecret.trim() !== '') {
      db.r2_settings.secret_access_key = encryptSecret(newSecret.trim());
    }

    const newBucket = (bucket_name ?? bucketName);
    if (newBucket !== undefined) db.r2_settings.bucket_name = newBucket.trim();

    let newEndpoint = endpoint;
    if (newEndpoint !== undefined && newEndpoint.trim() !== '') {
      db.r2_settings.endpoint = newEndpoint.trim();
    } else if (db.r2_settings.account_id && !db.r2_settings.endpoint) {
      db.r2_settings.endpoint = `https://${db.r2_settings.account_id}.r2.cloudflarestorage.com`;
    }

    const newPublicUrl = (public_url ?? publicUrl);
    if (newPublicUrl !== undefined) db.r2_settings.public_url = newPublicUrl.trim();

    const newActive = (is_active !== undefined ? is_active : isActive);
    if (newActive !== undefined) db.r2_settings.is_active = newActive ? 1 : 0;

    // Log admin action
    db.admin_logs.push({
      id: db.admin_logs.length + 1,
      admin_id: adminId,
      action: 'UPDATE_R2_SETTINGS',
      target_type: 'SETTINGS',
      target_id: 1,
      ip_address: req.ip || '127.0.0.1',
      details: `Cloudflare R2 configuration updated and encrypted. Active: ${db.r2_settings.is_active}`,
      created_at: new Date().toISOString()
    });

    saveMemoryDB();
    await persistR2SettingsToMySQL(db.r2_settings);

    const isConfigured = Boolean(
      db.r2_settings.account_id &&
      db.r2_settings.access_key_id &&
      db.r2_settings.secret_access_key
    );

    res.json({
      success: true,
      message: 'Cloudflare R2 settings saved successfully.',
      connection_status: isConfigured ? 'Configured' : 'Not Configured'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function testR2Endpoint(req: Request, res: Response): Promise<void> {
  try {
    const {
      account_id,
      access_key_id,
      secret_access_key,
      bucket_name,
      endpoint,
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName
    } = req.body;

    const result = await testR2Connection({
      accountId: account_id || accountId,
      accessKeyId: access_key_id || accessKeyId,
      secretAccessKey: secret_access_key || secretAccessKey,
      bucketName: bucket_name || bucketName,
      endpoint
    });

    res.json({
      ...result,
      connection_status: result.success ? 'Connection Successful' : 'Connection Failed'
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message,
      connection_status: 'Connection Failed'
    });
  }
}

// =========================================================================
// SMTP EMAIL SETTINGS (Stored securely in DB with AES-256 encryption)
// =========================================================================

export async function getSmtpConfig(req: Request, res: Response): Promise<void> {
  try {
    const db = getDB();
    const config = { ...db.smtp_settings };

    const isConfigured = Boolean(
      config.host &&
      config.username &&
      config.password
    );

    const maskedPassword = maskSecret(config.password);

    res.json({
      success: true,
      data: {
        host: config.host || '',
        port: config.port || 587,
        username: config.username || '',
        password: maskedPassword,
        encryption: config.encryption || 'tls',
        from_email: config.from_email || '',
        from_name: config.from_name || '',
        is_active: config.is_active === 1,
        is_configured: isConfigured,
        connection_status: isConfigured ? 'Configured' : 'Not Configured'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateSmtpConfig(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.userId;
    const {
      host,
      port,
      username,
      password,
      encryption,
      from_email,
      from_name,
      is_active,
      fromEmail,
      fromName,
      isActive,
      user,
      pass
    } = req.body;

    const db = getDB();

    if (host !== undefined) db.smtp_settings.host = host.trim();
    if (port !== undefined) db.smtp_settings.port = Number(port) || 587;

    const newUsername = (username ?? user);
    if (newUsername !== undefined) db.smtp_settings.username = newUsername.trim();

    // If new password entered (not masked placeholder), encrypt it before saving
    const newPass = (password ?? pass);
    if (newPass && typeof newPass === 'string' && !newPass.startsWith('•••') && newPass.trim() !== '') {
      db.smtp_settings.password = encryptSecret(newPass.trim());
    }

    if (encryption !== undefined) db.smtp_settings.encryption = encryption;

    const newFromEmail = (from_email ?? fromEmail);
    if (newFromEmail !== undefined) db.smtp_settings.from_email = newFromEmail.trim();

    const newFromName = (from_name ?? fromName);
    if (newFromName !== undefined) db.smtp_settings.from_name = newFromName.trim();

    const newActive = (is_active !== undefined ? is_active : isActive);
    if (newActive !== undefined) db.smtp_settings.is_active = newActive ? 1 : 0;

    // Log admin action
    db.admin_logs.push({
      id: db.admin_logs.length + 1,
      admin_id: adminId,
      action: 'UPDATE_SMTP_SETTINGS',
      target_type: 'SETTINGS',
      target_id: 1,
      ip_address: req.ip || '127.0.0.1',
      details: 'SMTP email configuration updated and encrypted.',
      created_at: new Date().toISOString()
    });

    saveMemoryDB();
    await persistSmtpSettingsToMySQL(db.smtp_settings);

    const isConfigured = Boolean(
      db.smtp_settings.host &&
      db.smtp_settings.username &&
      db.smtp_settings.password
    );

    res.json({
      success: true,
      message: 'SMTP settings updated successfully.',
      connection_status: isConfigured ? 'Configured' : 'Not Configured'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function testSmtpEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const { testEmail, recipient } = req.body;
    const targetEmail = (testEmail || recipient)?.trim();

    if (!targetEmail) {
      res.status(400).json({
        success: false,
        message: 'Recipient test email address is required.',
        connection_status: 'Connection Failed'
      });
      return;
    }

    const result = await sendEmail({
      to: targetEmail,
      subject: 'DevSphere — SMTP Server Test Verification',
      html: `
        <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 500px;">
          <h2 style="color: #0f172a; margin-top: 0;">SMTP Test Succeeded!</h2>
          <p style="color: #334155;">Your DevSphere outbound mail server is functioning properly.</p>
          <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #64748b;">
            Timestamp: ${new Date().toUTCString()}
          </div>
        </div>
      `
    });

    res.json({
      ...result,
      connection_status: result.success ? 'Connection Successful' : 'Connection Failed'
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message,
      connection_status: 'Connection Failed'
    });
  }
}

// =========================================================================
// GENERAL & SECURITY SETTINGS
// =========================================================================

export async function getGeneralSettings(req: Request, res: Response): Promise<void> {
  try {
    const db = getDB();
    res.json({
      success: true,
      data: db.system_settings || {}
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateGeneralSettings(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.userId;
    const {
      site_name,
      site_tagline,
      site_description,
      allow_registration,
      email_verification_required,
      max_upload_size_mb
    } = req.body;

    const db = getDB();
    if (!db.system_settings) db.system_settings = {} as any;

    if (site_name !== undefined) {
      db.system_settings.site_name = site_name;
      await persistSystemSettingsToMySQL('site_name', site_name);
    }
    if (site_tagline !== undefined) {
      db.system_settings.site_tagline = site_tagline;
      await persistSystemSettingsToMySQL('site_tagline', site_tagline);
    }
    if (site_description !== undefined) {
      db.system_settings.site_description = site_description;
      await persistSystemSettingsToMySQL('site_description', site_description);
    }
    if (allow_registration !== undefined) {
      db.system_settings.allow_registration = String(allow_registration);
      await persistSystemSettingsToMySQL('allow_registration', String(allow_registration));
    }
    if (email_verification_required !== undefined) {
      db.system_settings.email_verification_required = String(email_verification_required);
      await persistSystemSettingsToMySQL('email_verification_required', String(email_verification_required));
    }
    if (max_upload_size_mb !== undefined) {
      db.system_settings.max_upload_size_mb = String(max_upload_size_mb);
      await persistSystemSettingsToMySQL('max_upload_size_mb', String(max_upload_size_mb));
    }

    db.admin_logs.push({
      id: db.admin_logs.length + 1,
      admin_id: adminId,
      action: 'UPDATE_GENERAL_SETTINGS',
      target_type: 'SETTINGS',
      target_id: 1,
      ip_address: req.ip || '127.0.0.1',
      details: 'General platform settings updated.',
      created_at: new Date().toISOString()
    });

    saveMemoryDB();

    res.json({
      success: true,
      message: 'General platform settings updated successfully.',
      data: db.system_settings
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
