import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { AlertEscalation } from '../types';

/**
 * Alert Escalation Repository
 * Handles all database operations for alert_escalations table
 */
export class AlertEscalationRepository extends BaseRepository {
  protected get tableName(): string {
    return 'alert_escalations';
  }

  /**
   * Find escalations by alert config ID
   */
  async findByConfigId(configId: number): Promise<AlertEscalation[]> {
    return this.db(this.tableName)
      .where({ alert_config_id: configId, deleted_at: null })
      .orderBy('escalation_level', 'asc');
  }

  /**
   * Find specific escalation level for a config
   */
  async findByConfigAndLevel(
    configId: number,
    level: number
  ): Promise<AlertEscalation | undefined> {
    return this.db(this.tableName)
      .where({
        alert_config_id: configId,
        escalation_level: level,
        deleted_at: null,
      })
      .first();
  }

  /**
   * Soft delete escalation
   */
  async softDelete(id: number): Promise<void> {
    await this.db(this.tableName).where({ id }).update({
      deleted_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
  }

  /**
   * Delete all escalations for a config (cascade on config delete)
   */
  async deleteByConfigId(configId: number): Promise<void> {
    await this.db(this.tableName)
      .where({ alert_config_id: configId })
      .update({
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Get next escalation level for a config
   */
  async getNextLevel(configId: number): Promise<number> {
    const result = await this.db(this.tableName)
      .where({ alert_config_id: configId, deleted_at: null })
      .max('escalation_level as max_level')
      .first();

    return result?.max_level ? Number(result.max_level) + 1 : 1;
  }
}
