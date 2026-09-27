import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDB } from '../db/index.ts';
import { UserRole } from '../types/index.ts';
import { JWT_SECRET } from '../config/constants.ts';

export interface AuthUserPayload {
  userId: number;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication token required.',
      code: 'UNAUTHORIZED'
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    const db = getDB();
    const user = db.users.find(u => u.id === decoded.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User no longer exists.',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        message: `Your account has been ${user.status.toLowerCase()}. Please contact support.`,
        code: 'ACCOUNT_RESTRICTED'
      });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole
    };
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired session token.',
      code: 'INVALID_TOKEN'
    });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
      const db = getDB();
      const user = db.users.find(u => u.id === decoded.userId);
      if (user && user.status === 'ACTIVE') {
        req.user = {
          userId: user.id,
          email: user.email,
          role: user.role as UserRole
        };
      }
    } catch {
      // Ignore invalid token in optional auth
    }
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
    res.status(403).json({
      success: false,
      message: 'Administrator privileges required.',
      code: 'FORBIDDEN'
    });
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Super Administrator privileges required.',
      code: 'SUPER_ADMIN_REQUIRED'
    });
    return;
  }
  next();
}
