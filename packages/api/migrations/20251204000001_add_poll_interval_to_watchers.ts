import { Knex } from 'knex';

/**
 * Migration: Add poll_interval_minutes to watchers table
 *
 * This field allows each watcher to have its own polling frequency,
 * independent of the file schedule frequency. This fixes the issue where
 * SLA calculations were incorrect because polling happened at the same
 * frequency as the file schedule.
 *
 * Example:
 * - Hourly file expected at 10:00 PM
 * - With poll_interval_minutes = 5, watcher runs every 5 minutes
 * - Can accurately detect if file arrived before or after 10:00 PM
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('watchers', (table) => {
    // Add poll_interval_minutes column
    // Default to 5 minutes for reasonable balance between accuracy and cost
    table.integer('poll_interval_minutes')
      .notNullable()
      .defaultTo(5)
      .comment('How often to poll this watcher (in minutes). Independent of file schedule.');
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON COLUMN watchers.poll_interval_minutes IS
    'Polling frequency in minutes. Defaults to 5 minutes. Lower values = more accurate SLA tracking but more API calls. Higher values = lower cost but less precise detection.';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('watchers', (table) => {
    table.dropColumn('poll_interval_minutes');
  });
}
