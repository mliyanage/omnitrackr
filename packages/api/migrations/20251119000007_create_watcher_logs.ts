import { Knex } from 'knex';

/**
 * Migration: Create watcher_logs table
 * Detailed polling history and audit trail
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('watcher_logs', (table) => {
    // Primary key (bigint for high volume)
    table.bigIncrements('id').primary();

    // Foreign Keys
    table.integer('watcher_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('watchers')
      .onDelete('CASCADE');

    table.integer('source_connection_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('source_connections')
      .onDelete('CASCADE');

    // Poll Execution
    table.timestamp('poll_started_at').notNullable();
    table.timestamp('poll_completed_at');
    table.integer('poll_duration_ms');

    // Poll Results
    table.specificType('poll_status', 'poll_status').notNullable();
    table.integer('objects_scanned').defaultTo(0);
    table.integer('files_detected').defaultTo(0);
    table.integer('files_new').defaultTo(0);
    table.integer('files_duplicate').defaultTo(0);

    // Error Information
    table.jsonb('error_details');

    // Performance Metrics
    table.integer('api_calls_made').defaultTo(0);
    table.bigInteger('bytes_transferred').defaultTo(0);

    // Connection Status at Poll Time
    table.specificType('connection_status_at_poll', 'connection_status');

    // Metadata
    table.specificType('triggered_by', 'trigger_type').notNullable().defaultTo('scheduler');
    table.string('triggered_by_user', 255);

    // Partitioning helper
    table.date('poll_date').notNullable();

    // Audit
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['watcher_id', 'poll_started_at'], 'idx_watcher_logs_watcher_time');
    table.index(['source_connection_id', 'poll_started_at'], 'idx_watcher_logs_conn_time');
    table.index('poll_status', 'idx_watcher_logs_status');
    table.index('poll_date', 'idx_watcher_logs_date');
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE watcher_logs IS 'Audit trail for all polling operations. Can be partitioned by poll_date for performance.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN watcher_logs.poll_date IS 'Date extracted from poll_started_at. Used for partitioning and retention policies.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN watcher_logs.error_details IS 'JSONB containing error details: { message, code, stack, context }';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('watcher_logs');
}
