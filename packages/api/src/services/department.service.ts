import { Knex } from 'knex';
import {
  DepartmentRepository,
  DepartmentEntity,
} from '@omnitrackr/shared';
import { ValidationError, NotFoundError } from '../utils/errors';
import { db } from '../config/database';

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description?: string;
  settings?: any;
}

export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  description?: string;
  status?: 'active' | 'inactive';
  settings?: any;
}

/**
 * Department Service
 * Handles all business logic for department management
 */
export class DepartmentService {
  private repo: DepartmentRepository;

  constructor() {
    this.repo = new DepartmentRepository(db);
  }

  /**
   * Get departments by organization
   */
  async getByOrganization(
    organizationId: number,
    activeOnly: boolean = false
  ): Promise<DepartmentEntity[]> {
    if (activeOnly) {
      return this.repo.findActiveByOrganization(organizationId);
    }
    return this.repo.findByOrganization(organizationId);
  }

  /**
   * Get department by ID
   */
  async getById(id: number): Promise<DepartmentEntity> {
    const department = await this.repo.findByIdActive(id);

    if (!department) {
      throw new NotFoundError('Department', id);
    }

    return department;
  }

  /**
   * Create new department
   */
  async create(
    data: CreateDepartmentRequest,
    organizationId: number,
    createdBy: number
  ): Promise<DepartmentEntity> {
    // Validate required fields
    if (!data.name?.trim()) {
      throw new ValidationError('Department name is required');
    }

    if (!data.code?.trim()) {
      throw new ValidationError('Department code is required');
    }

    // Check if code already exists in organization
    const existing = await this.repo.findByCode(organizationId, data.code);
    if (existing) {
      throw new ValidationError(
        `Department code "${data.code}" already exists in this organization`
      );
    }

    // Create department
    const department = await this.repo.create<DepartmentEntity>({
      organization_id: organizationId,
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description?.trim(),
      status: 'active',
      settings: data.settings || null,
      created_by: createdBy.toString(),
      created_at: db.fn.now(),
    } as any);

    return department;
  }

  /**
   * Update department
   */
  async update(
    id: number,
    data: UpdateDepartmentRequest,
    updatedBy: number
  ): Promise<DepartmentEntity> {
    const department = await this.repo.findByIdActive(id);

    if (!department) {
      throw new NotFoundError('Department', id);
    }

    // If code is being changed, check uniqueness
    if (data.code && data.code !== department.code) {
      const existing = await this.repo.findByCode(
        department.organization_id,
        data.code
      );
      if (existing) {
        throw new ValidationError(
          `Department code "${data.code}" already exists in this organization`
        );
      }
    }

    // Update department
    const updated = await this.repo.update<DepartmentEntity>(id, {
      ...(data.name && { name: data.name.trim() }),
      ...(data.code && { code: data.code.trim().toUpperCase() }),
      ...(data.description !== undefined && { description: data.description?.trim() }),
      ...(data.status && { status: data.status }),
      ...(data.settings !== undefined && { settings: data.settings }),
      updated_by: updatedBy.toString(),
    } as any);

    return updated;
  }

  /**
   * Delete department (soft delete)
   */
  async delete(id: number): Promise<void> {
    const department = await this.repo.findByIdActive(id);

    if (!department) {
      throw new NotFoundError('Department', id);
    }

    // Check if department has assigned users
    const userCount = await db('user_departments')
      .where({ department_id: id })
      .count('* as count')
      .first();

    if (userCount && parseInt(userCount.count as string) > 0) {
      throw new ValidationError(
        'Cannot delete department with assigned users. Please reassign users first.'
      );
    }

    // Check if department has watchers
    const watcherCount = await db('watchers')
      .where({ department_id: id, deleted_at: null })
      .count('* as count')
      .first();

    if (watcherCount && parseInt(watcherCount.count as string) > 0) {
      throw new ValidationError(
        'Cannot delete department with active watchers. Please reassign or delete watchers first.'
      );
    }

    // Soft delete
    await this.repo.softDelete(id);
  }

  /**
   * Get departments assigned to a user
   */
  async getUserDepartments(userId: number): Promise<DepartmentEntity[]> {
    const departments = await db('departments')
      .join('user_departments', 'departments.id', 'user_departments.department_id')
      .where({
        'user_departments.user_id': userId,
        'departments.deleted_at': null,
        'departments.status': 'active',
      })
      .select('departments.*')
      .orderBy('departments.name', 'asc');

    return departments;
  }
}
