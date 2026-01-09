import { Knex } from 'knex';
import { AuditLogRepository, AuditLog } from '@omnitrackr/shared';
import { db } from '../config/database';

/**
 * Audit Service
 * Handles querying audit logs with various filters
 */
export class AuditService {
  private auditLogRepo: AuditLogRepository;

  constructor() {
    this.auditLogRepo = new AuditLogRepository(db);
  }

  /**
   * Query audit logs with filters and pagination
   */
  async queryLogs(filters: {
    userId?: number;
    organizationId?: number;
    resourceType?: string;
    resourceId?: string;
    action?: 'create' | 'update' | 'delete' | 'read';
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: AuditLog[];
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
    return this.auditLogRepo.findWithFilters({
      userId: filters.userId,
      organizationId: filters.organizationId,
      resourceType: filters.resourceType,
      action: filters.action,
      dateFrom,
      dateTo,
      page: filters.page,
      limit: filters.limit,
    });
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceHistory(
    resourceType: string,
    resourceId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<AuditLog[]> {
    return this.auditLogRepo.findByResource(resourceType, resourceId, {
      limit: options?.limit,
      offset: options?.page ? (options.page - 1) * (options.limit || 20) : undefined,
    });
  }

  /**
   * Get audit logs for a user
   */
  async getUserActivity(
    userId: number,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<AuditLog[]> {
    return this.auditLogRepo.findByUser(userId, {
      limit: options?.limit,
      offset: options?.page ? (options.page - 1) * (options.limit || 20) : undefined,
    });
  }

  /**
   * Get audit logs for an organization
   */
  async getOrganizationActivity(
    organizationId: number,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<AuditLog[]> {
    return this.auditLogRepo.findByOrganization(organizationId, {
      limit: options?.limit,
      offset: options?.page ? (options.page - 1) * (options.limit || 20) : undefined,
    });
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(filters: {
    organizationId?: number;
    userId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    totalLogs: number;
    byAction: Record<string, number>;
    byResourceType: Record<string, number>;
    recentActivity: AuditLog[];
  }> {
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined;

    // Get total count
    const totalLogs = await this.auditLogRepo.countWithFilters({
      organizationId: filters.organizationId,
      userId: filters.userId,
      dateFrom,
      dateTo,
    });

    // Get counts by action
    const byActionQuery = db('audit_logs')
      .select('action')
      .count('* as count')
      .groupBy('action');

    if (filters.organizationId) {
      byActionQuery.where({ organization_id: filters.organizationId });
    }
    if (filters.userId) {
      byActionQuery.where({ user_id: filters.userId });
    }
    if (dateFrom && dateTo) {
      byActionQuery.whereBetween('created_at', [dateFrom, dateTo]);
    }

    const byActionResults = await byActionQuery;
    const byAction: Record<string, number> = {};
    byActionResults.forEach((row: any) => {
      byAction[row.action] = parseInt(String(row.count), 10);
    });

    // Get counts by resource type
    const byResourceTypeQuery = db('audit_logs')
      .select('resource_type')
      .count('* as count')
      .groupBy('resource_type')
      .orderBy('count', 'desc')
      .limit(10);

    if (filters.organizationId) {
      byResourceTypeQuery.where({ organization_id: filters.organizationId });
    }
    if (filters.userId) {
      byResourceTypeQuery.where({ user_id: filters.userId });
    }
    if (dateFrom && dateTo) {
      byResourceTypeQuery.whereBetween('created_at', [dateFrom, dateTo]);
    }

    const byResourceTypeResults = await byResourceTypeQuery;
    const byResourceType: Record<string, number> = {};
    byResourceTypeResults.forEach((row: any) => {
      byResourceType[row.resource_type] = parseInt(String(row.count), 10);
    });

    // Get recent activity
    const recentActivity = await this.auditLogRepo.findWithFilters({
      organizationId: filters.organizationId,
      userId: filters.userId,
      dateFrom,
      dateTo,
      limit: 10,
      orderBy: 'created_at',
      orderDirection: 'desc',
    });

    return {
      totalLogs,
      byAction,
      byResourceType,
      recentActivity: recentActivity.data,
    };
  }
}
