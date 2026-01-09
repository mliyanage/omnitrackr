import { Request, Response, NextFunction } from 'express';
import { WatcherService } from '../services/watcher.service';
import { CreateWatcherRequest, UpdateWatcherRequest } from '@omnitrackr/shared';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { addOrganizationFilter, addDepartmentFilter } from '../middleware/authorization.middleware';

/**
 * Watcher Controller
 * Handles HTTP requests for watcher management
 */
export class WatcherController {
  private service: WatcherService;

  constructor() {
    this.service = new WatcherService();
  }

  /**
   * GET /api/watchers
   * List watchers with organization and department filtering
   */
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const {
        page,
        limit,
        source_connection_id,
        schedule_id,
        department_code,
        status,
        direction,
      } = req.query;

      // Apply organization and department filters
      const orgFilter = addOrganizationFilter(authReq);
      const deptFilter = addDepartmentFilter(authReq);

      const result = await this.service.getAll(
        authReq,
        Number(page) || 1,
        Number(limit) || 20,
        {
          source_connection_id: source_connection_id ? Number(source_connection_id) : undefined,
          schedule_id: schedule_id ? Number(schedule_id) : undefined,
          department_code: department_code as string,
          status: status as any,
          direction: direction as any,
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
   * GET /api/watchers/:id
   * Get watcher by ID with authorization check
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const watcher = await this.service.getWithRelations(authReq, Number(id));

      res.status(200).json({
        success: true,
        data: watcher,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/watchers
   * Create watcher with authorization validation
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const createRequest: CreateWatcherRequest = req.body;
      const createdBy = authReq.user.id.toString();

      const watcher = await this.service.create(authReq, createRequest, createdBy);

      res.status(201).json({
        success: true,
        data: watcher,
        message: 'Watcher created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/watchers/:id
   * Update watcher with authorization validation
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const updateRequest: UpdateWatcherRequest = req.body;
      const updatedBy = authReq.user.id.toString();

      const watcher = await this.service.update(authReq, Number(id), updateRequest, updatedBy);

      res.status(200).json({
        success: true,
        data: watcher,
        message: 'Watcher updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/watchers/:id
   * Delete watcher with authorization validation
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      await this.service.delete(authReq, Number(id));

      res.status(200).json({
        success: true,
        message: 'Watcher deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/watchers/:id/status
   * Update watcher status with authorization validation
   */
  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const { status } = req.body;

      const watcher = await this.service.updateStatus(authReq, Number(id), status);

      res.status(200).json({
        success: true,
        data: watcher,
        message: `Watcher status updated to ${status}`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/watchers/active
   * Get active watchers with organization filtering
   */
  getActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const watchers = await this.service.getActive(authReq);

      res.status(200).json({
        success: true,
        data: watchers,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/watchers/by-connection/:connectionId
   * Get watchers by connection with organization filtering
   */
  getByConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { connectionId } = req.params;
      const watchers = await this.service.getByConnection(authReq, Number(connectionId));

      res.status(200).json({
        success: true,
        data: watchers,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/watchers/by-department/:departmentCode
   * Get watchers by department with authorization validation
   */
  getByDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { departmentCode } = req.params;
      const watchers = await this.service.getByDepartment(authReq, departmentCode);

      res.status(200).json({
        success: true,
        data: watchers,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/watchers/:id/files
   * List files from source for manual override with authorization
   */
  listFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const files = await this.service.listFiles(authReq, Number(id));

      res.status(200).json({
        success: true,
        data: files,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/watchers/:id/poll
   * Trigger manual poll for a watcher with authorization
   */
  triggerPoll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const result = await this.service.triggerPoll(authReq, Number(id));

      res.status(200).json({
        success: true,
        data: result,
        message: 'Poll triggered successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const watcherController = new WatcherController();
