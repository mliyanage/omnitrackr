import { Knex } from 'knex';

/**
 * Migration: Create alert_escalations table
 * Escalation chain configuration - who to notify if alerts are not acknowledged
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('alert_escalations', (table) => {
    // Primary key
    table.increments('id').primary();

    // Foreign Keys
    table
      .integer('alert_config_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('alert_configs')
      .onDelete('CASCADE');

    // Escalation Order
    table
      .integer('escalation_level')
      .notNullable()
      .comment('1=first escalation, 2=second, etc.');

    // Trigger Conditions
    table
      .integer('delay_minutes')
      .notNullable()
      .comment('Minutes to wait before escalating if not acknowledged');

    // Recipients for this escalation level
    table.specificType('email_recipients', 'text[]').nullable();
    table.specificType('email_cc', 'text[]').nullable();
    table.specificType('recipient_group_ids', 'integer[]').nullable();

    // Future channels
    table
      .jsonb('channel_configs')
      .nullable()
      .comment('Future notification channels configuration');

    // Audit
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    // Indexes
    table.index(
      'alert_config_id',
      'idx_alert_escalations_alert_config_id'
    );
    table.index('deleted_at', 'idx_alert_escalations_deleted_at');

    // Unique constraint: one escalation level per config
    table.unique(['alert_config_id', 'escalation_level', 'deleted_at'], {
      indexName: 'unique_alert_escalation_level',
    });
  });

  // Add check constraint for at least one recipient
  await knex.raw(`
    ALTER TABLE alert_escalations
    ADD CONSTRAINT check_alert_escalations_has_recipients
    CHECK (
      email_recipients IS NOT NULL
      OR recipient_group_ids IS NOT NULL
    );
  `);

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE alert_escalations IS 'Escalation chain configuration. Defines who to notify if alerts are not acknowledged within delay_minutes.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN alert_escalations.escalation_level IS 'Escalation order: 1=first level, 2=second level, etc.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN alert_escalations.delay_minutes IS 'Minutes to wait before escalating if not acknowledged';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('alert_escalations');
}
