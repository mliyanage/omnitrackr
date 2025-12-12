import { Request, Response, NextFunction } from 'express';
import { FileTrackingService } from '../services/fileTracking.service';
import { FileTrackingQueryOptions } from '@omnitrackr/shared';

/**
 * File Tracking Controller
 * Handles HTTP requests for file tracking operations
 */
export class FileTrackingController {
  private service: FileTrackingService;

  constructor() {
    this.service = new FileTrackingService();
  }

  /**
   * GET /api/file-tracking
   * Get all file tracking records with filters and pagination
   */
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        watcher_id,
        tracking_status,
        alert_triggered,
        expected_from,
        expected_to,
        direction,
        page,
        limit,
      } = req.query;

      const options: FileTrackingQueryOptions = {
        watcher_id: watcher_id ? Number(watcher_id) : undefined,
        tracking_status: tracking_status as any,
        alert_triggered: alert_triggered === 'true' ? true : alert_triggered === 'false' ? false : undefined,
        expected_from: expected_from ? new Date(expected_from as string) : undefined,
        expected_to: expected_to ? new Date(expected_to as string) : undefined,
        direction: direction as 'inward' | 'outward' | 'bidirectional' | undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      };

      const result = await this.service.getFileTracking(options);

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
   * GET /api/file-tracking/:id
   * Get a single file tracking record by ID
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const record = await this.service.getFileTrackingById(Number(id));

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'File tracking record not found',
        });
      }

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/file-tracking/summary
   * Get SLA dashboard summary with all filters
   */
  getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        from_date,
        to_date,
        watcher_id,
        tracking_status,
        alert_triggered,
        direction,
      } = req.query;

      const summary = await this.service.getSLASummary({
        from_date: from_date as string,
        to_date: to_date as string,
        watcher_id: watcher_id ? Number(watcher_id) : undefined,
        tracking_status: tracking_status as 'pending' | 'arrived' | 'late' | 'missing' | undefined,
        alert_triggered: alert_triggered === 'true' ? true : alert_triggered === 'false' ? false : undefined,
        direction: direction as 'inward' | 'outward' | 'bidirectional' | undefined,
      });

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/file-tracking/alerts
   * Get missing file alerts
   */
  getAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { watcher_id, from_date, to_date } = req.query;

      const alerts = await this.service.getMissingFileAlerts(
        watcher_id ? Number(watcher_id) : undefined,
        from_date ? new Date(from_date as string) : undefined,
        to_date ? new Date(to_date as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/file-tracking/:id/mark-arrived
   * Manually mark a file tracking record as arrived
   */
  markAsArrived = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { file_path, file_name, file_size, arrived_at } = req.body;

      // Validate required fields
      if (!file_path || !file_name || !file_size || !arrived_at) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: file_path, file_name, file_size, arrived_at',
        });
      }

      const updatedRecord = await this.service.markFileAsArrived(
        Number(id),
        {
          file_path,
          file_name,
          file_size: Number(file_size),
          arrived_at: new Date(arrived_at),
        }
      );

      res.status(200).json({
        success: true,
        data: updatedRecord,
        message: 'File tracking record updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

// Export a singleton instance
export const fileTrackingController = new FileTrackingController();
