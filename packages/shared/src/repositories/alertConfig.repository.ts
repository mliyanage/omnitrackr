import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { AlertConfig } from '../types';

/**
 * Alert Config Repository
 * Handles all database operations for alert_configs table
 */
export class AlertConfigRepository extends BaseRepository {
  protected get tableName(): string {
    return 'alert_configs';
  }

  /**
   * Find alert config by watcher ID (for notification processing)
   */
  async findByWatcherId(watcherId: number): Promise<AlertConfig | undefined> {
    return this.db(this.tableName)
      .where({
        watcher_id: watcherId,
        deleted_at: null,
        enabled: true,
      })
      .first();
  }

  /**
   * Find all alert configs for an organization
   */
  async findByOrganizationId(organizationId: number): Promise<AlertConfig[]> {
    const configs = await this.db(this.tableName)
      .where({ organization_id: organizationId, deleted_at: null })
      .orderBy('created_at', 'desc');

    // Populate watcher details
    for (const config of configs) {
      const watcher = await this.db('watchers')
        .where({ id: config.watcher_id })
        .select('id', 'name', 'department_code')
        .first();

      if (watcher) {
        (config as any).watcher = watcher;
      }
    }

    return configs;
  }

  /**
   * Find enabled alert configs
   */
  async findEnabled(organizationId: number): Promise<AlertConfig[]> {
    return this.db(this.tableName)
      .where({
        organization_id: organizationId,
        enabled: true,
        deleted_at: null,
      })
      .orderBy('created_at', 'desc');
  }

  /**
   * Soft delete alert config
   */
  async softDelete(id: number): Promise<void> {
    await this.db(this.tableName).where({ id }).update({
      deleted_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
  }

  /**
   * Find soft-deleted config by watcher ID
   */
  async findDeletedByWatcherId(watcherId: number): Promise<AlertConfig | undefined> {
    return this.db(this.tableName)
      .where({ watcher_id: watcherId })
      .whereNotNull('deleted_at')
      .first();
  }

  /**
   * Restore soft-deleted config
   */
  async restore(
    id: number,
    updateData: Partial<AlertConfig>
  ): Promise<AlertConfig | undefined> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        ...updateData,
        deleted_at: null,
        updated_at: this.db.fn.now(),
      });

    return this.findById(id);
  }

  /**
   * Find configs with pagination and filters
   */
  async findWithFilters(options: {
    organization_id: number;
    watcher_id?: number;
    enabled?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: AlertConfig[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    let query = this.db(this.tableName).where({
      organization_id: options.organization_id,
      deleted_at: null,
    });

    if (options.watcher_id !== undefined) {
      query = query.where({ watcher_id: options.watcher_id });
    }

    if (options.enabled !== undefined) {
      query = query.where({ enabled: options.enabled });
    }

    // Count total
    const countQuery = query.clone().count('* as count');
    const [{ count }] = await countQuery;
    const total = Number(count);

    // Get paginated data
    const data = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
