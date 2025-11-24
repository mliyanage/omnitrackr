import { Knex } from 'knex';

/**
 * Migration: Update file_tracking table
 * Updates file_tracking to reference watchers instead of file_sources
 * Adds new columns for enhanced SLA tracking
 */
export async function up(knex: Knex): Promise<void> {
  // First, drop the foreign key constraint from notification_data if it exists
  const hasNotificationTable = await knex.schema.hasTable('notification_data');
  if (hasNotificationTable) {
    await knex.schema.alterTable('notification_data', (table) => {
      table.dropForeign(['file_tracking_id']);
    });
  }

  // Drop the old file_tracking table and recreate with new schema
  await knex.schema.dropTableIfExists('file_tracking');

  await knex.schema.createTable('file_tracking', (table) => {
    // Primary key
    table.increments('id').primary();

    // Foreign Key - now references watchers
    table.integer('watcher_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('watchers')
      .onDelete('CASCADE');

    // Expected Arrival Information
    table.string('expected_pattern', 500).notNullable();
    table.timestamp('expected_at').notNullable();
    table.string('expected_schedule', 50);

    // Actual Arrival Tracking
    table.string('file_path', 1000);
    table.string('file_name', 500);
    table.bigInteger('file_size');
    table.timestamp('arrived_at');

    // Status
    table.specificType('tracking_status', 'tracking_status').notNullable().defaultTo('pending');

    // Alert Information
    table.boolean('alert_triggered').notNullable().defaultTo(false);
    table.timestamp('alert_triggered_at');
    table.specificType('alert_type', 'alert_type');

    // SLA
    table.integer('sla_threshold_minutes');
    table.timestamp('sla_deadline').notNullable();

    // Audit
    table.timestamps(true, true);

    // Indexes
    table.index('watcher_id', 'idx_file_tracking_watcher');
    table.index('tracking_status', 'idx_file_tracking_status');
    table.index('expected_at', 'idx_file_tracking_expected_at');
    table.index('sla_deadline', 'idx_file_tracking_sla_deadline');
    table.index(['alert_triggered', 'tracking_status'], 'idx_file_tracking_alerts');
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE file_tracking IS 'Tracks expected file arrivals and SLA compliance. Creates proactive expectations for missing file alerts.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN file_tracking.tracking_status IS 'File arrival status: pending (not arrived), arrived (on time), late (after deadline), missing (never arrived)';
  `);

  // Re-add the foreign key constraint to notification_data if the table exists
  if (hasNotificationTable) {
    await knex.schema.alterTable('notification_data', (table) => {
      table.foreign('file_tracking_id')
        .references('id')
        .inTable('file_tracking')
        .onDelete('CASCADE');
    });
  }
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  // Drop the new table
  await knex.schema.dropTableIfExists('file_tracking');

  // Recreate the old structure (simplified - would need full old schema for proper rollback)
  await knex.schema.createTable('file_tracking', (table) => {
    table.increments('id').primary();
    table.integer('file_source_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('file_sources')
      .onDelete('CASCADE');
    table.string('expected_pattern', 255).notNullable();
    table.timestamp('expected_at').notNullable();
    table.string('expected_schedule', 10);
    table.integer('actual_file_id')
      .unsigned()
      .references('id')
      .inTable('inward_files')
      .onDelete('SET NULL');
    table.timestamp('arrived_at');
    table.enum('tracking_status', ['pending', 'arrived', 'late', 'missing'])
      .notNullable()
      .defaultTo('pending');
    table.boolean('alert_triggered').notNullable().defaultTo(false);
    table.timestamp('alert_triggered_at');
    table.integer('sla_threshold');
    table.timestamp('sla_deadline').notNullable();
    table.timestamps(true, true);
  });
}
