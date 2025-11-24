import { Knex } from 'knex';

/**
 * Migration: Create schedules table
 * Defines reusable, complex scheduling rules
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('schedules', (table) => {
    // Primary key
    table.increments('id').primary();

    // Identity
    table.string('name', 255).notNullable().unique();
    table.text('description');

    // Frequency Configuration
    table.specificType('frequency_type', 'frequency_type').notNullable();
    table.integer('interval').notNullable().defaultTo(1);

    // Time Configuration
    // ['09:00', '14:00', '18:00'] for multiple times per day
    // NULL for interval-based (e.g., every 15 mins)
    table.specificType('execution_times', 'text[]');

    // Day-based Rules
    // [1,2,3,4,5] = Mon-Fri, [0,6] = Sun,Sat (for weekly)
    table.specificType('days_of_week', 'integer[]');

    // 1-31 for monthly (e.g., 1 = first day)
    table.integer('day_of_month');

    // [1-5] or [-1] for last week
    // Examples: [1] = first week, [-1] = last week, [1, -1] = first AND last week
    table.specificType('week_of_month', 'integer[]');

    // Timezone
    table.string('timezone', 100).notNullable().defaultTo('UTC');

    // Active Period (optional)
    table.timestamp('valid_from');
    table.timestamp('valid_until');

    // Status
    table.boolean('enabled').notNullable().defaultTo(true);

    // Audit
    table.timestamps(true, true);
    table.string('created_by', 255);
    table.string('updated_by', 255);
    table.timestamp('deleted_at');

    // Indexes
    table.index('frequency_type', 'idx_schedules_frequency_type');
    table.index('enabled', 'idx_schedules_enabled');
    table.index('deleted_at', 'idx_schedules_deleted_at');
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE schedules IS 'Defines reusable scheduling rules. One schedule can be used by multiple watchers.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN schedules.execution_times IS 'Array of HH:MM times in 24-hour format. NULL for interval-based schedules.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN schedules.days_of_week IS 'Array of day numbers: 0=Sun, 1=Mon, ..., 6=Sat. NULL if not weekly.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN schedules.week_of_month IS 'Array of week numbers: 1-5 or -1 for last week. E.g., [1,-1] = first and last week.';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('schedules');
}
