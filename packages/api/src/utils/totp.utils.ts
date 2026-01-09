import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { hashPassword } from './password.utils';

/**
 * TOTP Configuration
 */
const TOTP_CONFIG = {
  issuer: process.env.TOTP_ISSUER || 'OmniTrackr',
  window: parseInt(process.env.TOTP_WINDOW || '1', 10), // Allow 1 step before/after (30s window)
  encoding: 'base32' as const,
  algorithm: 'sha1' as const,
  digits: 6,
  step: 30, // 30 seconds
};

/**
 * Generate a new TOTP secret for a user
 * @param userEmail - User's email for labeling in authenticator app
 * @returns Object containing the secret and otpauth URL
 */
export function generateTOTPSecret(userEmail: string): {
  secret: string;
  otpauthUrl: string;
} {
  const secret = speakeasy.generateSecret({
    name: `${TOTP_CONFIG.issuer} (${userEmail})`,
    issuer: TOTP_CONFIG.issuer,
    length: 32,
  });

  if (!secret.base32 || !secret.otpauth_url) {
    throw new Error('Failed to generate TOTP secret');
  }

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  };
}

/**
 * Generate a QR code data URL for the TOTP secret
 * @param otpauthUrl - The otpauth:// URL from generateTOTPSecret
 * @returns Promise resolving to data URL for QR code image
 */
export async function generateQRCodeDataURL(
  otpauthUrl: string
): Promise<string> {
  try {
    return await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 1,
    });
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify a TOTP token against a secret
 * @param token - 6-digit token from authenticator app
 * @param secret - The user's TOTP secret (base32 encoded)
 * @returns true if token is valid, false otherwise
 */
export function verifyTOTPToken(token: string, secret: string): boolean {
  // Remove any spaces or dashes from token
  const cleanToken = token.replace(/[\s-]/g, '');

  // Verify token format (6 digits)
  if (!/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  return speakeasy.totp.verify({
    secret,
    encoding: TOTP_CONFIG.encoding,
    token: cleanToken,
    window: TOTP_CONFIG.window,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    step: TOTP_CONFIG.step,
  });
}

/**
 * Generate backup codes for account recovery
 * @param count - Number of backup codes to generate (default: 10)
 * @returns Array of backup codes (8 characters, format: XXXX-XXXX)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8 random characters (alphanumeric, uppercase)
    const code = crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join('-');

    if (code) {
      codes.push(code);
    }
  }

  return codes;
}

/**
 * Hash a backup code for secure storage
 * @param code - Plain text backup code
 * @returns Promise resolving to hashed backup code
 */
export async function hashBackupCode(code: string): Promise<string> {
  // Remove hyphens before hashing
  const cleanCode = code.replace(/-/g, '');
  // Reuse password hashing utility (bcrypt)
  return hashPassword(cleanCode);
}

/**
 * Verify a backup code against its hash
 * @param code - Plain text backup code
 * @param hash - Stored hash to compare against
 * @returns Promise resolving to true if code matches hash
 */
export async function verifyBackupCode(
  code: string,
  hash: string
): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  const cleanCode = code.replace(/-/g, '');
  return bcrypt.compare(cleanCode, hash);
}

/**
 * Get current TOTP token for a secret (mainly for testing)
 * @param secret - The TOTP secret (base32 encoded)
 * @returns Current 6-digit TOTP token
 */
export function getCurrentTOTPToken(secret: string): string {
  return speakeasy.totp({
    secret,
    encoding: TOTP_CONFIG.encoding,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    step: TOTP_CONFIG.step,
  });
}
