import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import {
  WatcherLog,
  PollStatus,
  TriggerType,
  WatcherLogSummary,
  WatcherLogQueryOptions,
} from '../types';

/**
 * Watcher Log Repository
 * Handles all database operations for watcher_logs table
 */
export class WatcherLogRepository extends BaseRepository {
  protected get tableName(): string {
    return 'watcher_logs';
  }

  /**
   * Find logs by watcher
   */
  async findByWatcherId(
    watcherId: number,
    limit: number = 100
  ): Promise<WatcherLog[]> {
    return this.db(this.tableName)
      .where({ watcher_id: watcherId })
      .orderBy('poll_started_at', 'desc')
      .limit(limit);
  }

  /**
   * Find logs by connection
   */
  async findByConnectionId(
    connectionId: number,
    limit: number = 100
  ): Promise<WatcherLog[]> {
    return this.db(this.tableName)
      .where({ source_connection_id: connectionId })
      .orderBy('poll_started_at', 'desc')
      .limit(limit);
  }

  /**
   * Find recent failed logs
   */
  async findRecentFailed(limit: number = 50): Promise<WatcherLog[]> {
    return this.db(this.tableName)
      .whereIn('poll_status', ['failed', 'timeout'])
      .orderBy('poll_started_at', 'desc')
      .limit(limit);
  }

  /**
   * Create log entry (start of poll)
   */
  async createLogEntry(data: {
    watcher_id: number;
    source_connection_id: number;
    poll_started_at: Date;
    poll_status: PollStatus;
    triggered_by: TriggerType;
    triggered_by_user?: string;
    poll_date: Date;
  }): Promise<WatcherLog> {
    const [result] = await this.db(this.tableName)
      .insert({
        ...data,
        objects_scanned: 0,
        files_detected: 0,
        files_new: 0,
        files_duplicate: 0,
        api_calls_made: 0,
        bytes_transferred: 0,
      })
      .returning('*');
    return result;
  }

  /**
   * Complete log entry (end of poll)
   */
  async completeLogEntry(
    id: number,
    data: {
      poll_completed_at: Date;
      poll_duration_ms: number;
      poll_status: PollStatus;
      objects_scanned: number;
      files_detected: number;
      files_new: number;
      files_duplicate: number;
      error_details?: any;
      api_calls_made?: number;
      bytes_transferred?: number;
      connection_status_at_poll?: string;
    }
  ): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update(data);
  }

  /**
   * Get summary for a watcher
   */
  async getSummary(
    watcherId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<WatcherLogSummary> {
    const result = await this.db(this.tableName)
      .where({ watcher_id: watcherId })
      .whereBetween('poll_started_at', [periodStart, periodEnd])
      .select(
        this.db.raw('COUNT(*) as total_polls'),
        this.db.raw("COUNT(*) FILTER (WHERE poll_status = 'success') as successful_polls"),
        this.db.raw("COUNT(*) FILTER (WHERE poll_status IN ('failed', 'timeout')) as failed_polls"),
        this.db.raw('COALESCE(SUM(files_detected), 0) as total_files_detected'),
        this.db.raw('COALESCE(SUM(files_new), 0) as total_files_new'),
        this.db.raw('COALESCE(AVG(poll_duration_ms), 0) as average_duration_ms'),
        this.db.raw('COALESCE(SUM(bytes_transferred), 0) as total_bytes_transferred')
      )
      .first();

    return {
      watcher_id: watcherId,
      period_start: periodStart,
      period_end: periodEnd,
      total_polls: parseInt(result.total_polls, 10),
      successful_polls: parseInt(result.successful_polls, 10),
      failed_polls: parseInt(result.failed_polls, 10),
      total_files_detected: parseInt(result.total_files_detected, 10),
      total_files_new: parseInt(result.total_files_new, 10),
      average_duration_ms: parseFloat(result.average_duration_ms),
      total_bytes_transferred: parseInt(result.total_bytes_transferred, 10),
    };
  }

  /**
   * Find with query options
   */
  async findWithOptions(options: WatcherLogQueryOptions): Promise<{
    data: WatcherLog[];
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

    let query = this.db(this.tableName);

    if (options.watcher_id) {
      query = query.where({ watcher_id: options.watcher_id });
    }
    if (options.source_connection_id) {
      query = query.where({ source_connection_id: options.source_connection_id });
    }
    if (options.poll_status) {
      query = query.where({ poll_status: options.poll_status });
    }
    if (options.triggered_by) {
      query = query.where({ triggered_by: options.triggered_by });
    }
    if (options.start_date) {
      query = query.where('poll_started_at', '>=', options.start_date);
    }
    if (options.end_date) {
      query = query.where('poll_started_at', '<=', options.end_date);
    }

    // Get total count
    const [{ count: total }] = await query.clone().count('* as count');
    const totalCount = parseInt(String(total), 10);

    // Get paginated data
    const data = await query
      .orderBy('poll_started_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Delete old logs (for retention policy)
   */
  async deleteOlderThan(date: Date): Promise<number> {
    return this.db(this.tableName)
      .where('poll_date', '<', date)
      .del();
  }

  /**
   * Get logs count by date (for partitioning insights)
   */
  async getCountByDate(startDate: Date, endDate: Date): Promise<{ date: string; count: number }[]> {
    const results = await this.db(this.tableName)
      .select('poll_date as date')
      .count('* as count')
      .whereBetween('poll_date', [startDate, endDate])
      .groupBy('poll_date')
      .orderBy('poll_date', 'asc');

    return results.map((r: any) => ({
      date: r.date,
      count: parseInt(String(r.count), 10),
    }));
  }
}
