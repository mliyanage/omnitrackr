import { Knex } from 'knex';

/**
 * Migration: Create ref_data table
 * Generic reference/lookup table for departments, holidays, timezones, etc.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ref_data', (table) => {
    // Primary key
    table.increments('id').primary();

    // Key for lookup (hierarchical)
    table.string('code', 255).notNullable().unique();

    // Values (up to 5)
    table.string('value1', 500);
    table.string('value2', 500);
    table.string('value3', 500);
    table.string('value4', 500);
    table.string('value5', 500);

    // Flexible JSON for additional attributes
    table.jsonb('metadata');

    // Audit
    table.timestamps(true, true);
    table.string('created_by', 255);
    table.string('updated_by', 255);

    // Indexes
    table.index('code', 'idx_ref_data_code');
    table.index('value1', 'idx_ref_data_value1');
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE ref_data IS 'Generic reference/lookup data table for departments, holidays, timezones, SLA thresholds, etc.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN ref_data.code IS 'Hierarchical key for lookup. Format: TYPE:NAME (e.g., DEPARTMENT:Finance, HOLIDAY_US_2025:Christmas)';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ref_data');
}
