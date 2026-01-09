import jwt, { SignOptions } from 'jsonwebtoken';

/**
 * JWT Utilities
 * Handles JWT token generation and verification
 */

const JWT_SECRET: string = process.env.JWT_SECRET || 'development-secret-key-change-in-production-min-32-chars';
const JWT_ACCESS_EXPIRY: string = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY: string = process.env.JWT_REFRESH_EXPIRY || '30d';

if (!process.env.JWT_SECRET || JWT_SECRET === 'your-secret-key-here-change-in-production') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Change this in production!');
}

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  userId: number;
  organizationId: number | null;
  role: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate Access Token (Short-lived)
 * Used for API authentication
 */
export function generateAccessToken(payload: {
  userId: number;
  organizationId: number | null;
  role: string;
  email: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY,
    issuer: 'omnitrackr-api',
    audience: 'omnitrackr-client',
  } as SignOptions);
}

/**
 * Verify Access Token
 * Returns decoded payload or throws error
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'omnitrackr-api',
      audience: 'omnitrackr-client',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Generate Temporary Token (for 2FA flow)
 * Short-lived token used during 2FA verification
 */
export function generateTempToken(payload: {
  userId: number;
  email: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '5m', // Very short expiry for temp tokens
    issuer: 'omnitrackr-api',
    audience: 'omnitrackr-2fa',
  });
}

/**
 * Verify Temporary Token (for 2FA flow)
 */
export function verifyTempToken(token: string): { userId: number; email: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'omnitrackr-api',
      audience: 'omnitrackr-2fa',
    }) as { userId: number; email: string };

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('2FA verification expired. Please login again.');
    }
    throw new Error('Invalid 2FA token');
  }
}

/**
 * Decode token without verification (for debugging)
 * DO NOT use for authentication!
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Get token expiry time in seconds
 */
export function getTokenExpirySeconds(): number {
  // Parse expiry string (e.g., "15m" -> 900 seconds)
  const match = JWT_ACCESS_EXPIRY.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 900; // Default 15 minutes
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * (multipliers[unit] || 60);
}
