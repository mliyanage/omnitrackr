import { Knex } from 'knex';

/**
 * Migration: Create schedule_exclusions table
 * Defines dates when schedules should NOT run (holidays, blackouts)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('schedule_exclusions', (table) => {
    // Primary key
    table.increments('id').primary();

    // Foreign key
    table.integer('schedule_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('schedules')
      .onDelete('CASCADE');

    // Exclusion Type
    table.specificType('exclusion_type', 'exclusion_type').notNullable();

    // Date Exclusions
    table.date('excluded_date'); // For specific_date
    table.date('excluded_from'); // For date_range
    table.date('excluded_to');   // For date_range

    // Holiday Calendar (references ref_data)
    table.string('holiday_calendar_code', 255); // FK -> ref_data.code

    // Metadata
    table.string('reason', 500);

    // Audit
    table.timestamps(true, true);
    table.string('created_by', 255);

    // Indexes
    table.index('schedule_id', 'idx_schedule_exclusions_schedule');
    table.index('excluded_date', 'idx_schedule_exclusions_date');
    table.index('holiday_calendar_code', 'idx_schedule_exclusions_calendar');
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE schedule_exclusions IS 'Defines dates/periods when a schedule should NOT run. Supports specific dates, date ranges, and holiday calendars.';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('schedule_exclusions');
}
