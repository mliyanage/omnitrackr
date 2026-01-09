import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import { SecurityEventService } from '../services/securityEvent.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../utils/errors';

/**
 * Audit Controller
 * Handles HTTP requests for audit logs and security events
 * Only accessible to owner and super_admin roles
 */
export class AuditController {
  private auditService: AuditService;
  private securityEventService: SecurityEventService;

  constructor() {
    this.auditService = new AuditService();
    this.securityEventService = new SecurityEventService();
  }

  /**
   * GET /api/audit/logs
   * Query audit logs with filters
   */
  queryAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;

      // Parse query parameters
      const {
        user_id,
        resource_type,
        resource_id,
        action,
        date_from,
        date_to,
        page = '1',
        limit = '20',
      } = req.query;

      // Build filters
      const filters: any = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      // Validate pagination
      if (filters.page < 1 || filters.limit < 1 || filters.limit > 100) {
        throw new ValidationError('Invalid pagination parameters');
      }

      // Super admin can query all organizations
      // Owner can only query their own organization
      if (authReq.user.role !== 'super_admin') {
        filters.organizationId = authReq.user.organizationId;
      }

      // Add optional filters
      if (user_id) {
        filters.userId = parseInt(user_id as string, 10);
      }

      if (resource_type) {
        filters.resourceType = resource_type as string;
      }

      if (resource_id) {
        filters.resourceId = resource_id as string;
      }

      if (action) {
        if (!['create', 'update', 'delete', 'read'].includes(action as string)) {
          throw new ValidationError('Invalid action filter');
        }
        filters.action = action as string;
      }

      if (date_from) {
        filters.dateFrom = date_from as string;
      }

      if (date_to) {
        filters.dateTo = date_to as string;
      }

      // Query audit logs
      const result = await this.auditService.queryLogs(filters);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/audit/logs/stats
   * Get audit log statistics
   */
  getAuditStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;

      // Parse query parameters
      const { user_id, date_from, date_to } = req.query;

      // Build filters
      const filters: any = {};

      // Super admin can query all organizations
      // Owner can only query their own organization
      if (authReq.user.role !== 'super_admin') {
        filters.organizationId = authReq.user.organizationId;
      }

      if (user_id) {
        filters.userId = parseInt(user_id as string, 10);
      }

      if (date_from) {
        filters.dateFrom = date_from as string;
      }

      if (date_to) {
        filters.dateTo = date_to as string;
      }

      // Get statistics
      const stats = await this.auditService.getStatistics(filters);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/audit/security-events
   * Query security events with filters
   */
  querySecurityEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;

      // Parse query parameters
      const {
        user_id,
        event_type,
        severity,
        date_from,
        date_to,
        page = '1',
        limit = '20',
      } = req.query;

      // Build filters
      const filters: any = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      // Validate pagination
      if (filters.page < 1 || filters.limit < 1 || filters.limit > 100) {
        throw new ValidationError('Invalid pagination parameters');
      }

      // Super admin can query all organizations
      // Owner can only query their own organization
      if (authReq.user.role !== 'super_admin') {
        filters.organizationId = authReq.user.organizationId;
      }

      // Add optional filters
      if (user_id) {
        filters.userId = parseInt(user_id as string, 10);
      }

      if (event_type) {
        filters.eventType = event_type as string;
      }

      if (severity) {
        if (!['info', 'warning', 'critical'].includes(severity as string)) {
          throw new ValidationError('Invalid severity filter');
        }
        filters.severity = severity as string;
      }

      if (date_from) {
        filters.dateFrom = date_from as string;
      }

      if (date_to) {
        filters.dateTo = date_to as string;
      }

      // Query security events
      const result = await this.securityEventService.queryEvents(filters);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/audit/security-events/critical
   * Get critical security events
   */
  getCriticalEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;

      // Parse query parameters
      const { page = '1', limit = '20' } = req.query;

      const options: any = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      // Validate pagination
      if (options.page < 1 || options.limit < 1 || options.limit > 100) {
        throw new ValidationError('Invalid pagination parameters');
      }

      // Super admin can query all organizations
      // Owner can only query their own organization
      if (authReq.user.role !== 'super_admin') {
        options.organizationId = authReq.user.organizationId;
      }

      // Get critical events
      const result = await this.securityEventService.getCriticalEvents(options);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/audit/security-events/stats
   * Get security event statistics
   */
  getSecurityStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;

      // Parse query parameters
      const { user_id, date_from, date_to } = req.query;

      // Build filters
      const filters: any = {};

      // Super admin can query all organizations
      // Owner can only query their own organization
      if (authReq.user.role !== 'super_admin') {
        filters.organizationId = authReq.user.organizationId;
      }

      if (user_id) {
        filters.userId = parseInt(user_id as string, 10);
      }

      if (date_from) {
        filters.dateFrom = date_from as string;
      }

      if (date_to) {
        filters.dateTo = date_to as string;
      }

      // Get statistics
      const stats = await this.securityEventService.getStatistics(filters);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
