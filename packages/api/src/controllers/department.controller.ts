import { Request, Response, NextFunction } from 'express';
import {
  DepartmentService,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from '../services/department.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UnauthorizedError } from '../utils/errors';

/**
 * Department Controller
 * Handles HTTP requests for department management
 */
export class DepartmentController {
  private service: DepartmentService;

  constructor() {
    this.service = new DepartmentService();
  }

  /**
   * GET /api/departments
   * List departments
   * - Owners see all departments in organization
   * - Editors/viewers see only assigned departments
   */
  listDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { activeOnly } = req.query;

      let departments;

      if (authReq.user.role === 'owner') {
        // Owners see all departments
        departments = await this.service.getByOrganization(
          authReq.user.organizationId!,
          activeOnly === 'true'
        );
      } else {
        // Editors/viewers see only assigned departments
        departments = await this.service.getUserDepartments(authReq.user.id);
      }

      res.status(200).json({
        success: true,
        data: departments,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/departments/:id
   * Get department by ID
   */
  getDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      const department = await this.service.getById(Number(id));

      // Check authorization
      if (department.organization_id !== authReq.user.organizationId) {
        throw new UnauthorizedError('Department belongs to different organization');
      }

      // If not owner, check if user has access to this department
      if (authReq.user.role !== 'owner') {
        if (!authReq.user.departmentIds.includes(department.id)) {
          throw new UnauthorizedError('You do not have access to this department');
        }
      }

      res.status(200).json({
        success: true,
        data: department,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/departments
   * Create new department (owner only)
   */
  createDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const createRequest: CreateDepartmentRequest = req.body;

      // Only owners can create departments
      if (authReq.user.role !== 'owner') {
        throw new UnauthorizedError('Only organization owners can create departments');
      }

      const department = await this.service.create(
        createRequest,
        authReq.user.organizationId!,
        authReq.user.id
      );

      res.status(201).json({
        success: true,
        data: department,
        message: 'Department created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/departments/:id
   * Update department (owner only)
   */
  updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const updateRequest: UpdateDepartmentRequest = req.body;

      // Only owners can update departments
      if (authReq.user.role !== 'owner') {
        throw new UnauthorizedError('Only organization owners can update departments');
      }

      const department = await this.service.update(
        Number(id),
        updateRequest,
        authReq.user.id
      );

      res.status(200).json({
        success: true,
        data: department,
        message: 'Department updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/departments/:id
   * Delete department (owner only)
   */
  deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      // Only owners can delete departments
      if (authReq.user.role !== 'owner') {
        throw new UnauthorizedError('Only organization owners can delete departments');
      }

      await this.service.delete(Number(id));

      res.status(200).json({
        success: true,
        message: 'Department deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const departmentController = new DepartmentController();
