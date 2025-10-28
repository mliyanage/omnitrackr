import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { FileSource, FileSourceStatus } from '../types/fileSource.types';

/**
 * File Source Repository
 * Handles database operations for file sources
 */
export class FileSourceRepository extends BaseRepository<FileSource> {
  constructor(db: Knex) {
    super(db);
  }

  protected get tableName(): string {
    return 'file_sources';
  }

  /**
   * Find file sources by department
   */
  async findByDepartment(department: string): Promise<FileSource[]> {
    return this.db(this.tableName)
      .where({ department })
      .select('*');
  }

  /**
   * Find enabled file sources
   */
  async findEnabled(): Promise<FileSource[]> {
    return this.db(this.tableName)
      .where({ enabled: true })
      .select('*');
  }

  /**
   * Find file sources due for polling
   * Returns sources where:
   * - enabled = true
   * - status != 'disabled'
   * - last_sync is null OR (now - last_sync) >= poll_frequency_minutes
   */
  async findDueForPolling(currentTime: Date = new Date()): Promise<FileSource[]> {
    return this.db(this.tableName)
      .where({ enabled: true })
      .whereNot({ status: 'disabled' })
      .where(function() {
        this.whereNull('last_sync')
          .orWhereRaw(
            'EXTRACT(EPOCH FROM (? - last_sync))/60 >= COALESCE(poll_frequency_minutes, 15)',
            [currentTime]
          );
      })
      .select('*');
  }

  /**
   * Update sync status after polling
   */
  async updateSyncStatus(
    id: number,
    status: 'success' | 'failed',
    error?: string,
    stats?: {
      pollDurationMs?: number;
      objectsScanned?: number;
      objectsDetected?: number;
    }
  ): Promise<FileSource> {
    const updateData: any = {
      last_sync: this.db.fn.now(),
      last_sync_status: status,
      updated_at: this.db.fn.now(),
    };

    if (error) {
      updateData.last_sync_error = error;
    } else {
      updateData.last_sync_error = null;
    }

    if (stats?.pollDurationMs !== undefined) {
      updateData.last_poll_duration_ms = stats.pollDurationMs;
    }
    if (stats?.objectsScanned !== undefined) {
      updateData.last_objects_scanned = stats.objectsScanned;
    }
    if (stats?.objectsDetected !== undefined) {
      updateData.last_objects_detected = stats.objectsDetected;
    }

    const [updated] = await this.db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return updated;
  }

  /**
   * Update file source status
   */
  async updateStatus(id: number, status: FileSourceStatus): Promise<FileSource> {
    const [updated] = await this.db(this.tableName)
      .where({ id })
      .update({
        status,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return updated;
  }

  /**
   * Increment files processed counter
   */
  async incrementFilesProcessed(id: number, count: number = 1): Promise<FileSource> {
    const [updated] = await this.db(this.tableName)
      .where({ id })
      .increment('files_processed', count)
      .update({ updated_at: this.db.fn.now() })
      .returning('*');

    return updated;
  }

  /**
   * Calculate and update success rate
   */
  async updateSuccessRate(id: number): Promise<FileSource> {
    // This would typically be calculated based on successful vs failed syncs
    // For now, we'll keep it simple and update based on last_sync_status
    const source = await this.findById(id);
    if (!source) {
      throw new Error(`File source ${id} not found`);
    }

    let newSuccessRate = source.success_rate;
    if (source.last_sync_status === 'success') {
      newSuccessRate = Math.min(100, source.success_rate + 1);
    } else if (source.last_sync_status === 'failed') {
      newSuccessRate = Math.max(0, source.success_rate - 5);
    }

    const [updated] = await this.db(this.tableName)
      .where({ id })
      .update({
        success_rate: newSuccessRate,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return updated;
  }

  /**
   * Find file sources by type
   */
  async findByType(type: string): Promise<FileSource[]> {
    return this.db(this.tableName)
      .where({ type })
      .select('*');
  }

  /**
   * Search file sources by name
   */
  async searchByName(searchTerm: string): Promise<FileSource[]> {
    return this.db(this.tableName)
      .where('name', 'ilike', `%${searchTerm}%`)
      .select('*');
  }
}
