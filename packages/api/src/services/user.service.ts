import { Knex } from 'knex';
import {
  UserRepository,
  UserInvitationRepository,
  User,
  UserInvitation,
} from '@omnitrackr/shared';
import {
  hashPassword,
  validatePasswordStrength,
  checkPasswordHistory,
  savePasswordToHistory,
  calculatePasswordExpiration,
} from '../utils/password.utils';
import {
  generateSecureToken,
  hashToken,
  calculateTokenExpiration,
  isTokenExpired,
} from '../utils/token.utils';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { db } from '../config/database';
import { EmailService } from '@omnitrackr/shared';
import { AuthService } from './auth.service';

export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'editor' | 'viewer';
  departmentIds?: number[];
}

export interface AcceptInvitationRequest {
  token: string;
  firstName?: string; // Optional - will use invitation's first_name if not provided
  lastName?: string; // Optional - will use invitation's last_name if not provided
  password: string;
}

export interface DeviceInfo {
  deviceName?: string;
  userAgent?: string;
  ip: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
  role?: 'owner' | 'editor' | 'viewer';
  status?: 'active' | 'suspended' | 'deactivated';
}

/**
 * User Service
 * Handles all business logic for user management
 */
export class UserService {
  private userRepo: UserRepository;
  private invitationRepo: UserInvitationRepository;
  private emailService: EmailService;
  private authService: AuthService;

  constructor() {
    this.userRepo = new UserRepository(db);
    this.invitationRepo = new UserInvitationRepository(db);
    this.emailService = new EmailService();
    this.authService = new AuthService();
  }

  /**
   * Get all users for an organization with their department assignments
   */
  async getUsersByOrganization(organizationId: number): Promise<any[]> {
    const users = await this.userRepo.findByOrganization(organizationId);

    // Fetch departments for each user
    const usersWithDepartments = await Promise.all(
      users.map(async (user) => {
        const departments = await db('user_departments')
          .join('departments', 'user_departments.department_id', 'departments.id')
          .where('user_departments.user_id', user.id)
          .where('departments.deleted_at', null)
          .select(
            'departments.id',
            'departments.name',
            'departments.code',
            'departments.description',
            'departments.status'
          );

        return {
          ...user,
          departments,
        };
      })
    );

    return usersWithDepartments;
  }

  /**
   * Get user by ID with department assignments
   */
  async getById(id: number): Promise<any> {
    const user = await this.userRepo.findById<User>(id);

    if (!user || user.deleted_at) {
      throw new NotFoundError('User', id);
    }

    // Fetch departments for the user
    const departments = await db('user_departments')
      .join('departments', 'user_departments.department_id', 'departments.id')
      .where('user_departments.user_id', user.id)
      .where('departments.deleted_at', null)
      .select(
        'departments.id',
        'departments.name',
        'departments.code',
        'departments.description',
        'departments.status'
      );

    return {
      ...user,
      departments,
    };
  }

  /**
   * Invite a new user to organization
   */
  async inviteUser(
    data: InviteUserRequest,
    organizationId: number,
    invitedBy: number,
    organizationName: string,
    inviterName: string
  ): Promise<UserInvitation> {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new ValidationError('Invalid email address');
    }

    const email = data.email.toLowerCase();

    // Check if user already exists IN THIS ORGANIZATION
    const existingUser = await this.userRepo.findByEmailAndOrganization(email, organizationId);
    if (existingUser && !existingUser.deleted_at) {
      throw new ValidationError('User with this email already exists in your organization');
    }

    // Check if pending invitation exists IN THIS ORGANIZATION
    const pendingInvitations = await this.invitationRepo.findPendingByEmailAndOrganization(
      email,
      organizationId
    );
    if (pendingInvitations.length > 0) {
      throw new ValidationError(
        'A pending invitation already exists for this email in your organization'
      );
    }

    // Validate role and department assignments
    if (data.role === 'owner' && data.departmentIds && data.departmentIds.length > 0) {
      throw new ValidationError('Owners cannot be assigned to specific departments');
    }

    if ((data.role === 'editor' || data.role === 'viewer') && (!data.departmentIds || data.departmentIds.length === 0)) {
      throw new ValidationError(
        'Editors and viewers must be assigned to at least one department'
      );
    }

    // Generate invitation token
    const token = generateSecureToken();
    const tokenHash = hashToken(token);

    // Create invitation
    const invitation = await this.invitationRepo.create<UserInvitation>({
      email,
      first_name: data.firstName,
      last_name: data.lastName,
      organization_id: organizationId,
      role: data.role,
      department_ids: data.departmentIds ? JSON.stringify(data.departmentIds) : null,
      token_hash: tokenHash,
      expires_at: calculateTokenExpiration(7 * 24), // 7 days
      status: 'pending',
      invited_by: invitedBy,
      created_at: db.fn.now(),
    } as any);

    // Send invitation email
    await this.emailService.sendInvitationEmail(
      email,
      token,
      organizationName,
      inviterName,
      data.firstName
    );

    return invitation;
  }

  /**
   * Get invitation details by token (for pre-filling accept form)
   */
  async getInvitationByToken(token: string): Promise<Partial<UserInvitation>> {
    // Hash token and find invitation
    const tokenHash = hashToken(token);
    const invitation = await this.invitationRepo.findByToken(tokenHash);

    if (!invitation) {
      throw new NotFoundError('Invitation', 'token');
    }

    // Check invitation status
    if (invitation.status === 'accepted') {
      throw new ValidationError('This invitation has already been accepted');
    }

    if (invitation.status === 'expired') {
      throw new ValidationError('This invitation has expired');
    }

    // Check expiration
    if (isTokenExpired(invitation.expires_at)) {
      await this.invitationRepo.update(invitation.id, { status: 'expired' } as any);
      throw new ValidationError('This invitation has expired');
    }

    // Return safe invitation details (no sensitive data)
    return {
      email: invitation.email,
      first_name: invitation.first_name,
      last_name: invitation.last_name,
      organization_id: invitation.organization_id,
      role: invitation.role,
    };
  }

  /**
   * Accept invitation and create user account
   */
  async acceptInvitation(
    data: AcceptInvitationRequest,
    deviceInfo: DeviceInfo
  ): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    // Hash token and find invitation
    const tokenHash = hashToken(data.token);
    const invitation = await this.invitationRepo.findByToken(tokenHash);

    if (!invitation) {
      throw new NotFoundError('Invitation', 'token');
    }

    // Check invitation status
    if (invitation.status === 'accepted') {
      throw new ValidationError('This invitation has already been accepted');
    }

    if (invitation.status === 'expired') {
      throw new ValidationError('This invitation has expired');
    }

    // Check expiration
    if (isTokenExpired(invitation.expires_at)) {
      await this.invitationRepo.update(invitation.id, { status: 'expired' } as any);
      throw new ValidationError('This invitation has expired');
    }

    // Validate password
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join('. '));
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Use names from invitation if not provided in request
    const firstName = (data.firstName || invitation.first_name || '').trim();
    const lastName = (data.lastName || invitation.last_name || '').trim();

    if (!firstName || !lastName) {
      throw new ValidationError('First name and last name are required');
    }

    // Create user in transaction
    const user = await db.transaction(async (trx) => {
      // Create user
      const [newUser] = await trx('users')
        .insert({
          email: invitation.email,
          first_name: firstName,
          last_name: lastName,
          password_hash: passwordHash,
          organization_id: invitation.organization_id,
          role: invitation.role,
          status: 'active',
          email_verified: true, // Auto-verify on invitation acceptance
          email_verified_at: trx.fn.now(),
          password_changed_at: trx.fn.now(),
          password_expires_at: calculatePasswordExpiration(),
          created_at: trx.fn.now(),
        })
        .returning('*');

      // Save password to history
      await savePasswordToHistory(newUser.id, passwordHash, trx);

      // Assign to departments if editor/viewer
      const departmentIds = invitation.department_ids
        ? (typeof invitation.department_ids === 'string'
            ? JSON.parse(invitation.department_ids)
            : invitation.department_ids)
        : null;

      if (departmentIds && departmentIds.length > 0) {
        const assignments = departmentIds.map((deptId: number) => ({
          user_id: newUser.id,
          department_id: deptId,
          created_by: newUser.id,
          created_at: trx.fn.now(),
        }));

        await trx('user_departments').insert(assignments);
      }

      // Mark invitation as accepted
      await trx('user_invitations')
        .where({ id: invitation.id })
        .update({
          status: 'accepted',
          accepted_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });

      return newUser;
    });

    // Generate tokens for auto-login
    const tokens = await this.authService.generateTokensForUser(user, deviceInfo);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Update user
   */
  async updateUser(
    id: number,
    data: UpdateUserRequest,
    updatedBy: number
  ): Promise<User> {
    const user = await this.userRepo.findById<User>(id);

    if (!user || user.deleted_at) {
      throw new NotFoundError('User', id);
    }

    // Validate email if being changed
    if (data.email && data.email !== user.email) {
      const existingUser = await this.userRepo.findByEmail(data.email);
      if (existingUser && existingUser.id !== id) {
        throw new ValidationError('Email already in use');
      }
    }

    // Build update object
    const updateData: any = {
      updated_by: updatedBy.toString(),
      updated_at: db.fn.now(),
    };

    if (data.firstName !== undefined) {
      updateData.first_name = data.firstName.trim();
    }
    if (data.lastName !== undefined) {
      updateData.last_name = data.lastName.trim();
    }
    if (data.email !== undefined) {
      updateData.email = data.email.toLowerCase();
    }
    if (data.phone !== undefined) {
      updateData.phone_number = data.phone ? data.phone.trim() : null;
    }
    if (data.timezone !== undefined) {
      updateData.timezone = data.timezone;
    }
    if (data.locale !== undefined) {
      updateData.locale = data.locale;
    }
    if (data.role !== undefined) {
      updateData.role = data.role;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    console.log('Updating user with data:', updateData);

    // Update user
    const updated = await this.userRepo.update<User>(id, updateData);

    return updated;
  }

  /**
   * Deactivate user
   */
  async deactivateUser(id: number): Promise<void> {
    const user = await this.userRepo.findById<User>(id);

    if (!user || user.deleted_at) {
      throw new NotFoundError('User', id);
    }

    // Update status to deactivated
    await this.userRepo.update(id, {
      status: 'deactivated',
    } as any);

    // Revoke all refresh tokens
    await db('refresh_tokens')
      .where({ user_id: id, revoked_at: null })
      .update({
        revoked_at: db.fn.now(),
        revocation_reason: 'user_deactivated',
      });
  }

  /**
   * Assign user to departments
   */
  async assignDepartments(
    userId: number,
    departmentIds: number[],
    assignedBy: number
  ): Promise<void> {
    const user = await this.userRepo.findById<User>(userId);

    if (!user || user.deleted_at) {
      throw new NotFoundError('User', userId);
    }

    // Owners cannot be assigned to departments
    if (user.role === 'owner') {
      throw new ValidationError('Owners cannot be assigned to specific departments');
    }

    // Editors and viewers must have at least one department
    if ((user.role === 'editor' || user.role === 'viewer') && departmentIds.length === 0) {
      throw new ValidationError(
        'Editors and viewers must be assigned to at least one department'
      );
    }

    // Perform in transaction
    await db.transaction(async (trx) => {
      // Remove existing assignments
      await trx('user_departments').where({ user_id: userId }).del();

      // Add new assignments
      if (departmentIds.length > 0) {
        const assignments = departmentIds.map((deptId) => ({
          user_id: userId,
          department_id: deptId,
          created_by: assignedBy,
          created_at: trx.fn.now(),
        }));

        await trx('user_departments').insert(assignments);
      }
    });
  }

  /**
   * Get pending invitations for an organization
   */
  async getPendingInvitations(organizationId: number): Promise<UserInvitation[]> {
    return this.invitationRepo.findPendingByOrganization(organizationId);
  }

  /**
   * Resend invitation email
   */
  async resendInvitation(
    invitationId: number,
    organizationId: number,
    organizationName: string,
    inviterName: string
  ): Promise<UserInvitation> {
    const invitation = await this.invitationRepo.findById<UserInvitation>(invitationId);

    if (!invitation) {
      throw new NotFoundError('Invitation', invitationId);
    }

    // Validate organization ownership
    if (invitation.organization_id !== organizationId) {
      throw new UnauthorizedError('Invitation belongs to a different organization');
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      throw new ValidationError('This invitation has already been accepted');
    }

    // Generate new token
    const token = generateSecureToken();
    const tokenHash = hashToken(token);

    // Update invitation with new token and expiration
    await this.invitationRepo.update(invitationId, {
      token_hash: tokenHash,
      expires_at: calculateTokenExpiration(7 * 24), // 7 days
      status: 'pending',
      updated_at: db.fn.now(),
    } as any);

    // Send invitation email
    await this.emailService.sendInvitationEmail(
      invitation.email,
      token,
      organizationName,
      inviterName
    );

    return this.invitationRepo.findById<UserInvitation>(invitationId) as Promise<UserInvitation>;
  }

  /**
   * Delete/cancel invitation
   */
  async deleteInvitation(invitationId: number, organizationId: number): Promise<void> {
    const invitation = await this.invitationRepo.findById<UserInvitation>(invitationId);

    if (!invitation) {
      throw new NotFoundError('Invitation', invitationId);
    }

    // Validate organization ownership
    if (invitation.organization_id !== organizationId) {
      throw new UnauthorizedError('Invitation belongs to a different organization');
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      throw new ValidationError('Cannot delete an accepted invitation');
    }

    // Soft delete by marking as expired
    await this.invitationRepo.update(invitationId, {
      status: 'expired',
      updated_at: db.fn.now(),
    } as any);
  }
}
