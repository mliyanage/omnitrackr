import { Request, Response, NextFunction } from 'express';
import { WatcherService } from '../services/watcher.service';
import { CreateWatcherRequest, UpdateWatcherRequest } from '@omnitrackr/shared';

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
   */
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        page,
        limit,
        source_connection_id,
        schedule_id,
        department_code,
        status,
        direction,
      } = req.query;

      const result = await this.service.getAll(
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
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const watcher = await this.service.getWithRelations(Number(id));

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
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createRequest: CreateWatcherRequest = req.body;
      const createdBy = 'system'; // TODO: Get from JWT

      const watcher = await this.service.create(createRequest, createdBy);

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
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updateRequest: UpdateWatcherRequest = req.body;
      const updatedBy = 'system'; // TODO: Get from JWT

      const watcher = await this.service.update(Number(id), updateRequest, updatedBy);

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
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.delete(Number(id));

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
   */
  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const watcher = await this.service.updateStatus(Number(id), status);

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
   */
  getActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const watchers = await this.service.getActive();

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
   */
  getByConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { connectionId } = req.params;
      const watchers = await this.service.getByConnection(Number(connectionId));

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
   */
  getByDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { departmentCode } = req.params;
      const watchers = await this.service.getByDepartment(departmentCode);

      res.status(200).json({
        success: true,
        data: watchers,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const watcherController = new WatcherController();
