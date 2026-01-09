import bcrypt from 'bcrypt';
import { Knex } from 'knex';

/**
 * Password Utilities
 * Handles password hashing, verification, and validation
 */

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
const PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH || '8');
const PASSWORD_HISTORY_COUNT = parseInt(process.env.PASSWORD_HISTORY_COUNT || '5');

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a plaintext password with a hash
 * Uses timing-safe comparison
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters (configurable)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if password has been used recently
 * Prevents password reuse
 */
export async function checkPasswordHistory(
  userId: number,
  newPassword: string,
  db: Knex
): Promise<boolean> {
  const history = await db('password_history')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(PASSWORD_HISTORY_COUNT)
    .select('password_hash');

  for (const record of history) {
    const isReused = await comparePassword(newPassword, record.password_hash);
    if (isReused) {
      return false; // Password was used recently
    }
  }

  return true; // Password is acceptable
}

/**
 * Save password to history
 * Should be called after successful password change
 */
export async function savePasswordToHistory(
  userId: number,
  passwordHash: string,
  db: Knex
): Promise<void> {
  await db('password_history').insert({
    user_id: userId,
    password_hash: passwordHash,
    created_at: db.fn.now(),
  });

  // Keep only the last N passwords
  const allHistory = await db('password_history')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .select('id');

  if (allHistory.length > PASSWORD_HISTORY_COUNT) {
    const idsToDelete = allHistory
      .slice(PASSWORD_HISTORY_COUNT)
      .map((record) => record.id);

    await db('password_history').whereIn('id', idsToDelete).delete();
  }
}

/**
 * Calculate password expiration date
 * Returns null if password expiration is disabled
 */
export function calculatePasswordExpiration(): Date | null {
  const expiryDays = parseInt(process.env.PASSWORD_EXPIRY_DAYS || '0');

  if (expiryDays === 0) {
    return null; // Password expiration disabled
  }

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  return expiryDate;
}
