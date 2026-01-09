import { Request, Response, NextFunction } from 'express';
import {
  OrganizationService,
  CreateOrganizationRequest,
} from '../services/organization.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UnauthorizedError } from '../utils/errors';

/**
 * Admin Controller
 * Handles HTTP requests for super admin operations
 */
export class AdminController {
  private service: OrganizationService;

  constructor() {
    this.service = new OrganizationService();
  }

  /**
   * POST /api/admin/organizations
   * Create organization with owner (super admin only)
   */
  createOrganization = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const createRequest: CreateOrganizationRequest = req.body;

      // Check if user is super admin
      // For now, we'll check if user has role 'super_admin'
      // In production, implement proper super admin check
      if (authReq.user.role !== 'super_admin') {
        throw new UnauthorizedError(
          'Only super administrators can create organizations'
        );
      }

      const result = await this.service.createWithOwner(createRequest);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Organization created successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const adminController = new AdminController();
