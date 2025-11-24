import { Knex } from 'knex';

/**
 * Migration: Create watchers table
 * Defines what files to watch and when (replaces file_sources)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('watchers', (table) => {
    // Primary key
    table.increments('id').primary();

    // Foreign Keys
    table.integer('source_connection_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('source_connections')
      .onDelete('CASCADE');

    table.integer('schedule_id')
      .unsigned()
      .references('id')
      .inTable('schedules')
      .onDelete('SET NULL');

    // Reference to ref_data for department
    table.string('department_code', 255);

    // Watcher Identity
    table.string('name', 255).notNullable();
    table.text('description');

    // File Pattern Matching
    table.string('file_name_pattern', 500);
    table.string('file_path_pattern', 1000);
    table.specificType('match_rule', 'match_rule').defaultTo('partial');

    // Last Check Info (lightweight status only)
    table.timestamp('last_check_at');
    table.specificType('last_check_status', 'check_status').defaultTo('never_run');
    table.integer('last_files_detected').defaultTo(0);

    // SLA Configuration
    table.boolean('sla_enabled').notNullable().defaultTo(false);
    table.integer('sla_threshold_minutes');

    // Metadata
    table.specificType('direction', 'direction_type').defaultTo('inward');
    table.string('owner_team', 255);

    // Status (consolidates enabled + polling_enabled)
    table.specificType('status', 'watcher_status').notNullable().defaultTo('active');

    // Statistics (summary only)
    table.integer('total_files_detected').notNullable().defaultTo(0);
    table.integer('total_polls_succeeded').notNullable().defaultTo(0);
    table.integer('total_polls_failed').notNullable().defaultTo(0);
    table.decimal('success_rate', 5, 2).defaultTo(0.00);

    // Audit
    table.timestamps(true, true);
    table.string('created_by', 255);
    table.string('updated_by', 255);
    table.timestamp('deleted_at');

    // Indexes
    table.index('source_connection_id', 'idx_watchers_connection');
    table.index('schedule_id', 'idx_watchers_schedule');
    table.index('department_code', 'idx_watchers_department');
    table.index('status', 'idx_watchers_status');
    table.index('last_check_at', 'idx_watchers_last_check');
    table.index('deleted_at', 'idx_watchers_deleted_at');

    // Unique constraint
    table.unique(['name', 'department_code'], {
      indexName: 'unique_watcher_name_per_department',
    });
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE watchers IS 'Defines what files to watch and when. References source_connections for credentials and schedules for timing.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN watchers.status IS 'Watcher status: active (enabled & polling), paused (enabled but not polling), error, disabled';
  `);

  await knex.raw(`
    COMMENT ON COLUMN watchers.department_code IS 'References ref_data.code where code LIKE ''DEPARTMENT:%''';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('watchers');
}
