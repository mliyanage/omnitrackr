import { Request, Response, NextFunction } from 'express';
import { AlertService } from '../services/alert.service';
import {
  CreateAlertConfigRequest,
  UpdateAlertConfigRequest,
  CreateRecipientGroupRequest,
  UpdateRecipientGroupRequest,
  CreateEscalationRequest,
  UpdateEscalationRequest,
  CreateAlertCommentRequest,
} from '@omnitrackr/shared';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Alert Controller
 * Handles HTTP requests for SLA breach alert management
 */
export class AlertController {
  private service: AlertService;

  constructor() {
    this.service = new AlertService();
  }

  // ==================== Alert Configs ====================

  /**
   * GET /api/alerts/configs
   */
  getAllConfigs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const configs = await this.service.getAllConfigs(
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        data: configs,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/alerts/configs/:id
   */
  getConfigById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const config = await this.service.getConfigById(
        Number(id),
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/alerts/configs
   */
  createConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const createRequest: CreateAlertConfigRequest = req.body;

      const config = await this.service.createAlertConfig(
        authReq.user.organizationId!,
        createRequest,
        authReq.user.id
      );

      res.status(201).json({
        success: true,
        data: config,
        message: 'Alert configuration created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/alerts/configs/:id
   */
  updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const updateRequest: UpdateAlertConfigRequest = req.body;

      const config = await this.service.updateAlertConfig(
        Number(id),
        authReq.user.organizationId!,
        updateRequest,
        authReq.user.id
      );

      res.status(200).json({
        success: true,
        data: config,
        message: 'Alert configuration updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/alerts/configs/:id
   */
  deleteConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      await this.service.deleteAlertConfig(
        Number(id),
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        message: 'Alert configuration deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Recipient Groups ====================

  /**
   * GET /api/alerts/recipient-groups
   */
  getAllRecipientGroups = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const groups = await this.service.getAllRecipientGroups(
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/alerts/recipient-groups/:id
   */
  getRecipientGroupById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const group = await this.service.getRecipientGroupById(
        Number(id),
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/alerts/recipient-groups
   */
  createRecipientGroup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const createRequest: CreateRecipientGroupRequest = req.body;

      const group = await this.service.createRecipientGroup(
        authReq.user.organizationId!,
        createRequest,
        authReq.user.id
      );

      res.status(201).json({
        success: true,
        data: group,
        message: 'Recipient group created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/alerts/recipient-groups/:id
   */
  updateRecipientGroup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const updateRequest: UpdateRecipientGroupRequest = req.body;

      const group = await this.service.updateRecipientGroup(
        Number(id),
        authReq.user.organizationId!,
        updateRequest,
        authReq.user.id
      );

      res.status(200).json({
        success: true,
        data: group,
        message: 'Recipient group updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/alerts/recipient-groups/:id
   */
  deleteRecipientGroup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      await this.service.deleteRecipientGroup(
        Number(id),
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        message: 'Recipient group deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Escalations ====================

  /**
   * GET /api/alerts/configs/:configId/escalations
   */
  getEscalations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { configId } = req.params;

      const escalations = await this.service.getEscalations(
        Number(configId),
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        data: escalations,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/alerts/escalations
   */
  createEscalation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const createRequest: CreateEscalationRequest = req.body;

      const escalation = await this.service.createEscalation(
        authReq.user.organizationId!,
        createRequest
      );

      res.status(201).json({
        success: true,
        data: escalation,
        message: 'Escalation created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/alerts/escalations/:id
   */
  updateEscalation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const updateRequest: UpdateEscalationRequest = req.body;

      const escalation = await this.service.updateEscalation(
        Number(id),
        authReq.user.organizationId!,
        updateRequest
      );

      res.status(200).json({
        success: true,
        data: escalation,
        message: 'Escalation updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/alerts/escalations/:id
   */
  deleteEscalation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      await this.service.deleteEscalation(
        Number(id),
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        message: 'Escalation deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Alert History ====================

  /**
   * GET /api/alerts/history
   */
  getAlertHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const {
        watcher_id,
        alert_type,
        delivery_status,
        acknowledged,
        from_date,
        to_date,
        page,
        limit,
      } = req.query;

      const result = await this.service.getAlertHistory(
        authReq.user.organizationId!,
        {
          watcher_id: watcher_id ? Number(watcher_id) : undefined,
          alert_type: alert_type as any,
          delivery_status: delivery_status as any,
          acknowledged:
            acknowledged === 'true'
              ? true
              : acknowledged === 'false'
              ? false
              : undefined,
          from_date: from_date ? new Date(from_date as string) : undefined,
          to_date: to_date ? new Date(to_date as string) : undefined,
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 50,
        }
      );

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
   * GET /api/alerts/history/:id
   */
  getAlertHistoryById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      const alert = await this.service.getAlertHistoryById(
        Number(id),
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/alerts/history/:id/acknowledge
   */
  acknowledgeAlert = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const { acknowledgment_note } = req.body;

      await this.service.acknowledgeAlert(
        Number(id),
        authReq.user.id,
        authReq.user.organizationId!,
        acknowledgment_note
      );

      res.status(200).json({
        success: true,
        message: 'Alert acknowledged successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Comments ====================

  /**
   * GET /api/alerts/history/:id/comments
   */
  getAlertComments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      const comments = await this.service.getAlertComments(
        Number(id),
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/alerts/history/:id/comments
   */
  addAlertComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const createRequest: CreateAlertCommentRequest = req.body;

      const comment = await this.service.addAlertComment(
        Number(id),
        authReq.user.id,
        authReq.user.organizationId!,
        createRequest
      );

      res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment added successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Statistics ====================

  /**
   * GET /api/alerts/stats
   */
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const stats = await this.service.getDashboardStats(
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const alertController = new AlertController();
