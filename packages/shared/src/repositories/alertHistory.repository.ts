import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import {
  AlertHistory,
  AlertHistoryQueryOptions,
  DeliveryStatus,
  AlertHistoryWithDetails,
} from '../types';

/**
 * Alert History Repository
 * Handles all database operations for alert_history table
 */
export class AlertHistoryRepository extends BaseRepository {
  protected get tableName(): string {
    return 'alert_history';
  }

  /**
   * Create alert record
   */
  async createAlertRecord(
    data: Partial<AlertHistory>
  ): Promise<AlertHistory> {
    return this.create<AlertHistory>(data);
  }

  /**
   * Find pending escalations
   * Returns alerts that need to be escalated (unacknowledged past delay time)
   */
  async findPendingEscalations(currentTime: Date): Promise<any[]> {
    return this.db(this.tableName)
      .select(
        `${this.tableName}.*`,
        'alert_escalations.delay_minutes',
        'alert_escalations.id as escalation_id'
      )
      .join(
        'alert_configs',
        `${this.tableName}.alert_config_id`,
        'alert_configs.id'
      )
      .join(
        'alert_escalations',
        'alert_configs.id',
        'alert_escalations.alert_config_id'
      )
      .where(`${this.tableName}.acknowledged`, false)
      .whereIn(`${this.tableName}.delivery_status`, [
        'delivered',
        'partially_delivered',
      ])
      .whereNull('alert_escalations.deleted_at')
      .whereRaw(
        `alert_escalations.escalation_level = ${this.tableName}.escalation_level + 1`
      )
      .whereRaw(
        `${this.tableName}.created_at + (alert_escalations.delay_minutes * interval '1 minute') <= ?`,
        [currentTime]
      );
  }

  /**
   * Find pending retries
   * Returns failed alerts that should be retried
   */
  async findPendingRetries(
    currentTime: Date,
    limit: number = 100
  ): Promise<AlertHistory[]> {
    return this.db(this.tableName)
      .where('delivery_status', 'failed')
      .where('retry_count', '<', this.db.raw('max_retries'))
      .where('next_retry_at', '<=', currentTime)
      .orderBy('priority', 'asc')
      .orderBy('next_retry_at', 'asc')
      .limit(limit);
  }

  /**
   * Acknowledge alert
   */
  async acknowledge(
    id: number,
    userId: number,
    note?: string
  ): Promise<void> {
    await this.db(this.tableName).where({ id }).update({
      acknowledged: true,
      acknowledged_at: this.db.fn.now(),
      acknowledged_by: userId,
      acknowledgment_note: note,
      updated_at: this.db.fn.now(),
    });
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    id: number,
    status: DeliveryStatus,
    deliveryDetails?: Record<string, any>
  ): Promise<void> {
    const updates: any = {
      delivery_status: status,
      delivery_attempts: this.db.raw('delivery_attempts + 1'),
      last_delivery_attempt: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    };

    if (status === 'delivered' || status === 'partially_delivered') {
      updates.delivered_at = this.db.fn.now();
    }

    if (deliveryDetails) {
      updates.delivery_details = deliveryDetails;
    }

    await this.db(this.tableName).where({ id }).update(updates);
  }

  /**
   * Update retry information
   */
  async updateRetryInfo(id: number, nextRetryAt: Date): Promise<void> {
    await this.db(this.tableName).where({ id }).update({
      retry_count: this.db.raw('retry_count + 1'),
      next_retry_at: nextRetryAt,
      updated_at: this.db.fn.now(),
    });
  }

  /**
   * Find with filters and pagination
   */
  async findWithFilters(
    options: AlertHistoryQueryOptions
  ): Promise<{
    data: AlertHistoryWithDetails[];
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

    let query = this.db(this.tableName)
      .select(
        `${this.tableName}.*`,
        'watchers.name as watcher_name',
        'watchers.department_code',
        'file_tracking.expected_pattern',
        'file_tracking.expected_at',
        'file_tracking.sla_deadline',
        'users.first_name as ack_by_first_name',
        'users.last_name as ack_by_last_name',
        'users.email as ack_by_email'
      )
      .leftJoin('watchers', `${this.tableName}.watcher_id`, 'watchers.id')
      .leftJoin(
        'file_tracking',
        `${this.tableName}.file_tracking_id`,
        'file_tracking.id'
      )
      .leftJoin('users', `${this.tableName}.acknowledged_by`, 'users.id');

    // Apply filters
    if (options.watcher_id) {
      query = query.where(`${this.tableName}.watcher_id`, options.watcher_id);
    }
    if (options.alert_type) {
      query = query.where(`${this.tableName}.alert_type`, options.alert_type);
    }
    if (options.delivery_status) {
      query = query.where(
        `${this.tableName}.delivery_status`,
        options.delivery_status
      );
    }
    if (options.acknowledged !== undefined) {
      query = query.where(
        `${this.tableName}.acknowledged`,
        options.acknowledged
      );
    }
    if (options.from_date) {
      query = query.where(
        `${this.tableName}.created_at`,
        '>=',
        options.from_date
      );
    }
    if (options.to_date) {
      query = query.where(
        `${this.tableName}.created_at`,
        '<=',
        options.to_date
      );
    }

    // Count total
    const countQuery = query.clone().clearSelect().count('* as count');
    const [{ count }] = await countQuery;
    const total = Number(count);

    // Get paginated data
    const rows = await query
      .orderBy(`${this.tableName}.created_at`, 'desc')
      .limit(limit)
      .offset(offset);

    // Transform rows to include nested objects
    const data: AlertHistoryWithDetails[] = rows.map((row: any) => ({
      ...row,
      watcher: row.watcher_name
        ? {
            id: row.watcher_id,
            name: row.watcher_name,
            department_code: row.department_code,
          }
        : undefined,
      file_tracking: row.expected_pattern
        ? {
            expected_pattern: row.expected_pattern,
            expected_at: row.expected_at,
            sla_deadline: row.sla_deadline,
          }
        : undefined,
      acknowledged_by_user:
        row.ack_by_first_name && row.acknowledged_by
          ? {
              id: row.acknowledged_by,
              first_name: row.ack_by_first_name,
              last_name: row.ack_by_last_name,
              email: row.ack_by_email,
            }
          : undefined,
    }));

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

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<any> {
    const stats = await this.db(this.tableName)
      .select([
        this.db.raw('COUNT(*) as total_alerts'),
        this.db.raw(
          'COUNT(*) FILTER (WHERE acknowledged = true) as acknowledged_alerts'
        ),
        this.db.raw(
          'COUNT(*) FILTER (WHERE acknowledged = false) as pending_alerts'
        ),
        this.db.raw(
          "COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed_deliveries"
        ),
        this.db.raw(`
          AVG(
            EXTRACT(EPOCH FROM (acknowledged_at - created_at)) / 60
          ) FILTER (WHERE acknowledged = true) as avg_ack_time_minutes
        `),
      ])
      .first();

    const alertsByType = await this.db(this.tableName)
      .select('alert_type')
      .count('* as count')
      .groupBy('alert_type');

    const alertsByWatcher = await this.db(this.tableName)
      .select(
        'watchers.id as watcher_id',
        'watchers.name as watcher_name',
        this.db.raw('COUNT(*) as count')
      )
      .join('watchers', `${this.tableName}.watcher_id`, 'watchers.id')
      .groupBy('watchers.id', 'watchers.name')
      .orderBy('count', 'desc')
      .limit(10);

    return {
      ...stats,
      alerts_by_type: alertsByType.reduce(
        (acc, row) => ({ ...acc, [row.alert_type]: Number(row.count) }),
        {}
      ),
      alerts_by_watcher: alertsByWatcher,
    };
  }
}
