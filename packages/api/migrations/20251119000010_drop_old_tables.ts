import { Knex } from 'knex';

/**
 * Migration: Drop old tables
 * Removes file_sources, inward_files, and file_source_credentials tables
 *
 * IMPORTANT: This migration should only be run after:
 * 1. All data has been migrated to new tables (if needed)
 * 2. All code has been updated to use new tables
 * 3. The system has been tested thoroughly
 */
export async function up(knex: Knex): Promise<void> {
  // First, drop foreign key constraints from notification_data if they exist
  const hasNotificationTable = await knex.schema.hasTable('notification_data');
  if (hasNotificationTable) {
    // Drop constraints safely using raw SQL with IF EXISTS
    try {
      await knex.raw('ALTER TABLE notification_data DROP CONSTRAINT IF EXISTS notification_data_file_source_id_foreign');
    } catch (e) {
      console.log('Constraint notification_data_file_source_id_foreign does not exist or already dropped');
    }

    try {
      await knex.raw('ALTER TABLE notification_data DROP CONSTRAINT IF EXISTS notification_data_inward_file_id_foreign');
    } catch (e) {
      console.log('Constraint notification_data_inward_file_id_foreign does not exist or already dropped');
    }
  }

  // Drop tables in correct order (child tables first due to FK constraints)

  // Drop inward_files (references file_sources)
  await knex.schema.dropTableIfExists('inward_files');

  // Drop file_source_credentials (references file_sources)
  await knex.schema.dropTableIfExists('file_source_credentials');

  // Drop file_sources (parent table)
  await knex.schema.dropTableIfExists('file_sources');

  // Log the cleanup
  console.log('Dropped old tables: file_sources, inward_files, file_source_credentials');
}

/**
 * Rollback migration
 *
 * WARNING: This rollback will recreate empty tables.
 * Data from the old tables will be lost permanently.
 */
export async function down(knex: Knex): Promise<void> {
  // Recreate file_sources table (simplified version)
  await knex.schema.createTable('file_sources', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.enum('type', [
      'S3', 'AZURE_BLOB', 'GCS', 'SFTP', 'FTP', 'FTPS',
      'SHAREPOINT', 'REST_API', 'DATABASE', 'FILE_SHARE',
    ]).notNullable();
    table.enum('status', ['active', 'failed', 'pending', 'disabled'])
      .notNullable().defaultTo('pending');
    table.boolean('enabled').notNullable().defaultTo(true);
    table.jsonb('connection_config').notNullable();
    table.string('file_name_pattern', 255);
    table.enum('match_rule', ['partial', 'exact', 'regex']);
    table.string('schedule', 10);
    table.string('timezone', 50).defaultTo('UTC');
    table.integer('poll_frequency_minutes');
    table.integer('sla_threshold');
    table.enum('direction', ['inward', 'outward', 'bidirectional']).defaultTo('inward');
    table.string('department', 100);
    table.timestamp('last_sync');
    table.enum('last_sync_status', ['success', 'failed', 'in_progress']);
    table.text('last_sync_error');
    table.decimal('success_rate', 5, 2).defaultTo(0.00);
    table.integer('files_processed').defaultTo(0);
    table.integer('last_poll_duration_ms');
    table.integer('last_objects_scanned');
    table.integer('last_objects_detected');
    table.timestamps(true, true);
    table.string('created_by', 255);
    table.string('updated_by', 255);
    table.unique(['name', 'department']);
  });

  // Recreate inward_files table (simplified version)
  await knex.schema.createTable('inward_files', (table) => {
    table.increments('id').primary();
    table.integer('file_source_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('file_sources')
      .onDelete('CASCADE');
    table.string('file_name', 500).notNullable();
    table.string('file_path', 1000);
    table.bigInteger('file_size');
    table.timestamp('detected_at').notNullable();
    table.string('file_hash', 64);
    table.enum('status', ['detected', 'processing', 'processed', 'failed'])
      .notNullable().defaultTo('detected');
    table.timestamps(true, true);
  });

  // Recreate file_source_credentials table (simplified version)
  await knex.schema.createTable('file_source_credentials', (table) => {
    table.increments('id').primary();
    table.integer('file_source_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('file_sources')
      .onDelete('CASCADE');
    table.string('credential_type', 50).notNullable();
    table.text('encrypted_value').notNullable();
    table.timestamps(true, true);
  });

  console.log('Recreated old tables: file_sources, inward_files, file_source_credentials');
}
