import bcrypt from 'bcrypt';
import { Knex } from 'knex';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
const PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH || '8');
const PASSWORD_EXPIRY_DAYS = parseInt(process.env.PASSWORD_EXPIRY_DAYS || '90');
const PASSWORD_HISTORY_COUNT = parseInt(process.env.PASSWORD_HISTORY_COUNT || '5');

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
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

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if password was used recently
 */
export async function checkPasswordHistory(
  userId: number,
  newPasswordHash: string,
  trx: Knex
): Promise<boolean> {
  const history = await trx('password_history')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(PASSWORD_HISTORY_COUNT);

  for (const record of history) {
    const isSame = await bcrypt.compare(newPasswordHash, record.password_hash);
    if (isSame) {
      return true;
    }
  }

  return false;
}

/**
 * Save password to history
 */
export async function savePasswordToHistory(
  userId: number,
  passwordHash: string,
  trx: Knex
): Promise<void> {
  await trx('password_history').insert({
    user_id: userId,
    password_hash: passwordHash,
    created_at: trx.fn.now(),
  });

  const allHistory = await trx('password_history')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc');

  if (allHistory.length > PASSWORD_HISTORY_COUNT) {
    const idsToDelete = allHistory.slice(PASSWORD_HISTORY_COUNT).map((h) => h.id);
    await trx('password_history').whereIn('id', idsToDelete).del();
  }
}

/**
 * Calculate password expiration date
 */
export function calculatePasswordExpiration(): Date {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + PASSWORD_EXPIRY_DAYS);
  return expirationDate;
}
