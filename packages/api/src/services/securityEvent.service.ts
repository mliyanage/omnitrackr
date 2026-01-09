import { Knex } from 'knex';
import { SecurityEventRepository, SecurityEvent } from '@omnitrackr/shared';
import { db } from '../config/database';

/**
 * Security Event Service
 * Handles logging and querying security events
 */
export class SecurityEventService {
  private securityEventRepo: SecurityEventRepository;

  constructor() {
    this.securityEventRepo = new SecurityEventRepository(db);
  }

  /**
   * Log a security event
   */
  async logEvent(data: {
    userId?: number;
    organizationId?: number;
    eventType: SecurityEvent['event_type'];
    severity?: SecurityEvent['severity'];
    description: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }): Promise<SecurityEvent> {
    // Determine severity based on event type if not provided
    let severity = data.severity;
    if (!severity) {
      severity = this.determineSeverity(data.eventType);
    }

    return this.securityEventRepo.log({
      user_id: data.userId,
      organization_id: data.organizationId,
      event_type: data.eventType,
      severity,
      description: data.description,
      metadata: data.metadata,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      device_fingerprint: data.deviceFingerprint,
    });
  }

  /**
   * Query security events with filters and pagination
   */
  async queryEvents(filters: {
    userId?: number;
    organizationId?: number;
    eventType?: SecurityEvent['event_type'];
    severity?: SecurityEvent['severity'];
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: SecurityEvent[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    // Parse dates if provided
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined;

    // Use general filter query with all filters
    return this.securityEventRepo.findWithFilters({
      userId: filters.userId,
      organizationId: filters.organizationId,
      eventType: filters.eventType,
      severity: filters.severity,
      dateFrom,
      dateTo,
      page: filters.page,
      limit: filters.limit,
    });
  }

  /**
   * Get critical security events
   */
  async getCriticalEvents(options?: {
    organizationId?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    data: SecurityEvent[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return this.securityEventRepo.findWithFilters({
      organizationId: options?.organizationId,
      severity: 'critical',
      page: options?.page,
      limit: options?.limit,
    });
  }

  /**
   * Get security events for a user
   */
  async getUserEvents(
    userId: number,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<SecurityEvent[]> {
    return this.securityEventRepo.findByUser(userId, {
      limit: options?.limit,
      offset: options?.page ? (options.page - 1) * (options.limit || 20) : undefined,
    });
  }

  /**
   * Get security event statistics
   */
  async getStatistics(filters: {
    organizationId?: number;
    userId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    totalEvents: number;
    byEventType: Record<string, number>;
    bySeverity: Record<string, number>;
    criticalCount: number;
    recentEvents: SecurityEvent[];
  }> {
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined;

    // Get total count
    const totalEvents = await this.securityEventRepo.countWithFilters({
      organizationId: filters.organizationId,
      userId: filters.userId,
      dateFrom,
      dateTo,
    });

    // Get critical count
    const criticalCount = await this.securityEventRepo.countWithFilters({
      organizationId: filters.organizationId,
      userId: filters.userId,
      severity: 'critical',
      dateFrom,
      dateTo,
    });

    // Get counts by event type
    const byEventTypeQuery = db('security_events')
      .select('event_type')
      .count('* as count')
      .groupBy('event_type')
      .orderBy('count', 'desc');

    if (filters.organizationId) {
      byEventTypeQuery.where({ organization_id: filters.organizationId });
    }
    if (filters.userId) {
      byEventTypeQuery.where({ user_id: filters.userId });
    }
    if (dateFrom && dateTo) {
      byEventTypeQuery.whereBetween('created_at', [dateFrom, dateTo]);
    }

    const byEventTypeResults = await byEventTypeQuery;
    const byEventType: Record<string, number> = {};
    byEventTypeResults.forEach((row: any) => {
      byEventType[row.event_type] = parseInt(String(row.count), 10);
    });

    // Get counts by severity
    const bySeverityQuery = db('security_events')
      .select('severity')
      .count('* as count')
      .groupBy('severity');

    if (filters.organizationId) {
      bySeverityQuery.where({ organization_id: filters.organizationId });
    }
    if (filters.userId) {
      bySeverityQuery.where({ user_id: filters.userId });
    }
    if (dateFrom && dateTo) {
      bySeverityQuery.whereBetween('created_at', [dateFrom, dateTo]);
    }

    const bySeverityResults = await bySeverityQuery;
    const bySeverity: Record<string, number> = {};
    bySeverityResults.forEach((row: any) => {
      bySeverity[row.severity] = parseInt(String(row.count), 10);
    });

    // Get recent events
    const recentEvents = await this.securityEventRepo.findWithFilters({
      organizationId: filters.organizationId,
      userId: filters.userId,
      dateFrom,
      dateTo,
      limit: 10,
      orderBy: 'created_at',
      orderDirection: 'desc',
    });

    return {
      totalEvents,
      byEventType,
      bySeverity,
      criticalCount,
      recentEvents: recentEvents.data,
    };
  }

  /**
   * Determine severity based on event type
   */
  private determineSeverity(eventType: SecurityEvent['event_type']): SecurityEvent['severity'] {
    const criticalEvents: SecurityEvent['event_type'][] = [
      'login_locked',
      'account_suspended',
      'account_deactivated',
      'suspicious_activity',
    ];

    const warningEvents: SecurityEvent['event_type'][] = [
      'login_failed',
      '2fa_failed',
      '2fa_disabled',
      'permission_denied',
    ];

    if (criticalEvents.includes(eventType)) {
      return 'critical';
    }

    if (warningEvents.includes(eventType)) {
      return 'warning';
    }

    return 'info';
  }
}
