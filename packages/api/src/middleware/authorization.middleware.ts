import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { ForbiddenError } from '../utils/errors';

/**
 * Authorization Middleware
 * Enforces role-based access control and tenant isolation
 */

/**
 * Check if user has required role
 * @param allowedRoles - Array of roles that are allowed
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authenticatedReq = req as AuthenticatedRequest;

    if (!authenticatedReq.user) {
      throw new ForbiddenError('User not authenticated');
    }

    if (!allowedRoles.includes(authenticatedReq.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role: ${allowedRoles.join(' or ')}`
      );
    }

    next();
  };
}

/**
 * Check if user is super admin
 */
export function requireSuperAdmin() {
  return requireRole('super_admin');
}

/**
 * Check if user is owner (organization admin)
 */
export function requireOwner() {
  return requireRole('owner');
}

/**
 * Check if user is owner or super admin
 */
export function requireOwnerOrSuperAdmin() {
  return requireRole('owner', 'super_admin');
}

/**
 * Check if user is editor or above (owner, editor)
 */
export function requireEditor() {
  return requireRole('owner', 'editor');
}

/**
 * Verify user belongs to the same organization as the resource
 * @param getOrganizationId - Function to extract organization ID from request
 */
export function requireSameOrganization(
  getOrganizationId: (req: AuthenticatedRequest) => number | null | Promise<number | null>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;

      // Super admin can access all organizations
      if (authenticatedReq.user.role === 'super_admin') {
        return next();
      }

      const resourceOrgId = await getOrganizationId(authenticatedReq);

      // If resource has no organization (null), it's a shared resource
      if (resourceOrgId === null) {
        return next();
      }

      // Check if user belongs to the same organization
      if (authenticatedReq.user.organizationId !== resourceOrgId) {
        throw new ForbiddenError('Access denied. Resource belongs to a different organization.');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Verify user has access to the specified department
 * Only applies to editor/viewer roles
 */
export function requireDepartmentAccess(
  getDepartmentId: (req: AuthenticatedRequest) => number | null | Promise<number | null>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;

      // Owner and super admin have access to all departments
      if (['owner', 'super_admin'].includes(authenticatedReq.user.role)) {
        return next();
      }

      const departmentId = await getDepartmentId(authenticatedReq);

      // If resource has no department, allow access
      if (departmentId === null) {
        return next();
      }

      // Check if user has access to this department
      if (!authenticatedReq.user.departmentIds.includes(departmentId)) {
        throw new ForbiddenError(
          'Access denied. You do not have access to this department.'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Filter query results by user's organization
 * Adds organization_id filter to queries for non-super-admin users
 */
export function addOrganizationFilter(
  req: AuthenticatedRequest
): { organization_id?: number } {
  // Super admin sees all organizations
  if (req.user.role === 'super_admin') {
    return {};
  }

  // All other users only see their organization
  return {
    organization_id: req.user.organizationId || undefined,
  };
}

/**
 * Filter query results by user's departments
 * Adds department_id filter for editor/viewer users
 */
export function addDepartmentFilter(
  req: AuthenticatedRequest
): { department_id?: number[] } | Record<string, never> {
  // Owner and super admin see all departments
  if (['owner', 'super_admin'].includes(req.user.role)) {
    return {};
  }

  // Editor/viewer only see their assigned departments
  if (req.user.departmentIds.length === 0) {
    // User has no department assignments - return filter that matches nothing
    return { department_id: [-1] };
  }

  return {
    department_id: req.user.departmentIds,
  };
}

/**
 * Check if user can modify resource
 * - Super admin: can modify anything
 * - Owner: can modify within their organization
 * - Editor: can modify within their departments
 * - Viewer: cannot modify
 */
export function canModifyResource(
  req: AuthenticatedRequest,
  resourceOrgId: number | null,
  resourceDeptId?: number | null
): boolean {
  const { role, organizationId, departmentIds } = req.user;

  // Viewer cannot modify
  if (role === 'viewer') {
    return false;
  }

  // Super admin can modify anything
  if (role === 'super_admin') {
    return true;
  }

  // Check organization access
  if (resourceOrgId !== null && organizationId !== resourceOrgId) {
    return false;
  }

  // Owner can modify anything in their organization
  if (role === 'owner') {
    return true;
  }

  // Editor can modify within their departments
  if (role === 'editor') {
    if (resourceDeptId === null || resourceDeptId === undefined) {
      return true; // No department restriction
    }
    return departmentIds.includes(resourceDeptId);
  }

  return false;
}

/**
 * Ensure user can only create resources in their organization
 */
export function validateOrganizationId(req: AuthenticatedRequest, organizationId: number): void {
  // Super admin can create in any organization
  if (req.user.role === 'super_admin') {
    return;
  }

  // All other users can only create in their own organization
  if (req.user.organizationId !== organizationId) {
    throw new ForbiddenError('Cannot create resources in a different organization');
  }
}

/**
 * Ensure user can only assign departments they have access to
 */
export function validateDepartmentIds(req: AuthenticatedRequest, departmentIds: number[]): void {
  // Owner and super admin can assign any department
  if (['owner', 'super_admin'].includes(req.user.role)) {
    return;
  }

  // Editor/viewer can only assign departments they have access to
  for (const deptId of departmentIds) {
    if (!req.user.departmentIds.includes(deptId)) {
      throw new ForbiddenError(`No access to department ID: ${deptId}`);
    }
  }
}
