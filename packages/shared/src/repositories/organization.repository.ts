import { Knex } from 'knex';
import { BaseRepository } from './base.repository';

/**
 * Organization data type
 */
export interface Organization {
  id: number;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  primary_color?: string;
  settings?: Record<string, any>;
  sso_enabled: boolean;
  sso_provider?: string;
  sso_config?: Record<string, any>;
  max_users: number;
  max_watchers?: number;
  subscription_tier: string;
  subscription_expires_at?: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
  deleted_at?: Date;
}

/**
 * Organization Repository
 * Handles database operations for organizations
 */
export class OrganizationRepository extends BaseRepository {
  protected get tableName(): string {
    return 'organizations';
  }

  /**
   * Find organization by slug
   */
  async findBySlug(slug: string): Promise<Organization | undefined> {
    return this.db(this.tableName)
      .where({ slug, deleted_at: null })
      .first();
  }

  /**
   * Find organization by domain
   */
  async findByDomain(domain: string): Promise<Organization | undefined> {
    return this.db(this.tableName)
      .where({ domain, deleted_at: null })
      .first();
  }

  /**
   * Find active organizations
   */
  async findActive(): Promise<Organization[]> {
    return this.db(this.tableName)
      .where({ status: 'active', deleted_at: null })
      .orderBy('created_at', 'desc');
  }

  /**
   * Get organization with user count
   */
  async findWithUserCount(id: number): Promise<Organization & { user_count: number } | undefined> {
    const result = await this.db(this.tableName)
      .leftJoin('users', 'organizations.id', 'users.organization_id')
      .where({ 'organizations.id': id, 'organizations.deleted_at': null })
      .select(
        'organizations.*',
        this.db.raw('COUNT(DISTINCT users.id) as user_count')
      )
      .groupBy('organizations.id')
      .first();

    if (!result) {
      return undefined;
    }

    return {
      ...result,
      user_count: parseInt(result.user_count as string, 10),
    };
  }

  /**
   * Check if organization has reached user limit
   */
  async hasReachedUserLimit(id: number): Promise<boolean> {
    const org = await this.findWithUserCount(id);
    if (!org) {
      return true;
    }

    return org.user_count >= org.max_users;
  }

  /**
   * Soft delete organization
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
