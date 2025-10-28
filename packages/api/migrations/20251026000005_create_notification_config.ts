import { Knex } from 'knex';

/**
 * Migration: Create notification_config table
 * Stores user notification preferences for different event types and channels
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notification_config', (table) => {
    // Primary key
    table.increments('id').primary();

    // User and department
    table.integer('user_id').notNullable(); // References users table (to be created later)
    table.string('department', 100);

    // Event type this config applies to
    table.enum('event_type', [
      'file_detected',
      'file_missing',
      'sla_at_risk',
      'sla_breached',
      'connection_failed',
      'source_disabled',
    ]).notNullable();

    // Notification channels (JSONB array)
    // Structure: [{ channel: 'email', enabled: true, config: {...} }]
    table.jsonb('channels').notNullable();

    // Enabled/disabled
    table.boolean('enabled').notNullable().defaultTo(true);

    // Audit
    table.timestamps(true, true); // created_at, updated_at

    // Indexes
    table.index('user_id', 'idx_notification_config_user');
    table.index('enabled', 'idx_notification_config_enabled');
    table.index('event_type', 'idx_notification_config_event_type');
    table.index(['user_id', 'event_type'], 'idx_notification_config_user_event');

    // Unique constraint - one config per user per event type per department
    table.unique(['user_id', 'event_type', 'department'], {
      indexName: 'unique_user_event_type_dept',
    });
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE notification_config IS 'User notification preferences. Determines which channels to use for each event type.';
  `);

  // Add column comment
  await knex.raw(`
    COMMENT ON COLUMN notification_config.channels IS 'JSONB array of channel configs. Example: [{"channel":"email","enabled":true,"config":{"to":"user@example.com"}}]';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_config');
}
