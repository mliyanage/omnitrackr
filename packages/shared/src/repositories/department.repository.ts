import { BaseRepository } from './base.repository';

export interface DepartmentEntity {
  id: number;
  organization_id: number;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
  settings?: any;
  created_at: Date;
  updated_at?: Date;
  created_by: string;
  updated_by?: string;
  deleted_at?: Date;
}

/**
 * Department Repository
 * Handles all database operations for departments table
 */
export class DepartmentRepository extends BaseRepository {
  protected get tableName(): string {
    return 'departments';
  }

  /**
   * Find departments by organization
   */
  async findByOrganization(organizationId: number): Promise<DepartmentEntity[]> {
    return this.db(this.tableName)
      .where({ organization_id: organizationId, deleted_at: null })
      .orderBy('name', 'asc');
  }

  /**
   * Find active departments by organization
   */
  async findActiveByOrganization(organizationId: number): Promise<DepartmentEntity[]> {
    return this.db(this.tableName)
      .where({
        organization_id: organizationId,
        status: 'active',
        deleted_at: null,
      })
      .orderBy('name', 'asc');
  }

  /**
   * Find department by code within organization
   */
  async findByCode(
    organizationId: number,
    code: string
  ): Promise<DepartmentEntity | undefined> {
    return this.db(this.tableName)
      .where({
        organization_id: organizationId,
        code,
        deleted_at: null,
      })
      .first();
  }

  /**
   * Soft delete department
   */
  async softDelete(id: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Find department by ID (excluding deleted)
   */
  async findByIdActive(id: number): Promise<DepartmentEntity | undefined> {
    return this.db(this.tableName)
      .where({ id, deleted_at: null })
      .first();
  }
}
