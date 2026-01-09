import crypto from 'crypto';

/**
 * Token Utilities
 * Handles secure token generation and hashing for refresh tokens,
 * password reset tokens, and email verification tokens
 */

/**
 * Generate cryptographically secure random token
 * Returns hex string (64 characters for 32 bytes)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token using SHA-256
 * Tokens should be hashed before storing in database
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token against its hash
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash),
    Buffer.from(hash)
  );
}

/**
 * Calculate token expiration date
 */
export function calculateTokenExpiration(hours: number): Date {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + hours);
  return expiryDate;
}

/**
 * Check if token has expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Generate device fingerprint from request
 * Used for session tracking
 */
export function generateDeviceFingerprint(
  userAgent: string,
  ip: string
): string {
  const data = `${userAgent}-${ip}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}
