import { Knex } from 'knex';
import { BaseRepository } from './base.repository';

/**
 * Security Event data type
 */
export interface SecurityEvent {
  id: number;
  user_id?: number;
  organization_id?: number;
  event_type:
    | 'login_success'
    | 'login_failed'
    | 'login_locked'
    | 'logout'
    | 'password_changed'
    | 'password_reset_requested'
    | 'password_reset_completed'
    | '2fa_enabled'
    | '2fa_disabled'
    | '2fa_failed'
    | 'email_verified'
    | 'account_created'
    | 'account_suspended'
    | 'account_deactivated'
    | 'permission_denied'
    | 'suspicious_activity';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  created_at: Date;
}

/**
 * Security Event Repository
 * Handles database operations for security events
 */
export class SecurityEventRepository extends BaseRepository {
  protected get tableName(): string {
    return 'security_events';
  }

  /**
   * Find security events by user
   */
  async findByUser(userId: number, options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  }): Promise<SecurityEvent[]> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const orderBy = options?.orderBy || 'created_at';
    const orderDirection = options?.orderDirection || 'desc';

    return this.db(this.tableName)
      .where({ user_id: userId })
      .orderBy(orderBy, orderDirection)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Find security events by type
   */
  async findByType(
    eventType: SecurityEvent['event_type'],
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    }
  ): Promise<SecurityEvent[]> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const orderBy = options?.orderBy || 'created_at';
    const orderDirection = options?.orderDirection || 'desc';

    return this.db(this.tableName)
      .where({ event_type: eventType })
      .orderBy(orderBy, orderDirection)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Find critical security events
   */
  async findCriticalEvents(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  }): Promise<SecurityEvent[]> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const orderBy = options?.orderBy || 'created_at';
    const orderDirection = options?.orderDirection || 'desc';

    return this.db(this.tableName)
      .where({ severity: 'critical' })
      .orderBy(orderBy, orderDirection)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Find security events by date range
   */
  async findByDateRange(
    dateFrom: Date,
    dateTo: Date,
    options?: {
      userId?: number;
      organizationId?: number;
      eventType?: SecurityEvent['event_type'];
      severity?: SecurityEvent['severity'];
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    }
  ): Promise<SecurityEvent[]> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const orderBy = options?.orderBy || 'created_at';
    const orderDirection = options?.orderDirection || 'desc';

    let query = this.db(this.tableName)
      .whereBetween('created_at', [dateFrom, dateTo]);

    if (options?.userId) {
      query = query.where({ user_id: options.userId });
    }

    if (options?.organizationId) {
      query = query.where({ organization_id: options.organizationId });
    }

    if (options?.eventType) {
      query = query.where({ event_type: options.eventType });
    }

    if (options?.severity) {
      query = query.where({ severity: options.severity });
    }

    return query
      .orderBy(orderBy, orderDirection)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Log a security event
   */
  async log(data: Omit<SecurityEvent, 'id' | 'created_at'>): Promise<SecurityEvent> {
    return this.create<SecurityEvent>(data);
  }

  /**
   * Count security events with filters
   */
  async countWithFilters(filters: {
    userId?: number;
    organizationId?: number;
    eventType?: SecurityEvent['event_type'];
    severity?: SecurityEvent['severity'];
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<number> {
    let query = this.db(this.tableName).count('* as count');

    if (filters.userId) {
      query = query.where({ user_id: filters.userId });
    }

    if (filters.organizationId) {
      query = query.where({ organization_id: filters.organizationId });
    }

    if (filters.eventType) {
      query = query.where({ event_type: filters.eventType });
    }

    if (filters.severity) {
      query = query.where({ severity: filters.severity });
    }

    if (filters.dateFrom && filters.dateTo) {
      query = query.whereBetween('created_at', [filters.dateFrom, filters.dateTo]);
    }

    const [{ count }] = await query;
    return parseInt(String(count), 10);
  }

  /**
   * Get security events with advanced filtering and pagination
   */
  async findWithFilters(filters: {
    userId?: number;
    organizationId?: number;
    eventType?: SecurityEvent['event_type'];
    severity?: SecurityEvent['severity'];
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  }): Promise<{
    data: SecurityEvent[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    const orderBy = filters.orderBy || 'created_at';
    const orderDirection = filters.orderDirection || 'desc';

    let query = this.db(this.tableName);

    if (filters.userId) {
      query = query.where({ user_id: filters.userId });
    }

    if (filters.organizationId) {
      query = query.where({ organization_id: filters.organizationId });
    }

    if (filters.eventType) {
      query = query.where({ event_type: filters.eventType });
    }

    if (filters.severity) {
      query = query.where({ severity: filters.severity });
    }

    if (filters.dateFrom && filters.dateTo) {
      query = query.whereBetween('created_at', [filters.dateFrom, filters.dateTo]);
    }

    // Get total count
    const [{ count: total }] = await query.clone().count('* as count');
    const totalCount = parseInt(String(total), 10);

    // Get paginated data
    const data = await query
      .orderBy(orderBy, orderDirection)
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
