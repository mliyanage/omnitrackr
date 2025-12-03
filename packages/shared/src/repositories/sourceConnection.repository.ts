import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import {
  SourceConnection,
  SourceType,
  ConnectionStatus,
  ConnectionHealthCheckResult,
} from '../types';

/**
 * Source Connection Repository
 * Handles all database operations for source_connections table
 */
export class SourceConnectionRepository extends BaseRepository {
  protected get tableName(): string {
    return 'source_connections';
  }

  /**
   * Find connections by type
   */
  async findByType(type: SourceType): Promise<SourceConnection[]> {
    return this.db(this.tableName)
      .where({ type, deleted_at: null })
      .orderBy('name', 'asc');
  }

  /**
   * Find enabled connections
   */
  async findEnabled(): Promise<SourceConnection[]> {
    return this.db(this.tableName)
      .where({ enabled: true, deleted_at: null })
      .orderBy('name', 'asc');
  }

  /**
   * Find connections by status
   */
  async findByStatus(status: ConnectionStatus): Promise<SourceConnection[]> {
    return this.db(this.tableName)
      .where({ connection_status: status, deleted_at: null })
      .orderBy('name', 'asc');
  }

  /**
   * Find connections with health issues
   */
  async findUnhealthy(): Promise<SourceConnection[]> {
    return this.db(this.tableName)
      .whereIn('connection_status', ['degraded', 'failed'])
      .andWhere({ enabled: true, deleted_at: null })
      .orderBy('last_health_check', 'asc');
  }

  /**
   * Update connection health status
   */
  async updateHealthStatus(
    id: number,
    result: ConnectionHealthCheckResult
  ): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        connection_status: result.connection_status,
        last_health_check: result.last_health_check,
        last_successful_connection: result.last_successful_connection,
        health_check_error: result.health_check_error || null,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Update credential rotation timestamp
   */
  async updateCredentialRotation(id: number, expiresAt?: Date): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        credential_last_rotated: this.db.fn.now(),
        credential_expires_at: expiresAt || null,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Soft delete connection
   */
  async softDelete(id: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Find soft-deleted connection by name
   */
  async findDeletedByName(name: string): Promise<SourceConnection | undefined> {
    return this.db(this.tableName)
      .whereRaw('LOWER(name) = LOWER(?)', [name])
      .whereNotNull('deleted_at')
      .first();
  }

  /**
   * Restore soft-deleted connection and update its values
   */
  async restore(id: number, updateData: Partial<SourceConnection>): Promise<SourceConnection> {
    const [result] = await this.db(this.tableName)
      .where({ id })
      .update({
        ...updateData,
        deleted_at: null,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return result;
  }

  /**
   * Find connections with expiring credentials
   */
  async findExpiringCredentials(withinDays: number): Promise<SourceConnection[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    return this.db(this.tableName)
      .where({ enabled: true, deleted_at: null })
      .whereNotNull('credential_expires_at')
      .where('credential_expires_at', '<=', futureDate)
      .orderBy('credential_expires_at', 'asc');
  }

  /**
   * Get connection count by type
   */
  async getCountByType(): Promise<{ type: SourceType; count: number }[]> {
    return this.db(this.tableName)
      .select('type')
      .count('* as count')
      .where({ deleted_at: null })
      .groupBy('type');
  }

  /**
   * Find with pagination and filters
   */
  async findWithFilters(options: {
    type?: SourceType;
    connection_status?: ConnectionStatus;
    enabled?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: SourceConnection[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const filters: Partial<SourceConnection> = { deleted_at: null } as any;
    if (options.type) filters.type = options.type;
    if (options.connection_status) filters.connection_status = options.connection_status;
    if (options.enabled !== undefined) filters.enabled = options.enabled;

    return this.paginate({
      filters,
      page: options.page,
      limit: options.limit,
      orderBy: 'name',
      orderDirection: 'asc',
    });
  }
}
