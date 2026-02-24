import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // Check JWT token
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        throw new AppError('User not found', 401);
      }

      req.user = user;
      return next();
    }

    // Check API key
    if (apiKey) {
      const user = await prisma.user.findUnique({
        where: { apiKey },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        throw new AppError('Invalid API key', 401);
      }

      req.user = user;
      return next();
    }

    throw new AppError('Authentication required', 401);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};
