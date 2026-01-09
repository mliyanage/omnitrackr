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
import { EmailService } from './email.service';
import { AuthService } from './auth.service';

export interface InviteUserRequest {
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  departmentIds?: number[];
}

export interface AcceptInvitationRequest {
  token: string;
  firstName: string;
  lastName: string;
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
   * Get all users for an organization
   */
  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    const users = await this.userRepo.findByOrganization(organizationId);
    return users;
  }

  /**
   * Get user by ID
   */
  async getById(id: number): Promise<User> {
    const user = await this.userRepo.findById<User>(id);

    if (!user || user.deleted_at) {
      throw new NotFoundError('User', id);
    }

    return user;
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

    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser && !existingUser.deleted_at) {
      throw new ValidationError('User with this email already exists');
    }

    // Check if pending invitation exists
    const pendingInvitations = await this.invitationRepo.findPendingByEmail(email);
    if (pendingInvitations.length > 0) {
      throw new ValidationError(
        'A pending invitation already exists for this email'
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
      inviterName
    );

    return invitation;
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

    // Create user in transaction
    const user = await db.transaction(async (trx) => {
      // Create user
      const [newUser] = await trx('users')
        .insert({
          email: invitation.email,
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
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

    // Update user
    const updated = await this.userRepo.update<User>(id, {
      ...(data.firstName && { first_name: data.firstName.trim() }),
      ...(data.lastName && { last_name: data.lastName.trim() }),
      ...(data.email && { email: data.email.toLowerCase() }),
      ...(data.role && { role: data.role }),
      ...(data.status && { status: data.status }),
      updated_by: updatedBy.toString(),
    } as any);

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
}
