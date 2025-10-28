import { Request, Response, NextFunction } from 'express';
import { FileSourceService } from '../services/fileSource.service';
import { CreateS3FileSourceRequest, TestConnectionRequest } from '@omnitrackr/shared';

/**
 * File Source Controller
 * Handles HTTP requests for file source management
 */
export class FileSourceController {
  private service: FileSourceService;

  constructor() {
    this.service = new FileSourceService();
  }

  /**
   * GET /api/file-sources
   * Get all file sources with pagination
   */
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, department } = req.query;

      const result = await this.service.getAll(
        Number(page) || 1,
        Number(limit) || 20,
        department as string | undefined
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
   * GET /api/file-sources/:id
   * Get a single file source by ID
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const fileSource = await this.service.getById(Number(id));

      res.status(200).json({
        success: true,
        data: fileSource,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/file-sources/s3/test-connection
   * Test S3 connection before creating file source
   */
  testS3Connection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const testRequest: TestConnectionRequest = req.body;
      const result = await this.service.testS3Connection(testRequest);

      res.status(200).json({
        success: result.success,
        data: result,
        message: result.success
          ? 'Connection test successful'
          : 'Connection test failed',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/file-sources/s3
   * Create a new S3 file source
   */
  createS3 = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createRequest: CreateS3FileSourceRequest = req.body;

      // TODO: Get user from JWT token
      const createdBy = 'system'; // req.user?.userId;

      const fileSource = await this.service.createS3FileSource(createRequest, createdBy);

      res.status(201).json({
        success: true,
        data: fileSource,
        message: 'File source created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/file-sources/:id
   * Update a file source
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // TODO: Get user from JWT token
      const updatedBy = 'system'; // req.user?.userId;

      const fileSource = await this.service.update(Number(id), updates, updatedBy);

      res.status(200).json({
        success: true,
        data: fileSource,
        message: 'File source updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/file-sources/:id
   * Delete a file source
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.delete(Number(id));

      res.status(200).json({
        success: true,
        message: 'File source deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/file-sources/:id/toggle
   * Enable/disable a file source
   */
  toggleEnabled = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      const fileSource = await this.service.toggleEnabled(Number(id), enabled);

      res.status(200).json({
        success: true,
        data: fileSource,
        message: `File source ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/file-sources/:id/statistics
   * Get file source statistics
   * TODO: Implement once InwardFileRepository is created
   */
  // getStatistics = async (req: Request, res: Response, next: NextFunction) => {
  //   try {
  //     const { id } = req.params;
  //     const statistics = await this.service.getStatistics(Number(id));
  //
  //     res.status(200).json({
  //       success: true,
  //       data: statistics,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // };
}

// Export singleton instance
export const fileSourceController = new FileSourceController();
