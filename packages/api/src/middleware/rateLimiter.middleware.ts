import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Rate Limiter Middleware
 * Protects against brute force attacks
 */

/**
 * Auth Rate Limiter
 * Strict limits for authentication endpoints (login, password reset, etc.)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit by IP + email (if provided in body)
    const email = req.body?.email || '';
    return `auth:${req.ip}-${email}`;
  },
});

/**
 * Password Reset Rate Limiter
 * Limit password reset requests to prevent abuse
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests. Please try again later.',
    },
  },
  keyGenerator: (req: Request) => {
    const email = req.body?.email || req.ip;
    return `reset:${email}`;
  },
});

/**
 * Email Verification Rate Limiter
 * Limit verification email resends
 */
export const emailVerificationRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // 3 requests per 10 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many verification emails sent. Please try again later.',
    },
  },
  keyGenerator: (req: Request) => {
    const email = req.body?.email || req.ip;
    return `verify:${email}`;
  },
});

/**
 * General API Rate Limiter
 * Applied to all API routes as a baseline
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
