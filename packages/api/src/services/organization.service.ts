import { Knex } from 'knex';
import {
  OrganizationRepository,
  UserRepository,
  Organization,
  User,
} from '@omnitrackr/shared';
import {
  hashPassword,
  validatePasswordStrength,
  savePasswordToHistory,
  calculatePasswordExpiration,
} from '../utils/password.utils';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { db } from '../config/database';

export interface UpdateOrganizationRequest {
  name?: string;
  settings?: any;
  status?: 'active' | 'suspended';
}

export interface CreateOrganizationRequest {
  name: string;
  settings?: any;
  owner: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  };
}

/**
 * Organization Service
 * Handles all business logic for organization management
 */
export class OrganizationService {
  private orgRepo: OrganizationRepository;
  private userRepo: UserRepository;

  constructor() {
    this.orgRepo = new OrganizationRepository(db);
    this.userRepo = new UserRepository(db);
  }

  /**
   * Get organization by ID
   */
  async getById(id: number): Promise<Organization> {
    const organization = await this.orgRepo.findById<Organization>(id);

    if (!organization || organization.deleted_at) {
      throw new NotFoundError('Organization', id);
    }

    return organization;
  }

  /**
   * Update organization
   */
  async update(
    id: number,
    data: UpdateOrganizationRequest,
    updatedBy: number
  ): Promise<Organization> {
    const organization = await this.orgRepo.findById<Organization>(id);

    if (!organization || organization.deleted_at) {
      throw new NotFoundError('Organization', id);
    }

    // Validate name if being changed
    if (data.name && !data.name.trim()) {
      throw new ValidationError('Organization name cannot be empty');
    }

    // Update organization
    const updated = await this.orgRepo.update<Organization>(id, {
      ...(data.name && { name: data.name.trim() }),
      ...(data.settings !== undefined && { settings: data.settings }),
      ...(data.status && { status: data.status }),
      updated_by: updatedBy.toString(),
    } as any);

    return updated;
  }

  /**
   * Create organization with owner (Super Admin only)
   * This creates a new organization and its first owner user in a transaction
   */
  async createWithOwner(data: CreateOrganizationRequest): Promise<{
    organization: Organization;
    owner: User;
  }> {
    // Validate organization name
    if (!data.name?.trim()) {
      throw new ValidationError('Organization name is required');
    }

    // Validate owner email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.owner.email)) {
      throw new ValidationError('Invalid email address');
    }

    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(data.owner.email);
    if (existingUser && !existingUser.deleted_at) {
      throw new ValidationError('User with this email already exists');
    }

    // Validate password
    const passwordValidation = validatePasswordStrength(data.owner.password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join('. '));
    }

    // Hash password
    const passwordHash = await hashPassword(data.owner.password);

    // Create organization and owner in transaction
    const result = await db.transaction(async (trx) => {
      // Create organization
      const [organization] = await trx('organizations')
        .insert({
          name: data.name.trim(),
          settings: data.settings || null,
          status: 'active',
          created_by: 'system',
          created_at: trx.fn.now(),
        })
        .returning('*');

      // Create owner user
      const [owner] = await trx('users')
        .insert({
          email: data.owner.email.toLowerCase(),
          first_name: data.owner.firstName.trim(),
          last_name: data.owner.lastName.trim(),
          password_hash: passwordHash,
          organization_id: organization.id,
          role: 'owner',
          status: 'active',
          email_verified: true, // Auto-verify for admin-created accounts
          email_verified_at: trx.fn.now(),
          password_changed_at: trx.fn.now(),
          password_expires_at: calculatePasswordExpiration(),
          created_by: 'system',
          created_at: trx.fn.now(),
        })
        .returning('*');

      // Save password to history
      await savePasswordToHistory(owner.id, passwordHash, trx);

      return { organization, owner };
    });

    return result;
  }

  /**
   * Get organization with user count
   */
  async getWithStats(id: number): Promise<Organization & { userCount: number }> {
    const organization = await this.getById(id);

    // Get user count
    const result = await db('users')
      .where({ organization_id: id, deleted_at: null })
      .count('* as count')
      .first();

    const userCount = result ? parseInt(result.count as string) : 0;

    return {
      ...organization,
      userCount,
    };
  }
}
