import { Request, Response, NextFunction } from 'express';
import { ScheduleService } from '../services/schedule.service';
import {
  CreateScheduleRequest,
  UpdateScheduleRequest,
  CreateScheduleExclusionRequest,
} from '@omnitrackr/shared';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Schedule Controller
 * Handles HTTP requests for schedule management
 * Schedules are shared resources across organizations
 */
export class ScheduleController {
  private service: ScheduleService;

  constructor() {
    this.service = new ScheduleService();
  }

  /**
   * GET /api/schedules
   */
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, frequency_type, enabled } = req.query;

      const result = await this.service.getAll(
        Number(page) || 1,
        Number(limit) || 20,
        {
          frequency_type: frequency_type as any,
          enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
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
   * GET /api/schedules/:id
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const schedule = await this.service.getWithExclusions(Number(id));

      res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/schedules
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const createRequest: CreateScheduleRequest = req.body;
      const createdBy = authReq.user.id.toString();

      const schedule = await this.service.create(createRequest, createdBy);

      res.status(201).json({
        success: true,
        data: schedule,
        message: 'Schedule created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/schedules/:id
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const updateRequest: UpdateScheduleRequest = req.body;
      const updatedBy = authReq.user.id.toString();

      const schedule = await this.service.update(Number(id), updateRequest, updatedBy);

      res.status(200).json({
        success: true,
        data: schedule,
        message: 'Schedule updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/schedules/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.delete(Number(id));

      res.status(200).json({
        success: true,
        message: 'Schedule deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/schedules/:id/toggle
   */
  toggleEnabled = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      const schedule = await this.service.toggleEnabled(Number(id), enabled);

      res.status(200).json({
        success: true,
        data: schedule,
        message: `Schedule ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/schedules/active
   */
  getActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schedules = await this.service.getActive();

      res.status(200).json({
        success: true,
        data: schedules,
      });
    } catch (error) {
      next(error);
    }
  };

  // Exclusion endpoints

  /**
   * GET /api/schedules/:id/exclusions
   */
  getExclusions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const exclusions = await this.service.getExclusions(Number(id));

      res.status(200).json({
        success: true,
        data: exclusions,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/schedules/:id/exclusions
   */
  addExclusion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const exclusionRequest: Omit<CreateScheduleExclusionRequest, 'schedule_id'> = req.body;
      const createdBy = authReq.user.id.toString();

      const exclusion = await this.service.addExclusion(
        { ...exclusionRequest, schedule_id: Number(id) },
        createdBy
      );

      res.status(201).json({
        success: true,
        data: exclusion,
        message: 'Exclusion added successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/schedules/exclusions/:exclusionId
   */
  deleteExclusion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { exclusionId } = req.params;
      await this.service.deleteExclusion(Number(exclusionId));

      res.status(200).json({
        success: true,
        message: 'Exclusion deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const scheduleController = new ScheduleController();
