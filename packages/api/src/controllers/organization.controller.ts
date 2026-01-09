import { Request, Response, NextFunction } from 'express';
import {
  OrganizationService,
  UpdateOrganizationRequest,
} from '../services/organization.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UnauthorizedError } from '../utils/errors';

/**
 * Organization Controller
 * Handles HTTP requests for organization management
 */
export class OrganizationController {
  private service: OrganizationService;

  constructor() {
    this.service = new OrganizationService();
  }

  /**
   * GET /api/organizations/:id
   * Get organization details
   */
  getOrganization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      // Users can only view their own organization
      if (authReq.user.organizationId !== Number(id)) {
        throw new UnauthorizedError('You can only view your own organization');
      }

      const organization = await this.service.getWithStats(Number(id));

      res.status(200).json({
        success: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/organizations/:id
   * Update organization (owner only)
   */
  updateOrganization = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const updateRequest: UpdateOrganizationRequest = req.body;

      // Only owners can update organization
      if (authReq.user.role !== 'owner') {
        throw new UnauthorizedError(
          'Only organization owners can update organization details'
        );
      }

      // Users can only update their own organization
      if (authReq.user.organizationId !== Number(id)) {
        throw new UnauthorizedError('You can only update your own organization');
      }

      const organization = await this.service.update(
        Number(id),
        updateRequest,
        authReq.user.id
      );

      res.status(200).json({
        success: true,
        data: organization,
        message: 'Organization updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const organizationController = new OrganizationController();
