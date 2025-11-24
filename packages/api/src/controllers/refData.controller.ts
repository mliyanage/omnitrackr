import { Request, Response, NextFunction } from 'express';
import { RefDataService } from '../services/refData.service';
import { CreateRefDataRequest, UpdateRefDataRequest } from '@omnitrackr/shared';

/**
 * Reference Data Controller
 * Handles HTTP requests for reference data management
 */
export class RefDataController {
  private service: RefDataService;

  constructor() {
    this.service = new RefDataService();
  }

  /**
   * GET /api/ref-data
   */
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, code_prefix } = req.query;

      const result = await this.service.getAll({
        code_prefix: code_prefix as string,
        page: Number(page) || 1,
        limit: Number(limit) || 100,
      });

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
   * GET /api/ref-data/code/:code
   */
  getByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const refData = await this.service.getByCode(code);

      res.status(200).json({
        success: true,
        data: refData,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/ref-data/prefix/:prefix
   */
  getByPrefix = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prefix } = req.params;
      const data = await this.service.getByPrefix(prefix);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/ref-data
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createRequest: CreateRefDataRequest = req.body;
      const createdBy = 'system'; // TODO: Get from JWT

      const refData = await this.service.create(createRequest, createdBy);

      res.status(201).json({
        success: true,
        data: refData,
        message: 'Reference data created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/ref-data/code/:code
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const updateRequest: UpdateRefDataRequest = req.body;
      const updatedBy = 'system'; // TODO: Get from JWT

      const refData = await this.service.update(code, updateRequest, updatedBy);

      res.status(200).json({
        success: true,
        data: refData,
        message: 'Reference data updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/ref-data/code/:code
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      await this.service.delete(code);

      res.status(200).json({
        success: true,
        message: 'Reference data deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // Convenience endpoints

  /**
   * GET /api/ref-data/departments
   */
  getDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const departments = await this.service.getDepartments();

      res.status(200).json({
        success: true,
        data: departments,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/ref-data/timezones
   */
  getTimezones = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const timezones = await this.service.getTimezones();

      res.status(200).json({
        success: true,
        data: timezones,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/ref-data/holidays/:calendarCode
   */
  getHolidays = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { calendarCode } = req.params;
      const holidays = await this.service.getHolidays(calendarCode);

      res.status(200).json({
        success: true,
        data: holidays,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/ref-data/sla-thresholds
   */
  getSLAThresholds = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thresholds = await this.service.getSLAThresholds();

      res.status(200).json({
        success: true,
        data: thresholds,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/ref-data/categories
   */
  getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.service.getCategories();

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/ref-data/search
   */
  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = req.query;

      if (!q) {
        res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
        return;
      }

      const results = await this.service.search(q as string);

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const refDataController = new RefDataController();
