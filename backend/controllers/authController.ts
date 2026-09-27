import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB, saveMemoryDB } from '../db/index.ts';
import { createPasswordResetOTP, createEmailVerificationOTP } from '../services/email.ts';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/constants.ts';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, username, fullName } = req.body;

    if (!email || !password || !username || !fullName) {
      res.status(400).json({
        success: false,
        message: 'All fields (email, password, username, fullName) are required.',
        code: 'MISSING_FIELDS'
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
        code: 'WEAK_PASSWORD'
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');

    const db = getDB();

    // Check if email exists
    if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
        code: 'EMAIL_EXISTS'
      });
      return;
    }

    // Check if username exists
    if (db.user_profiles.some(p => p.username.toLowerCase() === cleanUsername)) {
      res.status(409).json({
        success: false,
        message: 'This username is already taken.',
        code: 'USERNAME_EXISTS'
      });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUserId = db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1;

    const newUser = {
      id: newUserId,
      email: cleanEmail,
      password_hash,
      role: 'USER' as const,
      status: 'ACTIVE' as const,
      is_email_verified: 0,
      must_change_password: 0,
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    (db.users as any[]).push(newUser);

    const newProfile = {
      id: db.user_profiles.length ? Math.max(...db.user_profiles.map(p => p.id)) + 1 : 1,
      user_id: newUserId,
      username: cleanUsername,
      full_name: fullName.trim(),
      avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}`,
      cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      bio: '',
      location: '',
      website: '',
      work: '',
      education: '',
      gender: '',
      followers_count: 0,
      following_count: 0,
      friends_count: 0,
      posts_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.user_profiles.push(newProfile);

    // Initial settings
    db.user_settings.push({
      id: db.user_settings.length + 1,
      user_id: newUserId,
      theme: 'light',
      email_notifications: 1,
      sound_enabled: 1,
      code_theme: 'vivid-dark'
    });

    db.privacy_settings.push({
      id: db.privacy_settings.length + 1,
      user_id: newUserId,
      who_can_see_posts: 'PUBLIC',
      who_can_send_requests: 'EVERYONE',
      who_can_see_friends: 'PUBLIC'
    });

    // Generate token
    const token = jwt.sign(
      { userId: newUserId, email: cleanEmail, role: newUser.role },
      JWT_SECRET as string,
      { expiresIn: JWT_EXPIRES_IN } as any
    );

    // Session record
    db.sessions.push({
      id: db.sessions.length + 1,
      user_id: newUserId,
      token,
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'Web Client',
      device_type: 'Web',
      is_active: 1,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    saveMemoryDB();

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          isEmailVerified: false,
          mustChangePassword: false,
          profile: newProfile
        }
      }
    });
  } catch (err: any) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration.',
      code: 'SERVER_ERROR'
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
        code: 'MISSING_CREDENTIALS'
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getDB();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // Log failed attempt
      db.login_logs.push({
        id: db.login_logs.length + 1,
        user_id: null as any,
        email: cleanEmail,
        ip_address: req.ip || '127.0.0.1',
        user_agent: (req.headers['user-agent'] as string) || '',
        status: 'FAILED',
        created_at: new Date().toISOString()
      });
      saveMemoryDB();

      res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      db.login_logs.push({
        id: db.login_logs.length + 1,
        user_id: user.id,
        email: cleanEmail,
        ip_address: req.ip || '127.0.0.1',
        user_agent: (req.headers['user-agent'] as string) || '',
        status: 'FAILED',
        created_at: new Date().toISOString()
      });
      saveMemoryDB();

      res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        message: `Your account has been ${user.status.toLowerCase()}. Please contact administrator.`,
        code: 'ACCOUNT_LOCKED'
      });
      return;
    }

    (user as any).last_login_at = new Date().toISOString();

    const profile = db.user_profiles.find(p => p.user_id === user.id);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET as string,
      { expiresIn: JWT_EXPIRES_IN } as any
    );

    // Save session
    db.sessions.push({
      id: db.sessions.length + 1,
      user_id: user.id,
      token,
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'Browser Client',
      device_type: 'Desktop',
      is_active: 1,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    db.login_logs.push({
      id: db.login_logs.length + 1,
      user_id: user.id,
      email: cleanEmail,
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || '',
      status: 'SUCCESS',
      created_at: new Date().toISOString()
    });

    saveMemoryDB();

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          isEmailVerified: Boolean(user.is_email_verified),
          mustChangePassword: Boolean(user.must_change_password),
          profile
        }
      }
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login.',
      code: 'SERVER_ERROR'
    });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const db = getDB();
    const user = db.users.find(u => u.id === userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.', code: 'NOT_FOUND' });
      return;
    }

    const profile = db.user_profiles.find(p => p.user_id === user.id);
    const settings = db.user_settings.find(s => s.user_id === user.id);
    const privacy = db.privacy_settings.find(p => p.user_id === user.id);

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        isEmailVerified: Boolean(user.is_email_verified),
        mustChangePassword: Boolean(user.must_change_password),
        profile,
        settings,
        privacy
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, code: 'SERVER_ERROR' });
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
        code: 'MISSING_FIELDS'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
        code: 'WEAK_PASSWORD'
      });
      return;
    }

    const db = getDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
        code: 'INVALID_PASSWORD'
      });
      return;
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.must_change_password = 0;
    user.updated_at = new Date().toISOString();
    saveMemoryDB();

    res.json({
      success: true,
      message: 'Password successfully updated.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, code: 'SERVER_ERROR' });
  }
}

export async function requestForgotPasswordOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getDB();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (user) {
      const otp = await createPasswordResetOTP(cleanEmail);
      res.json({
        success: true,
        message: 'OTP has been dispatched to your email address.',
        data: {
          // In development sandbox, include OTP in response for zero-friction testing
          devPreviewOtp: otp
        }
      });
    } else {
      // Don't reveal user existence
      res.json({
        success: true,
        message: 'If the account exists, an OTP has been dispatched.'
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function resetPasswordWithOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      res.status(400).json({ success: false, message: 'Email, OTP code, and new password are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getDB();
    const record = db.password_reset_otps
      .filter(o => o.email === cleanEmail && !o.is_used)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!record) {
      res.status(400).json({ success: false, message: 'No active OTP request found for this email.', code: 'NO_OTP' });
      return;
    }

    if (new Date() > new Date(record.expires_at)) {
      res.status(400).json({ success: false, message: 'OTP code has expired. Please request a new one.', code: 'EXPIRED_OTP' });
      return;
    }

    if (record.otp_code !== otp.trim()) {
      record.attempts += 1;
      saveMemoryDB();
      res.status(400).json({ success: false, message: 'Invalid OTP code. Please double check.', code: 'INVALID_OTP' });
      return;
    }

    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.must_change_password = 0;
    record.is_used = 1;
    saveMemoryDB();

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new credentials.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function requestEmailOtp(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const db = getDB();
    const user = db.users.find(u => u.id === userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const otp = await createEmailVerificationOTP(user.id, user.email);
    res.json({
      success: true,
      message: 'Verification OTP sent to your email.',
      data: { devPreviewOtp: otp }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function verifyEmailOtp(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { otp } = req.body;

    const db = getDB();
    const record = db.email_verifications
      .filter(v => v.user_id === userId && !v.is_used)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!record || record.otp_code !== otp?.trim()) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });
      return;
    }

    const user = db.users.find(u => u.id === userId);
    if (user) {
      user.is_email_verified = 1;
      record.is_used = 1;
      saveMemoryDB();
    }

    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const db = getDB();
      const session = db.sessions.find(s => s.token === token);
      if (session) {
        session.is_active = 0;
        saveMemoryDB();
      }
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSessions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const db = getDB();
    const userSessions = db.sessions
      .filter(s => s.user_id === userId)
      .map(s => ({
        id: s.id,
        ipAddress: s.ip_address,
        deviceType: s.device_type,
        isActive: Boolean(s.is_active),
        lastActiveAt: s.last_active_at,
        createdAt: s.created_at
      }));

    res.json({ success: true, data: userSessions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
