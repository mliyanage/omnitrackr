import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import {
  FileTracking,
  TrackingStatus,
  AlertType,
  FileTrackingQueryOptions,
  SLADashboardSummary,
  MissingFileAlert,
  TimeSeriesDataPoint,
  DirectionBreakdown,
  TopWatcherStats,
  PeriodComparison,
  PeriodStats,
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

    // Apply join if direction filter is needed
    if (options.direction) {
      query = query
        .join('watchers', 'file_tracking.watcher_id', 'watchers.id')
        .select('file_tracking.*');
    }

    // Apply filters with table-prefixed columns when join is present
    if (options.watcher_id) {
      query = query.where('file_tracking.watcher_id', options.watcher_id);
    }
    if (options.tracking_status) {
      query = query.where('file_tracking.tracking_status', options.tracking_status);
    }
    if (options.alert_triggered !== undefined) {
      query = query.where('file_tracking.alert_triggered', options.alert_triggered);
    }
    if (options.expected_from) {
      query = query.where('file_tracking.expected_at', '>=', options.expected_from);
    }
    if (options.expected_to) {
      query = query.where('file_tracking.expected_at', '<=', options.expected_to);
    }
    if (options.direction) {
      query = query.where('watchers.direction', options.direction);
    }

    // Get total count - need to clear select for count to work with joins
    const countQuery = query.clone();
    if (options.direction) {
      countQuery.clearSelect();
    }

    // Use COUNT(DISTINCT file_tracking.id) to avoid double-counting with joins
    const [{ count: total }] = await countQuery.countDistinct('file_tracking.id as count');
    const totalCount = parseInt(String(total), 10);

    // Get paginated data
    const data = await query
      .orderBy('file_tracking.expected_at', 'desc')
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
   * Get aggregated statistics with filters (efficient SQL aggregation)
   */
  async getAggregatedStats(options: FileTrackingQueryOptions): Promise<{
    total_expected: number;
    arrived_on_time: number;
    arrived_late: number;
    missing: number;
    pending: number;
    at_risk_count: number;
  }> {
    let query = this.db(this.tableName);

    // Apply join if direction or department filter is needed
    if (options.direction || (options.department_codes && options.department_codes.length > 0)) {
      query = query.join('watchers', 'file_tracking.watcher_id', 'watchers.id');
    }

    // Apply filters
    if (options.watcher_id) {
      query = query.where('file_tracking.watcher_id', options.watcher_id);
    }
    if (options.tracking_status) {
      query = query.where('file_tracking.tracking_status', options.tracking_status);
    }
    if (options.alert_triggered !== undefined) {
      query = query.where('file_tracking.alert_triggered', options.alert_triggered);
    }
    if (options.expected_from) {
      query = query.where('file_tracking.expected_at', '>=', options.expected_from);
    }
    if (options.expected_to) {
      query = query.where('file_tracking.expected_at', '<=', options.expected_to);
    }
    if (options.direction) {
      query = query.where('watchers.direction', options.direction);
    }
    if (options.department_codes && options.department_codes.length > 0) {
      query = query.whereIn('watchers.department_code', options.department_codes);
    }

    // Get counts by status using SQL aggregation
    const statusCounts = await query
      .select('tracking_status')
      .count('* as count')
      .groupBy('tracking_status');

    // Parse counts
    const counts = {
      pending: 0,
      arrived: 0,
      late: 0,
      missing: 0,
    };

    statusCounts.forEach((row: any) => {
      counts[row.tracking_status as keyof typeof counts] = parseInt(String(row.count), 10);
    });

    // Calculate arrived on time (arrived before SLA deadline)
    const onTimeQuery = this.db(this.tableName)
      .where('tracking_status', 'arrived')
      .whereRaw('arrived_at <= sla_deadline');

    // Apply same filters to on-time query
    if (options.direction || (options.department_codes && options.department_codes.length > 0)) {
      onTimeQuery.join('watchers', 'file_tracking.watcher_id', 'watchers.id');
    }
    if (options.watcher_id) {
      onTimeQuery.where('file_tracking.watcher_id', options.watcher_id);
    }
    if (options.expected_from) {
      onTimeQuery.where('file_tracking.expected_at', '>=', options.expected_from);
    }
    if (options.expected_to) {
      onTimeQuery.where('file_tracking.expected_at', '<=', options.expected_to);
    }
    if (options.direction) {
      onTimeQuery.where('watchers.direction', options.direction);
    }
    if (options.department_codes && options.department_codes.length > 0) {
      onTimeQuery.whereIn('watchers.department_code', options.department_codes);
    }
    if (options.alert_triggered !== undefined) {
      onTimeQuery.where('file_tracking.alert_triggered', options.alert_triggered);
    }

    const [{ count: onTimeCount }] = await onTimeQuery.count('* as count');
    const arrived_on_time = parseInt(String(onTimeCount), 10);

    // Calculate at-risk (pending within 30 mins of deadline)
    const now = new Date();
    const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    const atRiskQuery = this.db(this.tableName)
      .where('tracking_status', 'pending')
      .where('sla_deadline', '>', now.toISOString())
      .where('sla_deadline', '<=', thirtyMinsFromNow.toISOString());

    // Apply same filters to at-risk query
    if (options.direction) {
      atRiskQuery.join('watchers', 'file_tracking.watcher_id', 'watchers.id');
    }
    if (options.watcher_id) {
      atRiskQuery.where('file_tracking.watcher_id', options.watcher_id);
    }
    if (options.expected_from) {
      atRiskQuery.where('file_tracking.expected_at', '>=', options.expected_from);
    }
    if (options.expected_to) {
      atRiskQuery.where('file_tracking.expected_at', '<=', options.expected_to);
    }
    if (options.direction) {
      atRiskQuery.where('watchers.direction', options.direction);
    }
    if (options.alert_triggered !== undefined) {
      atRiskQuery.where('file_tracking.alert_triggered', options.alert_triggered);
    }

    const [{ count: atRiskCount }] = await atRiskQuery.count('* as count');
    const at_risk_count = parseInt(String(atRiskCount), 10);

    const total_expected = counts.pending + counts.arrived + counts.late + counts.missing;

    return {
      total_expected,
      arrived_on_time,
      arrived_late: counts.late,
      missing: counts.missing,
      pending: counts.pending,
      at_risk_count,
    };
  }

  /**
   * Get time-series statistics for dashboard charts
   */
  async getTimeSeriesStats(options: {
    from_date: Date;
    to_date: Date;
    watcher_id?: number;
    department_codes?: string[];
    direction?: 'inward' | 'outward' | 'bidirectional';
    bucket_size?: 'hour' | 'day';
  }): Promise<TimeSeriesDataPoint[]> {
    const bucketSize = options.bucket_size || 'day';
    let query = this.db('file_tracking')
      .select(
        this.db.raw(`DATE_TRUNC('${bucketSize}', expected_at) as time_bucket`),
        this.db.raw('COUNT(*) as total_expected'),
        this.db.raw("COUNT(*) FILTER (WHERE tracking_status = 'arrived') as arrived_on_time"),
        this.db.raw("COUNT(*) FILTER (WHERE tracking_status = 'late') as arrived_late"),
        this.db.raw("COUNT(*) FILTER (WHERE tracking_status = 'missing') as missing"),
        this.db.raw("COUNT(*) FILTER (WHERE tracking_status = 'pending') as pending")
      )
      .whereBetween('expected_at', [options.from_date, options.to_date]);

    // Join watchers if filtering by department or direction
    if (options.department_codes || options.direction) {
      query = query.join('watchers', 'file_tracking.watcher_id', 'watchers.id');
    }

    if (options.watcher_id) {
      query = query.where('file_tracking.watcher_id', options.watcher_id);
    }

    if (options.department_codes && options.department_codes.length > 0) {
      query = query.whereIn('watchers.department_code', options.department_codes);
    }

    if (options.direction) {
      query = query.where('watchers.direction', options.direction);
    }

    query = query
      .groupBy('time_bucket')
      .orderBy('time_bucket', 'asc');

    return query;
  }

  /**
   * Get file counts by direction with success rates
   */
  async getDirectionCounts(options: {
    from_date: Date;
    to_date: Date;
    watcher_id?: number;
    department_codes?: string[];
  }): Promise<DirectionBreakdown> {
    const query = this.db('file_tracking')
      .join('watchers', 'file_tracking.watcher_id', 'watchers.id')
      .whereBetween('file_tracking.expected_at', [options.from_date, options.to_date]);

    if (options.watcher_id) {
      query.where('file_tracking.watcher_id', options.watcher_id);
    }

    if (options.department_codes && options.department_codes.length > 0) {
      query.whereIn('watchers.department_code', options.department_codes);
    }

    const results = await query
      .select('watchers.direction')
      .count('* as total_count')
      .select(this.db.raw("COUNT(CASE WHEN file_tracking.tracking_status = 'arrived' THEN 1 END) as arrived_count"))
      .groupBy('watchers.direction');

    const breakdown = {
      inward: 0,
      inward_success_rate: 0,
      outward: 0,
      outward_success_rate: 0,
      total: 0,
    };

    results.forEach((row: any) => {
      const direction = row.direction as 'inward' | 'outward';
      const totalCount = parseInt(String(row.total_count), 10);
      const arrivedCount = parseInt(String(row.arrived_count || 0), 10);
      const successRate = totalCount > 0 ? (arrivedCount / totalCount) * 100 : 0;

      if (direction === 'inward') {
        breakdown.inward = totalCount;
        breakdown.inward_success_rate = successRate;
      } else if (direction === 'outward') {
        breakdown.outward = totalCount;
        breakdown.outward_success_rate = successRate;
      }

      breakdown.total += totalCount;
    });

    return breakdown;
  }

  /**
   * Get top watchers by file count for a period
   */
  async getTopWatchersByPeriod(options: {
    from_date: Date;
    to_date: Date;
    department_codes?: string[];
    direction?: 'inward' | 'outward' | 'bidirectional';
    limit?: number;
  }): Promise<TopWatcherStats[]> {
    const limit = options.limit || 5;

    let query = this.db('file_tracking')
      .join('watchers', 'file_tracking.watcher_id', 'watchers.id')
      .whereBetween('file_tracking.expected_at', [options.from_date, options.to_date]);

    if (options.department_codes && options.department_codes.length > 0) {
      query = query.whereIn('watchers.department_code', options.department_codes);
    }

    if (options.direction) {
      query = query.where('watchers.direction', options.direction);
    }

    const results = await query
      .select(
        'watchers.id as watcher_id',
        'watchers.name as watcher_name',
        'watchers.department_code',
        'watchers.direction',
        this.db.raw('COUNT(*) as total_files'),
        this.db.raw("COUNT(*) FILTER (WHERE file_tracking.tracking_status = 'arrived') as arrived_on_time"),
        this.db.raw("COUNT(*) FILTER (WHERE file_tracking.tracking_status = 'late') as arrived_late"),
        this.db.raw("COUNT(*) FILTER (WHERE file_tracking.tracking_status = 'missing') as missing"),
        this.db.raw("COUNT(*) FILTER (WHERE file_tracking.tracking_status = 'pending') as pending")
      )
      .groupBy('watchers.id', 'watchers.name', 'watchers.department_code', 'watchers.direction')
      .orderBy('total_files', 'desc')
      .limit(limit);

    return results.map((row: any) => ({
      watcher_id: row.watcher_id,
      watcher_name: row.watcher_name,
      department_code: row.department_code,
      direction: row.direction,
      total_files: parseInt(String(row.total_files), 10),
      arrived_on_time: parseInt(String(row.arrived_on_time), 10),
      arrived_late: parseInt(String(row.arrived_late), 10),
      missing: parseInt(String(row.missing), 10),
      pending: parseInt(String(row.pending), 10),
      success_rate: row.total_files > 0
        ? (parseInt(String(row.arrived_on_time), 10) / parseInt(String(row.total_files), 10)) * 100
        : 0,
    }));
  }

  /**
   * Get comparison between current and previous periods
   */
  async getPeriodComparison(options: {
    current_from: Date;
    current_to: Date;
    previous_from: Date;
    previous_to: Date;
    department_codes?: string[];
    direction?: 'inward' | 'outward' | 'bidirectional';
  }): Promise<PeriodComparison> {
    // Get stats for current period
    const current = await this.getAggregatedStats({
      expected_from: options.current_from,
      expected_to: options.current_to,
      department_codes: options.department_codes,
      direction: options.direction,
    });

    // Get stats for previous period
    const previous = await this.getAggregatedStats({
      expected_from: options.previous_from,
      expected_to: options.previous_to,
      department_codes: options.department_codes,
      direction: options.direction,
    });

    // Calculate percentage changes
    const total_expected_change = previous.total_expected > 0
      ? ((current.total_expected - previous.total_expected) / previous.total_expected) * 100
      : 0;

    const currentSuccessRate = (current.arrived_on_time / Math.max(current.total_expected, 1)) * 100;
    const previousSuccessRate = (previous.arrived_on_time / Math.max(previous.total_expected, 1)) * 100;
    const success_rate_change = currentSuccessRate - previousSuccessRate;

    return {
      current: {
        total_expected: current.total_expected,
        arrived_on_time: current.arrived_on_time,
        arrived_late: current.arrived_late,
        missing: current.missing,
        pending: current.pending,
        success_rate: currentSuccessRate,
      },
      previous: {
        total_expected: previous.total_expected,
        arrived_on_time: previous.arrived_on_time,
        arrived_late: previous.arrived_late,
        missing: previous.missing,
        pending: previous.pending,
        success_rate: previousSuccessRate,
      },
      changes: {
        total_expected_change,
        success_rate_change,
      },
    };
  }
}
