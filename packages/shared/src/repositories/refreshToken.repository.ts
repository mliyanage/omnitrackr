import { Knex } from 'knex';
import { BaseRepository } from './base.repository';

/**
 * Refresh Token data type
 */
export interface RefreshToken {
  id: number;
  user_id: number;
  token_hash: string;
  device_name?: string;
  device_fingerprint?: string;
  ip_address?: string;
  user_agent?: string;
  country?: string;
  city?: string;
  expires_at: Date;
  last_used_at?: Date;
  revoked_at?: Date;
  revoke_reason?: string;
  created_at: Date;
}

/**
 * Refresh Token Repository
 * Handles session management
 */
export class RefreshTokenRepository extends BaseRepository {
  protected get tableName(): string {
    return 'refresh_tokens';
  }

  /**
   * Find token by hash
   */
  async findByTokenHash(tokenHash: string): Promise<RefreshToken | undefined> {
    return this.db(this.tableName)
      .where({ token_hash: tokenHash, revoked_at: null })
      .first();
  }

  /**
   * Find active tokens for user
   */
  async findActiveByUser(userId: number): Promise<RefreshToken[]> {
    return this.db(this.tableName)
      .where({
        user_id: userId,
        revoked_at: null,
      })
      .where('expires_at', '>', this.db.fn.now())
      .orderBy('created_at', 'desc');
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(id: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({ last_used_at: this.db.fn.now() });
  }

  /**
   * Revoke token
   */
  async revokeToken(id: number, reason: string): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        revoked_at: this.db.fn.now(),
        revoke_reason: reason,
      });
  }

  /**
   * Revoke all tokens for user
   */
  async revokeAllForUser(userId: number, reason: string): Promise<number> {
    const result = await this.db(this.tableName)
      .where({ user_id: userId, revoked_at: null })
      .update({
        revoked_at: this.db.fn.now(),
        revoke_reason: reason,
      });

    return result;
  }

  /**
   * Delete expired tokens (cleanup)
   */
  async deleteExpired(): Promise<number> {
    return this.db(this.tableName)
      .where('expires_at', '<', this.db.fn.now())
      .delete();
  }

  /**
   * Count active sessions for user
   */
  async countActiveSessions(userId: number): Promise<number> {
    const result = await this.db(this.tableName)
      .where({
        user_id: userId,
        revoked_at: null,
      })
      .where('expires_at', '>', this.db.fn.now())
      .count('* as count')
      .first();

    return parseInt(result?.count as string, 10);
  }
}
