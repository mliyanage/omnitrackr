import { Knex } from 'knex';
import { BaseRepository } from './base.repository';

/**
 * User data type
 */
export interface User {
  id: number;
  organization_id?: number;
  email: string;
  email_verified: boolean;
  email_verified_at?: Date;
  password_hash: string;
  password_changed_at: Date;
  password_expires_at?: Date;
  two_fa_enabled: boolean;
  two_fa_secret?: string;
  two_fa_backup_codes?: string[];
  two_fa_verified_at?: Date;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  avatar_url?: string;
  timezone: string;
  locale: string;
  role: 'super_admin' | 'owner' | 'editor' | 'viewer' | 'service_account';
  status: 'invited' | 'active' | 'suspended' | 'deactivated';
  last_login_at?: Date;
  last_login_ip?: string;
  failed_login_attempts: number;
  locked_until?: Date;
  must_change_password: boolean;
  sso_provider?: string;
  sso_subject?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
  deleted_at?: Date;
}

/**
 * User Repository
 * Handles database operations for users
 */
export class UserRepository extends BaseRepository {
  protected get tableName(): string {
    return 'users';
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    return this.db(this.tableName)
      .where({ email, deleted_at: null })
      .first();
  }

  /**
   * Find users by organization
   */
  async findByOrganization(organizationId: number): Promise<User[]> {
    return this.db(this.tableName)
      .where({ organization_id: organizationId, deleted_at: null })
      .orderBy('created_at', 'desc');
  }

  /**
   * Find users by role
   */
  async findByRole(role: string): Promise<User[]> {
    return this.db(this.tableName)
      .where({ role, deleted_at: null })
      .orderBy('created_at', 'desc');
  }

  /**
   * Find user with department assignments
   */
  async findWithDepartments(id: number): Promise<(User & { department_ids: number[] }) | undefined> {
    const user = await this.findById<User>(id);
    if (!user) {
      return undefined;
    }

    const departments = await this.db('user_departments')
      .where({ user_id: id })
      .select('department_id');

    return {
      ...user,
      department_ids: departments.map(d => d.department_id),
    };
  }

  /**
   * Update failed login attempts
   */
  async incrementFailedLoginAttempts(id: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .increment('failed_login_attempts', 1)
      .update({ updated_at: this.db.fn.now() });
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLoginAttempts(id: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Lock user account
   */
  async lockAccount(id: number, minutes: number): Promise<void> {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + minutes);

    await this.db(this.tableName)
      .where({ id })
      .update({
        locked_until: lockedUntil,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Update last login
   */
  async updateLastLogin(id: number, ip: string): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        last_login_at: this.db.fn.now(),
        last_login_ip: ip,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Check if user is locked
   */
  async isAccountLocked(id: number): Promise<boolean> {
    const user = await this.findById<User>(id);
    if (!user || !user.locked_until) {
      return false;
    }

    return new Date() < new Date(user.locked_until);
  }

  /**
   * Soft delete user
   */
  async softDelete(id: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });
  }
}
