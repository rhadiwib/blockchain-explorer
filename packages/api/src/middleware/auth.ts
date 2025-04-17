import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig, logger } from '@blockchain-explorer/common';

const authLogger = logger.child({ component: 'auth-middleware' });

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authToken = req.query.auth_token as string || 
                     (req.headers.authorization?.startsWith('Bearer ') ? 
                      req.headers.authorization.split(' ')[1] : 
                      req.headers.authorization);
    
    if (!authToken) {
      console.log('No authentication token provided');
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }
    
    console.log('Authenticating token:', authToken.substring(0, 10) + '...');
    
    // Verify token
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    try {
      const decoded = jwt.verify(authToken, String(secret));
      console.log('Token verified successfully', decoded);
      req.user = decoded as { id: string; role: string };
      next();
    } catch (tokenErr) {
      console.error('Token verification failed:', tokenErr);
      res.status(403).json({ error: 'Forbidden: Invalid token' });
    }
  } catch (err) {
    console.error('Error in auth middleware:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};