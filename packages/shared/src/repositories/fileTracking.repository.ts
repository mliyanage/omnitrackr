import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import {
  FileTracking,
  TrackingStatus,
  AlertType,
  FileTrackingQueryOptions,
  SLADashboardSummary,
  MissingFileAlert,
} from '../types';

/**
 * File Tracking Repository
 * Handles all database operations for file_tracking table
 */
export class FileTrackingRepository extends BaseRepository {
  protected get tableName(): string {
    return 'file_tracking';
  }

  /**
   * Find by watcher
   */
  async findByWatcherId(watcherId: number, limit: number = 100): Promise<FileTracking[]> {
    return this.db(this.tableName)
      .where({ watcher_id: watcherId })
      .orderBy('expected_at', 'desc')
      .limit(limit);
  }

  /**
   * Find pending expectations
   */
  async findPending(): Promise<FileTracking[]> {
    return this.db(this.tableName)
      .where({ tracking_status: 'pending' as TrackingStatus })
      .orderBy('expected_at', 'asc');
  }

  /**
   * Find overdue (past SLA deadline, still pending)
   */
  async findOverdue(): Promise<FileTracking[]> {
    return this.db(this.tableName)
      .where({ tracking_status: 'pending' as TrackingStatus })
      .where('sla_deadline', '<', new Date())
      .orderBy('sla_deadline', 'asc');
  }

  /**
   * Find at risk (approaching SLA deadline)
   */
  async findAtRisk(withinMinutes: number = 30): Promise<FileTracking[]> {
    const riskTime = new Date();
    riskTime.setMinutes(riskTime.getMinutes() + withinMinutes);

    return this.db(this.tableName)
      .where({ tracking_status: 'pending' as TrackingStatus })
      .where('sla_deadline', '>', new Date())
      .where('sla_deadline', '<=', riskTime)
      .orderBy('sla_deadline', 'asc');
  }

  /**
   * Create expected file tracking record
   */
  async createExpectedFile(data: {
    watcher_id: number;
    expected_pattern: string;
    expected_at: Date;
    expected_schedule?: string;
    sla_threshold_minutes: number;
    sla_deadline: Date;
  }): Promise<FileTracking> {
    const [result] = await this.db(this.tableName)
      .insert({
        ...data,
        tracking_status: 'pending',
        alert_triggered: false,
      })
      .returning('*');
    return result;
  }

  /**
   * Mark file as arrived
   */
  async markArrived(
    id: number,
    data: {
      file_path: string;
      file_name: string;
      file_size?: number;
      arrived_at: Date;
    }
  ): Promise<void> {
    const record = await this.findById<FileTracking>(id);
    if (!record) return;

    const isLate = data.arrived_at > record.sla_deadline;

    await this.db(this.tableName)
      .where({ id })
      .update({
        ...data,
        tracking_status: isLate ? 'late' : 'arrived',
        alert_triggered: isLate,
        alert_triggered_at: isLate ? this.db.fn.now() : null,
        alert_type: isLate ? 'sla_breached' : 'file_arrived',
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Mark as arrived with custom status
   */
  async markAsArrived(
    id: number,
    data: {
      file_path: string;
      file_name: string;
      file_size: number;
      arrived_at: Date;
      tracking_status: TrackingStatus;
    }
  ): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        ...data,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Mark as missing (called by scheduler after deadline)
   */
  async markMissing(id: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        tracking_status: 'missing',
        alert_triggered: true,
        alert_triggered_at: this.db.fn.now(),
        alert_type: 'sla_breached',
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Alias for markMissing
   */
  async markAsMissing(id: number): Promise<void> {
    return this.markMissing(id);
  }

  /**
   * Trigger alert for a tracking record
   */
  async triggerAlert(id: number, alertType: AlertType): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        alert_triggered: true,
        alert_triggered_at: this.db.fn.now(),
        alert_type: alertType,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Trigger at-risk alert
   */
  async triggerAtRiskAlert(id: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        alert_triggered: true,
        alert_triggered_at: this.db.fn.now(),
        alert_type: 'sla_at_risk',
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Get SLA dashboard summary
   */
  async getSLASummary(
    periodStart: Date,
    periodEnd: Date,
    watcherId?: number
  ): Promise<SLADashboardSummary> {
    let query = this.db(this.tableName)
      .whereBetween('expected_at', [periodStart, periodEnd]);

    if (watcherId) {
      query = query.where({ watcher_id: watcherId });
    }

    const result = await query
      .select(
        this.db.raw('COUNT(*) as total_expected'),
        this.db.raw("COUNT(*) FILTER (WHERE tracking_status = 'arrived') as arrived_on_time"),
        this.db.raw("COUNT(*) FILTER (WHERE tracking_status = 'late') as arrived_late"),
        this.db.raw("COUNT(*) FILTER (WHERE tracking_status = 'missing') as missing"),
        this.db.raw("COUNT(*) FILTER (WHERE tracking_status = 'pending') as pending")
      )
      .first();

    const total = parseInt(result.total_expected, 10);
    const onTime = parseInt(result.arrived_on_time, 10);

    // Get at-risk count
    const atRiskResult = await this.db(this.tableName)
      .where({ tracking_status: 'pending' as TrackingStatus })
      .where('sla_deadline', '>', new Date())
      .where('sla_deadline', '<=', new Date(Date.now() + 30 * 60 * 1000))
      .count('* as count')
      .first();

    return {
      period_start: periodStart,
      period_end: periodEnd,
      total_expected: total,
      arrived_on_time: onTime,
      arrived_late: parseInt(result.arrived_late, 10),
      missing: parseInt(result.missing, 10),
      pending: parseInt(result.pending, 10),
      on_time_percentage: total > 0 ? (onTime / total) * 100 : 100,
      at_risk_count: parseInt(String(atRiskResult?.count || 0), 10),
    };
  }

  /**
   * Get missing file alerts
   */
  async getMissingFileAlerts(
    watcherId?: number,
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<MissingFileAlert[] | FileTracking[]> {
    let query = this.db(this.tableName);

    if (watcherId) {
      query = query.where({ watcher_id: watcherId });
    }

    if (periodStart) {
      query = query.where('expected_at', '>=', periodStart);
    }

    if (periodEnd) {
      query = query.where('expected_at', '<=', periodEnd);
    }

    // If no watcher specified, return full alerts with joins
    if (!watcherId) {
      const results = await query
        .join('watchers', 'file_tracking.watcher_id', 'watchers.id')
        .whereIn('file_tracking.tracking_status', ['missing', 'pending'])
        .where('file_tracking.sla_deadline', '<', new Date())
        .select(
          'file_tracking.id as file_tracking_id',
          'file_tracking.watcher_id',
          'watchers.name as watcher_name',
          'watchers.department_code',
          'file_tracking.expected_pattern',
          'file_tracking.expected_at',
          'file_tracking.sla_deadline',
          'file_tracking.alert_type',
          this.db.raw(
            "EXTRACT(EPOCH FROM (NOW() - file_tracking.sla_deadline)) / 60 as minutes_overdue"
          )
        )
        .orderBy('file_tracking.sla_deadline', 'asc');

      return results.map((r: any) => ({
        ...r,
        minutes_overdue: Math.round(r.minutes_overdue),
        alert_type: r.alert_type || 'sla_breached',
      }));
    }

    // If watcher specified, return simple FileTracking records
    return query
      .whereIn('tracking_status', ['missing'])
      .orderBy('expected_at', 'desc');
  }

  /**
   * Find with query options
   */
  async findWithOptions(options: FileTrackingQueryOptions): Promise<{
    data: FileTracking[];
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
    if (options.tracking_status) {
      query = query.where({ tracking_status: options.tracking_status });
    }
    if (options.alert_triggered !== undefined) {
      query = query.where({ alert_triggered: options.alert_triggered });
    }
    if (options.expected_from) {
      query = query.where('expected_at', '>=', options.expected_from);
    }
    if (options.expected_to) {
      query = query.where('expected_at', '<=', options.expected_to);
    }

    // Get total count
    const [{ count: total }] = await query.clone().count('* as count');
    const totalCount = parseInt(String(total), 10);

    // Get paginated data
    const data = await query
      .orderBy('expected_at', 'desc')
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
}
