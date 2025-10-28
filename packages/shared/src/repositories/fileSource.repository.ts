import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { FileSource, FileSourceType, FileSourceStatus } from '../types';

/**
 * File Source Repository
 * Handles all database operations for file_sources table
 */
export class FileSourceRepository extends BaseRepository {
  protected get tableName(): string {
    return 'file_sources';
  }

  /**
   * Find file sources by department
   */
  async findByDepartment(department: string): Promise<FileSource[]> {
    return this.db(this.tableName)
      .where({ department })
      .orderBy('name', 'asc');
  }

  /**
   * Find active file sources by type
   */
  async findActiveByType(type: FileSourceType): Promise<FileSource[]> {
    return this.db(this.tableName)
      .where({ type, enabled: true, status: 'active' as FileSourceStatus });
  }

  /**
   * Find file sources that are due for polling
   * Used by the Worker service
   */
  async findDueForPolling(currentTime: Date): Promise<FileSource[]> {
    return this.db(this.tableName)
      .where({ enabled: true, status: 'active' as FileSourceStatus })
      .andWhere(function() {
        this.whereNull('last_sync')
          .orWhereRaw(
            `last_sync + (poll_frequency_minutes || ' minutes')::INTERVAL <= ?`,
            [currentTime]
          );
      })
      .orderBy('last_sync', 'asc'); // Poll oldest first
  }

  /**
   * Update sync status after polling
   * Used by the Worker service
   */
  async updateSyncStatus(
    id: number,
    status: 'success' | 'failed',
    error?: string
  ): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        last_sync: this.db.fn.now(),
        last_sync_status: status,
        last_sync_error: error || null,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Increment files processed counter
   * Used by the Worker service
   */
  async incrementFilesProcessed(id: number, count: number): Promise<void> {
    await this.db.raw(
      `UPDATE ${this.tableName}
       SET files_processed = files_processed + ?,
           updated_at = NOW()
       WHERE id = ?`,
      [count, id]
    );
  }

  /**
   * Update polling metrics
   * Used by the Worker service
   */
  async updatePollMetrics(
    id: number,
    metrics: {
      durationMs: number;
      objectsScanned: number;
      objectsDetected: number;
    }
  ): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        last_poll_duration_ms: metrics.durationMs,
        last_objects_scanned: metrics.objectsScanned,
        last_objects_detected: metrics.objectsDetected,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Update file source status
   */
  async updateStatus(id: number, status: FileSourceStatus): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        status,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Enable or disable a file source
   */
  async setEnabled(id: number, enabled: boolean): Promise<FileSource> {
    const [result] = await this.db(this.tableName)
      .where({ id })
      .update({
        enabled,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return result;
  }

  /**
   * Find file sources with filters and pagination
   */
  async findWithFilters(options: {
    type?: FileSourceType;
    status?: FileSourceStatus;
    department?: string;
    enabled?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: FileSource[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const filters: Partial<FileSource> = {};
    if (options.type) filters.type = options.type;
    if (options.status) filters.status = options.status;
    if (options.department) filters.department = options.department;
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
