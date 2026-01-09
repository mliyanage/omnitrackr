import { Knex } from 'knex';
import { BaseRepository } from './base.repository';

/**
 * Audit Log data type
 */
export interface AuditLog {
  id: number;
  user_id?: number;
  organization_id?: number;
  action: 'create' | 'update' | 'delete' | 'read';
  resource_type: string;
  resource_id: string;
  changes?: {
    old?: any;
    new?: any;
  };
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  created_at: Date;
}

/**
 * Audit Log Repository
 * Handles database operations for audit logs
 */
export class AuditLogRepository extends BaseRepository {
  protected get tableName(): string {
    return 'audit_logs';
  }

  /**
   * Find audit logs by user
   */
  async findByUser(userId: number, options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  }): Promise<AuditLog[]> {
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
   * Find audit logs by organization
   */
  async findByOrganization(organizationId: number, options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  }): Promise<AuditLog[]> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const orderBy = options?.orderBy || 'created_at';
    const orderDirection = options?.orderDirection || 'desc';

    return this.db(this.tableName)
      .where({ organization_id: organizationId })
      .orderBy(orderBy, orderDirection)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Find audit logs by resource
   */
  async findByResource(
    resourceType: string,
    resourceId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    }
  ): Promise<AuditLog[]> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const orderBy = options?.orderBy || 'created_at';
    const orderDirection = options?.orderDirection || 'desc';

    return this.db(this.tableName)
      .where({
        resource_type: resourceType,
        resource_id: resourceId,
      })
      .orderBy(orderBy, orderDirection)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Find audit logs by date range
   */
  async findByDateRange(
    dateFrom: Date,
    dateTo: Date,
    options?: {
      userId?: number;
      organizationId?: number;
      resourceType?: string;
      action?: string;
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    }
  ): Promise<AuditLog[]> {
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

    if (options?.resourceType) {
      query = query.where({ resource_type: options.resourceType });
    }

    if (options?.action) {
      query = query.where({ action: options.action });
    }

    return query
      .orderBy(orderBy, orderDirection)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Log an audit entry
   */
  async log(data: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
    return this.create<AuditLog>(data);
  }

  /**
   * Count audit logs with filters
   */
  async countWithFilters(filters: {
    userId?: number;
    organizationId?: number;
    resourceType?: string;
    action?: string;
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

    if (filters.resourceType) {
      query = query.where({ resource_type: filters.resourceType });
    }

    if (filters.action) {
      query = query.where({ action: filters.action });
    }

    if (filters.dateFrom && filters.dateTo) {
      query = query.whereBetween('created_at', [filters.dateFrom, filters.dateTo]);
    }

    const [{ count }] = await query;
    return parseInt(String(count), 10);
  }

  /**
   * Get audit logs with advanced filtering and pagination
   */
  async findWithFilters(filters: {
    userId?: number;
    organizationId?: number;
    resourceType?: string;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  }): Promise<{
    data: AuditLog[];
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

    if (filters.resourceType) {
      query = query.where({ resource_type: filters.resourceType });
    }

    if (filters.action) {
      query = query.where({ action: filters.action });
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
