import { Knex } from 'knex';

/**
 * Migration: Create file_tracking table
 * Tracks expected file arrivals and triggers alerts when files don't arrive
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('file_tracking', (table) => {
    // Primary key
    table.increments('id').primary();

    // Foreign key to file_sources
    table.integer('file_source_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('file_sources')
      .onDelete('CASCADE');

    // Expected arrival information
    table.string('expected_pattern', 255).notNullable(); // What file pattern we expect
    table.timestamp('expected_at').notNullable(); // When we expect it
    table.string('expected_schedule', 10); // Schedule that created this expectation (HH:MM)

    // Actual arrival tracking
    table.integer('actual_file_id')
      .unsigned()
      .references('id')
      .inTable('inward_files')
      .onDelete('SET NULL');
    table.timestamp('arrived_at');

    // Status
    table.enum('tracking_status', ['pending', 'arrived', 'late', 'missing'])
      .notNullable()
      .defaultTo('pending');

    // Alert information
    table.boolean('alert_triggered').notNullable().defaultTo(false);
    table.timestamp('alert_triggered_at');

    // SLA
    table.integer('sla_threshold'); // Minutes (copied from file_source)
    table.timestamp('sla_deadline').notNullable();

    // Audit
    table.timestamps(true, true); // created_at, updated_at

    // Indexes
    table.index('file_source_id', 'idx_file_tracking_source');
    table.index('tracking_status', 'idx_file_tracking_status');
    table.index('expected_at', 'idx_file_tracking_expected_at');
    table.index('sla_deadline', 'idx_file_tracking_sla_deadline');
    table.index(['alert_triggered', 'tracking_status'], 'idx_file_tracking_alerts');
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE file_tracking IS 'Tracks expected file arrivals. Worker service creates records based on schedules, monitors for missing files.';
  `);

  // Add column comments
  await knex.raw(`
    COMMENT ON COLUMN file_tracking.tracking_status IS 'File arrival status: pending (not arrived), arrived (on time), late (after deadline), missing (never arrived)';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('file_tracking');
}
