import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { AlertRecipientGroup } from '../types';

/**
 * Alert Recipient Group Repository
 * Handles all database operations for alert_recipient_groups table
 */
export class AlertRecipientGroupRepository extends BaseRepository {
  protected get tableName(): string {
    return 'alert_recipient_groups';
  }

  /**
   * Find all recipient groups for an organization
   */
  async findByOrganizationId(
    organizationId: number
  ): Promise<AlertRecipientGroup[]> {
    return this.db(this.tableName)
      .where({ organization_id: organizationId, deleted_at: null })
      .orderBy('name', 'asc');
  }

  /**
   * Find recipient group by name (for validation)
   */
  async findByName(
    organizationId: number,
    name: string
  ): Promise<AlertRecipientGroup | undefined> {
    return this.db(this.tableName)
      .where({
        organization_id: organizationId,
        name,
        deleted_at: null,
      })
      .first();
  }

  /**
   * Soft delete recipient group
   */
  async softDelete(id: number): Promise<void> {
    await this.db(this.tableName).where({ id }).update({
      deleted_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
  }

  /**
   * Find soft-deleted group by name
   */
  async findDeletedByName(
    organizationId: number,
    name: string
  ): Promise<AlertRecipientGroup | undefined> {
    return this.db(this.tableName)
      .where({ organization_id: organizationId, name })
      .whereNotNull('deleted_at')
      .first();
  }

  /**
   * Restore soft-deleted group
   */
  async restore(
    id: number,
    updateData: Partial<AlertRecipientGroup>
  ): Promise<AlertRecipientGroup | undefined> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        ...updateData,
        deleted_at: null,
        updated_at: this.db.fn.now(),
      });

    return this.findById(id);
  }

  /**
   * Find multiple groups by IDs
   */
  async findByIds(ids: number[]): Promise<AlertRecipientGroup[]> {
    if (ids.length === 0) return [];

    return this.db(this.tableName)
      .whereIn('id', ids)
      .whereNull('deleted_at')
      .orderBy('name', 'asc');
  }
}
