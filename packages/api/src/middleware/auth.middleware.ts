import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt.utils';
import { UnauthorizedError } from '../utils/errors';
import { UserRepository, User } from '@omnitrackr/shared';
import { db } from '../config/database';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    organizationId: number | null;
    role: string;
    email: string;
    departmentIds: number[]; // For editor/viewer users
  };
}

/**
 * Authentication Middleware
 * Verifies JWT and attaches user info to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT
    let decoded: JWTPayload;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error instanceof Error) {
        throw new UnauthorizedError(error.message);
      }
      throw new UnauthorizedError('Invalid token');
    }

    // Fetch user from database to ensure they're still active
    const userRepo = new UserRepository(db);
    const user = await userRepo.findById<User>(decoded.userId);

    if (!user || user.deleted_at) {
      throw new UnauthorizedError('User not found');
    }

    // Check user status
    if (user.status === 'suspended') {
      throw new UnauthorizedError('Account suspended');
    }

    if (user.status === 'deactivated') {
      throw new UnauthorizedError('Account deactivated');
    }

    if (user.status === 'invited') {
      throw new UnauthorizedError('Account not activated. Please accept your invitation.');
    }

    // Check if email is verified (required for login)
    if (!user.email_verified) {
      throw new UnauthorizedError('Email not verified. Please verify your email.');
    }

    // Check if account is locked
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      throw new UnauthorizedError('Account temporarily locked. Please try again later.');
    }

    // Check password expiration
    if (user.password_expires_at && new Date() > new Date(user.password_expires_at)) {
      throw new UnauthorizedError('Password expired. Please reset your password.');
    }

    // Get user's department assignments (for editor/viewer)
    let departmentIds: number[] = [];
    if (user.role === 'editor' || user.role === 'viewer') {
      const assignments = await db('user_departments')
        .where({ user_id: user.id })
        .select('department_id');

      departmentIds = assignments.map(a => a.department_id);
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = {
      id: user.id,
      organizationId: user.organization_id || null,
      role: user.role,
      email: user.email,
      departmentIds,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user if token present, but doesn't fail if missing
 * Useful for endpoints that have different behavior for authenticated users
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // No token, continue without user
  }

  try {
    await authenticate(req, res, next);
  } catch (error) {
    // Authentication failed, but continue without user
    next();
  }
};
