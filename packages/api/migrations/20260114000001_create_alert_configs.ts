import { Knex } from 'knex';

/**
 * Migration: Create alert_configs table
 * Per-watcher alert configuration for SLA breach notifications
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('alert_configs', (table) => {
    // Primary key
    table.increments('id').primary();

    // Foreign Keys
    table
      .integer('watcher_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('watchers')
      .onDelete('CASCADE');

    table
      .integer('organization_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    table
      .integer('department_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('departments')
      .onDelete('SET NULL');

    // Alert Types (which events trigger alerts)
    table
      .specificType('alert_types', 'text[]')
      .notNullable()
      .defaultTo('{sla_breached}')
      .comment('Array of alert types: sla_breached, sla_at_risk, file_arrived_late');

    // Email Configuration
    table.boolean('email_enabled').notNullable().defaultTo(true);
    table
      .specificType('email_recipients', 'text[]')
      .nullable()
      .comment('Direct email addresses');
    table.specificType('email_cc', 'text[]').nullable();
    table.specificType('email_bcc', 'text[]').nullable();
    table
      .specificType('recipient_group_ids', 'integer[]')
      .nullable()
      .comment('References to alert_recipient_groups');

    // Future Channel Configuration (extensibility)
    table
      .jsonb('channel_configs')
      .nullable()
      .comment('Future channels: {slack: {...}, teams: {...}, jira: {...}}');

    // Status
    table.boolean('enabled').notNullable().defaultTo(true);

    // Audit
    table.timestamps(true, true);
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.timestamp('deleted_at').nullable();

    // Indexes
    table.index('watcher_id', 'idx_alert_configs_watcher_id');
    table.index('organization_id', 'idx_alert_configs_organization_id');
    table.index('department_id', 'idx_alert_configs_department_id');
    table.index('enabled', 'idx_alert_configs_enabled');
    table.index(
      ['watcher_id', 'enabled'],
      'idx_alert_configs_watcher_enabled'
    );
    table.index('deleted_at', 'idx_alert_configs_deleted_at');
  });

  // Add check constraint for at least one recipient
  await knex.raw(`
    ALTER TABLE alert_configs
    ADD CONSTRAINT check_alert_configs_has_recipients
    CHECK (
      email_recipients IS NOT NULL
      OR recipient_group_ids IS NOT NULL
    );
  `);

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE alert_configs IS 'Per-watcher alert configuration. Defines who gets notified when SLA breaches occur.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN alert_configs.alert_types IS 'Array of alert types that trigger notifications: sla_breached, sla_at_risk, file_arrived_late';
  `);

  await knex.raw(`
    COMMENT ON COLUMN alert_configs.channel_configs IS 'JSON configuration for future notification channels (Slack, Teams, Jira, etc.)';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('alert_configs');
}
