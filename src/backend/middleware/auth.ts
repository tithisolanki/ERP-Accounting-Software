import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// The Electron shell (src/electron/main.ts) stores a random per-install secret in the
// user data folder and puts it in JWT_SECRET. If nothing set it (tests, bare server),
// use a random one for this process: tokens then simply expire on restart.
export const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    company_id: string | null;
    name: string;
    mustChangePassword?: boolean;
  };
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string;

  const token = authHeader ? authHeader.split(' ')[1] : queryToken;

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden. Invalid or expired token.' });
      }
      req.user = user as AuthenticatedRequest['user'];
      // A user still on a default password may only change it.
      if ((user as any).mustChangePassword && !req.originalUrl.startsWith('/api/auth/change-password')) {
        return res.status(403).json({ error: 'Please change your default password first.' });
      }
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized. Token required.' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (allowedRoles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }
  };
}
