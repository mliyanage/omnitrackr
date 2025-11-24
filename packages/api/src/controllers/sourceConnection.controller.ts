import { Request, Response, NextFunction } from 'express';
import { SourceConnectionService } from '../services/sourceConnection.service';
import {
  CreateSourceConnectionRequest,
  UpdateSourceConnectionRequest,
  TestSourceConnectionRequest,
} from '@omnitrackr/shared';

/**
 * Source Connection Controller
 * Handles HTTP requests for source connection management
 */
export class SourceConnectionController {
  private service: SourceConnectionService;

  constructor() {
    this.service = new SourceConnectionService();
  }

  /**
   * GET /api/source-connections
   */
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, type, connection_status, enabled } = req.query;

      const result = await this.service.getAll(
        Number(page) || 1,
        Number(limit) || 20,
        {
          type: type as any,
          connection_status: connection_status as any,
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
   * GET /api/source-connections/:id
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const connection = await this.service.getById(Number(id));

      res.status(200).json({
        success: true,
        data: connection,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/source-connections/test
   */
  testConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const testRequest: TestSourceConnectionRequest = req.body;
      const result = await this.service.testConnection(testRequest);

      res.status(200).json({
        success: result.success,
        data: result,
        message: result.success ? 'Connection test successful' : 'Connection test failed',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/source-connections
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createRequest: CreateSourceConnectionRequest = req.body;
      const createdBy = 'system'; // TODO: Get from JWT

      const connection = await this.service.create(createRequest, createdBy);

      res.status(201).json({
        success: true,
        data: connection,
        message: 'Source connection created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/source-connections/:id
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updateRequest: UpdateSourceConnectionRequest = req.body;
      const updatedBy = 'system'; // TODO: Get from JWT

      const connection = await this.service.update(Number(id), updateRequest, updatedBy);

      res.status(200).json({
        success: true,
        data: connection,
        message: 'Source connection updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/source-connections/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.delete(Number(id));

      res.status(200).json({
        success: true,
        message: 'Source connection deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/source-connections/:id/health-check
   */
  checkHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.service.checkHealth(Number(id));

      res.status(200).json({
        success: true,
        data: result,
        message: `Connection health: ${result.connection_status}`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/source-connections/:id/toggle
   */
  toggleEnabled = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      const connection = await this.service.toggleEnabled(Number(id), enabled);

      res.status(200).json({
        success: true,
        data: connection,
        message: `Source connection ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const sourceConnectionController = new SourceConnectionController();
