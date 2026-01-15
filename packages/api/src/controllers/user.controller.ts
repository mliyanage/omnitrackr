import { Request, Response, NextFunction } from 'express';
import { UserService, InviteUserRequest, UpdateUserRequest, AcceptInvitationRequest } from '../services/user.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UnauthorizedError } from '../utils/errors';
import { db } from '../config/database';

/**
 * User Controller
 * Handles HTTP requests for user management
 */
export class UserController {
  private service: UserService;

  constructor() {
    this.service = new UserService();
  }

  /**
   * GET /api/users
   * List all users in organization (owner only)
   */
  listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;

      // Only owners can list all users
      if (authReq.user.role !== 'owner') {
        throw new UnauthorizedError('Only organization owners can list all users');
      }

      const users = await this.service.getUsersByOrganization(
        authReq.user.organizationId!
      );

      // Map phone_number to phone for frontend compatibility
      const mappedUsers = users.map((user: any) => {
        const { phone_number, ...rest } = user;
        return { ...rest, phone: phone_number };
      });

      res.status(200).json({
        success: true,
        data: mappedUsers,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/users/:id
   * Get user by ID
   */
  getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      const user = await this.service.getById(Number(id));

      // Check authorization - owners can see all, others can only see themselves
      if (authReq.user.role !== 'owner' && authReq.user.id !== user.id) {
        throw new UnauthorizedError('You can only view your own profile');
      }

      // Ensure user belongs to same organization
      if (user.organization_id !== authReq.user.organizationId) {
        throw new UnauthorizedError('User belongs to different organization');
      }

      // Map phone_number to phone for frontend compatibility
      const { phone_number, ...rest } = user as any;
      const mappedUser = { ...rest, phone: phone_number };

      res.status(200).json({
        success: true,
        data: mappedUser,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/users/invite
   * Invite a new user to organization
   */
  inviteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const inviteRequest: InviteUserRequest = req.body;

      // Only owners can invite users
      if (authReq.user.role !== 'owner') {
        throw new UnauthorizedError('Only organization owners can invite users');
      }

      // Get organization name and inviter name for email
      const org = await db('organizations')
        .where({ id: authReq.user.organizationId })
        .first();

      const inviter = await db('users')
        .where({ id: authReq.user.id })
        .first();

      const invitation = await this.service.inviteUser(
        inviteRequest,
        authReq.user.organizationId!,
        authReq.user.id,
        org.name,
        `${inviter.first_name} ${inviter.last_name}`
      );

      res.status(201).json({
        success: true,
        data: invitation,
        message: `Invitation sent to ${inviteRequest.email}`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/users/:id
   * Update user details
   */
  updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const updateRequest: UpdateUserRequest = req.body;

      console.log('Controller received update request:', JSON.stringify(updateRequest, null, 2));

      // Only owners can update other users
      if (authReq.user.role !== 'owner' && authReq.user.id !== Number(id)) {
        throw new UnauthorizedError('You can only update your own profile');
      }

      // Only owners can change role or status
      if ((updateRequest.role || updateRequest.status) && authReq.user.role !== 'owner') {
        throw new UnauthorizedError('Only owners can change user role or status');
      }

      const user = await this.service.updateUser(
        Number(id),
        updateRequest,
        authReq.user.id
      );

      // Map phone_number to phone for frontend compatibility
      const { phone_number, ...rest } = user as any;
      const mappedUser = { ...rest, phone: phone_number };

      res.status(200).json({
        success: true,
        data: mappedUser,
        message: 'User updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/users/:id
   * Deactivate user
   */
  deactivateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      // Only owners can deactivate users
      if (authReq.user.role !== 'owner') {
        throw new UnauthorizedError('Only organization owners can deactivate users');
      }

      // Cannot deactivate yourself
      if (authReq.user.id === Number(id)) {
        throw new UnauthorizedError('You cannot deactivate your own account');
      }

      await this.service.deactivateUser(Number(id));

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/users/:id/departments
   * Assign user to departments
   */
  assignDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const { departmentIds } = req.body;

      // Only owners can assign departments
      if (authReq.user.role !== 'owner') {
        throw new UnauthorizedError(
          'Only organization owners can assign departments'
        );
      }

      await this.service.assignDepartments(
        Number(id),
        departmentIds,
        authReq.user.id
      );

      res.status(200).json({
        success: true,
        message: 'Departments assigned successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/users/invitation/:token
   * Get invitation details by token (public)
   */
  getInvitationByToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;

      const invitation = await this.service.getInvitationByToken(token);

      res.status(200).json({
        success: true,
        data: invitation,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/users/accept-invitation
   * Accept invitation and create user account (public)
   */
  acceptInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const acceptRequest: AcceptInvitationRequest = req.body;

      // Extract device info from request
      const deviceInfo = {
        deviceName: req.body.deviceName || 'Unknown Device',
        userAgent: req.headers['user-agent'],
        ip: (req.ip || req.socket.remoteAddress || '').replace('::ffff:', ''),
      };

      const result = await this.service.acceptInvitation(acceptRequest, deviceInfo);

      // Map phone_number to phone for frontend compatibility
      const { phone_number, ...rest } = result.user as any;
      const mappedUser = { ...rest, phone: phone_number };

      res.status(201).json({
        success: true,
        data: {
          user: mappedUser,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        message: 'Invitation accepted successfully. Welcome to OmniTrackr!',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/users/invitations
   * List pending invitations for organization (owner only)
   */
  listInvitations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;

      // Only owners can list invitations
      if (authReq.user.role !== 'owner') {
        throw new UnauthorizedError('Only organization owners can view invitations');
      }

      const invitations = await this.service.getPendingInvitations(
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        data: invitations,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/users/invitations/:id/resend
   * Resend invitation email (owner only)
   */
  resendInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      // Only owners can resend invitations
      if (authReq.user.role !== 'owner') {
        throw new UnauthorizedError('Only organization owners can resend invitations');
      }

      // Get organization name and inviter name for email
      const org = await db('organizations')
        .where({ id: authReq.user.organizationId })
        .first();

      const inviter = await db('users')
        .where({ id: authReq.user.id })
        .first();

      const invitation = await this.service.resendInvitation(
        Number(id),
        authReq.user.organizationId!,
        org.name,
        `${inviter.first_name} ${inviter.last_name}`
      );

      res.status(200).json({
        success: true,
        data: invitation,
        message: 'Invitation resent successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/users/invitations/:id
   * Delete/cancel invitation (owner only)
   */
  deleteInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      // Only owners can delete invitations
      if (authReq.user.role !== 'owner') {
        throw new UnauthorizedError('Only organization owners can delete invitations');
      }

      await this.service.deleteInvitation(
        Number(id),
        authReq.user.organizationId!
      );

      res.status(200).json({
        success: true,
        message: 'Invitation cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
