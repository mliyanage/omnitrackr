import { BaseRepository } from './base.repository';
import {
  Watcher,
  WatcherStatus,
  CheckStatus,
  DirectionType,
  WatcherWithRelations,
} from '../types';

/**
 * Watcher Repository
 * Handles all database operations for watchers table
 */
export class WatcherRepository extends BaseRepository {
  protected get tableName(): string {
    return 'watchers';
  }

  /**
   * Find watchers by connection
   */
  async findByConnectionId(connectionId: number): Promise<Watcher[]> {
    return this.db(this.tableName)
      .where({ source_connection_id: connectionId, deleted_at: null })
      .orderBy('name', 'asc');
  }

  /**
   * Find watchers by schedule
   */
  async findByScheduleId(scheduleId: number): Promise<Watcher[]> {
    return this.db(this.tableName)
      .where({ schedule_id: scheduleId, deleted_at: null })
      .orderBy('name', 'asc');
  }

  /**
   * Find watchers by department
   */
  async findByDepartment(departmentCode: string): Promise<Watcher[]> {
    return this.db(this.tableName)
      .where({ department_code: departmentCode, deleted_at: null })
      .orderBy('name', 'asc');
  }

  /**
   * Find active watchers (for polling)
   */
  async findActive(): Promise<Watcher[]> {
    return this.db(this.tableName)
      .where({ status: 'active' as WatcherStatus, deleted_at: null })
      .orderBy('last_check_at', 'asc');
  }

  /**
   * Find watchers due for polling based on poll_interval_minutes
   * A watcher is "due" if:
   * - It's active
   * - last_check_at is NULL (never polled), OR
   * - current_time - last_check_at >= poll_interval_minutes
   *
   * Groups by connection for batch processing
   */
  async findDueForPolling(): Promise<Watcher[]> {
    const now = new Date();

    return this.db(this.tableName)
      .where({ status: 'active' as WatcherStatus, deleted_at: null })
      .andWhere((builder) => {
        builder
          // Never polled before
          .whereNull('last_check_at')
          // OR polled but enough time has passed
          .orWhereRaw(
            `EXTRACT(EPOCH FROM (NOW() - last_check_at)) / 60 >= poll_interval_minutes`
          );
      })
      .orderBy(['source_connection_id', 'last_check_at']);
  }

  /**
   * Update last check status
   */
  async updateCheckStatus(
    id: number,
    status: CheckStatus,
    filesDetected: number
  ): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        last_check_at: this.db.fn.now(),
        last_check_status: status,
        last_files_detected: filesDetected,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Increment statistics after successful poll
   */
  async incrementStats(
    id: number,
    filesDetected: number,
    success: boolean
  ): Promise<void> {
    if (success) {
      await this.db.raw(
        `UPDATE ${this.tableName}
         SET total_files_detected = total_files_detected + ?,
             total_polls_succeeded = total_polls_succeeded + 1,
             success_rate = (total_polls_succeeded + 1)::decimal /
               (total_polls_succeeded + total_polls_failed + 1) * 100,
             updated_at = NOW()
         WHERE id = ?`,
        [filesDetected, id]
      );
    } else {
      await this.db.raw(
        `UPDATE ${this.tableName}
         SET total_polls_failed = total_polls_failed + 1,
             success_rate = total_polls_succeeded::decimal /
               (total_polls_succeeded + total_polls_failed + 1) * 100,
             updated_at = NOW()
         WHERE id = ?`,
        [id]
      );
    }
  }

  /**
   * Update watcher status
   */
  async updateStatus(id: number, status: WatcherStatus): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        status,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Soft delete watcher
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
   * Find soft-deleted watcher by name
   */
  async findDeletedByName(name: string): Promise<Watcher | undefined> {
    return this.db(this.tableName)
      .whereRaw('LOWER(name) = LOWER(?)', [name])
      .whereNotNull('deleted_at')
      .first();
  }

  /**
   * Restore soft-deleted watcher and update its values
   */
  async restore(id: number, updateData: Partial<Watcher>): Promise<Watcher> {
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
   * Find watcher with relations
   */
  async findWithRelations(id: number): Promise<WatcherWithRelations | undefined> {
    const watcher = await this.db(this.tableName)
      .where({ id, deleted_at: null })
      .first();

    if (!watcher) return undefined;

    // Get connection info
    const connection = await this.db('source_connections')
      .select('id', 'name', 'type', 'connection_status')
      .where({ id: watcher.source_connection_id })
      .first();

    // Get schedule info
    let schedule;
    if (watcher.schedule_id) {
      schedule = await this.db('schedules')
        .select('id', 'name', 'frequency_type')
        .where({ id: watcher.schedule_id })
        .first();
    }

    // Get department info
    let department;
    if (watcher.department_code) {
      const refData = await this.db('ref_data')
        .where({ code: watcher.department_code })
        .first();
      if (refData) {
        department = {
          code: refData.code,
          name: refData.value1,
        };
      }
    }

    return {
      ...watcher,
      source_connection: connection,
      schedule,
      department,
    };
  }

  /**
   * Update watcher statistics after a poll
   * Combines status update and statistics increment in one operation
   */
  async updatePollStatistics(
    watcherId: number,
    result: {
      success: boolean;
      filesDetected: number;
      filesNew: number;
      consecutiveFailures?: number;
    }
  ): Promise<void> {
    const now = new Date();

    if (result.success) {
      // Successful poll - update all fields
      await this.db.raw(
        `UPDATE ${this.tableName}
         SET last_check_at = ?,
             last_check_status = 'success',
             last_files_detected = ?,
             total_files_detected = total_files_detected + ?,
             total_polls_succeeded = total_polls_succeeded + 1,
             success_rate = ROUND(
               (total_polls_succeeded + 1)::numeric /
               NULLIF(total_polls_succeeded + total_polls_failed + 1, 0)::numeric * 100,
               2
             ),
             updated_at = ?
         WHERE id = ?`,
        [now, result.filesDetected, result.filesNew, now, watcherId]
      );
    } else {
      // Failed poll - update failure stats and potentially change status
      const shouldMarkError = (result.consecutiveFailures ?? 0) >= 3;

      await this.db.raw(
        `UPDATE ${this.tableName}
         SET last_check_at = ?,
             last_check_status = 'failed',
             last_files_detected = 0,
             total_polls_failed = total_polls_failed + 1,
             success_rate = ROUND(
               total_polls_succeeded::numeric /
               NULLIF(total_polls_succeeded + total_polls_failed + 1, 0)::numeric * 100,
               2
             ),
             status = CASE WHEN ? THEN 'error' ELSE status END,
             updated_at = ?
         WHERE id = ?`,
        [now, shouldMarkError, now, watcherId]
      );
    }
  }

  /**
   * Mark poll as in progress
   */
  async markPollInProgress(watcherId: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id: watcherId })
      .update({
        last_check_status: 'in_progress',
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Find with pagination and filters
   */
  async findWithFilters(options: {
    source_connection_id?: number;
    schedule_id?: number;
    department_code?: string;
    status?: WatcherStatus;
    direction?: DirectionType;
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    // Build the query with joins
    let query = this.db(this.tableName)
      .select(
        `${this.tableName}.*`,
        'source_connections.name as source_connection_name',
        'source_connections.type as source_connection_type'
      )
      .leftJoin('source_connections', `${this.tableName}.source_connection_id`, 'source_connections.id')
      .where({ [`${this.tableName}.deleted_at`]: null });

    // Apply filters
    if (options.source_connection_id) {
      query = query.where({ [`${this.tableName}.source_connection_id`]: options.source_connection_id });
    }
    if (options.schedule_id) {
      query = query.where({ [`${this.tableName}.schedule_id`]: options.schedule_id });
    }
    if (options.department_code) {
      query = query.where({ [`${this.tableName}.department_code`]: options.department_code });
    }
    if (options.status) {
      query = query.where({ [`${this.tableName}.status`]: options.status });
    }
    if (options.direction) {
      query = query.where({ [`${this.tableName}.direction`]: options.direction });
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('* as count');
    const [{ count }] = await countQuery;
    const total = Number(count);

    // Get paginated data
    const data = await query
      .orderBy(`${this.tableName}.name`, 'asc')
      .limit(limit)
      .offset(offset);

    // Transform data to include source_connection object
    const transformedData = data.map((row) => {
      const { source_connection_name, source_connection_type, ...watcher } = row;
      return {
        ...watcher,
        source_connection: source_connection_name
          ? {
              id: watcher.source_connection_id,
              name: source_connection_name,
              type: source_connection_type,
            }
          : null,
      };
    });

    return {
      data: transformedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
