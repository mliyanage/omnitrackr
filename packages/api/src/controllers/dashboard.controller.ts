import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

/**
 * Dashboard Controller
 * Handles HTTP requests for dashboard analytics
 */
export class DashboardController {
  private service: DashboardService;

  constructor() {
    this.service = new DashboardService();
  }

  /**
   * GET /api/dashboard/summary
   * Get comprehensive dashboard summary with all metrics
   */
  getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from_date, to_date, department_codes, direction } = req.query;

      // Validate required params
      if (!from_date || !to_date) {
        return res.status(400).json({
          success: false,
          message: 'from_date and to_date are required',
        });
      }

      // Parse department_codes (can be comma-separated string or array)
      let departmentCodesArray: string[] | undefined;
      if (department_codes) {
        if (typeof department_codes === 'string') {
          departmentCodesArray = department_codes.split(',').map(d => d.trim());
        } else if (Array.isArray(department_codes)) {
          departmentCodesArray = department_codes as string[];
        }
      }

      const summary = await this.service.getDashboardSummary({
        from_date: from_date as string,
        to_date: to_date as string,
        department_codes: departmentCodesArray,
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
}

// Export a singleton instance
export const dashboardController = new DashboardController();
