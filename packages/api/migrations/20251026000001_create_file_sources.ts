import { Knex } from 'knex';

/**
 * Migration: Create file_sources table
 * This table stores all file source configurations (S3, SFTP, FTP, etc.)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('file_sources', (table) => {
    // Primary key
    table.increments('id').primary();

    // Basic Information
    table.string('name', 255).notNullable();
    table.enum('type', [
      'S3',
      'AZURE_BLOB',
      'GCS',
      'SFTP',
      'FTP',
      'FTPS',
      'SHAREPOINT',
      'REST_API',
      'DATABASE',
      'FILE_SHARE',
    ]).notNullable();
    table.enum('status', ['active', 'failed', 'pending', 'disabled'])
      .notNullable()
      .defaultTo('pending');
    table.boolean('enabled').notNullable().defaultTo(true);

    // Unified Connection Configuration (JSONB)
    // Structure varies by type - see FILE_SOURCES_SCHEMA_DESIGN.md
    table.jsonb('connection_config').notNullable();

    // File Pattern Matching (common to all types)
    table.string('file_name_pattern', 255);
    table.enum('match_rule', ['partial', 'exact', 'regex']);

    // Schedule Configuration (common to all types)
    table.string('schedule', 10); // Format: HH:MM (24-hour)
    table.string('timezone', 50).defaultTo('UTC');
    table.integer('poll_frequency_minutes'); // Alternative: polling interval in minutes

    // SLA Configuration (common to all types)
    table.integer('sla_threshold'); // Minutes

    // Metadata (common to all types)
    table.enum('direction', ['inward', 'outward', 'bidirectional']).defaultTo('inward');
    table.string('department', 100);

    // Sync Statistics (common to all types)
    table.timestamp('last_sync');
    table.enum('last_sync_status', ['success', 'failed', 'in_progress']);
    table.text('last_sync_error');
    table.decimal('success_rate', 5, 2).defaultTo(0.00);
    table.integer('files_processed').defaultTo(0);

    // Polling metadata
    table.integer('last_poll_duration_ms');
    table.integer('last_objects_scanned');
    table.integer('last_objects_detected');

    // Audit Fields
    table.timestamps(true, true); // created_at, updated_at
    table.string('created_by', 255);
    table.string('updated_by', 255);

    // Indexes
    table.index('type', 'idx_file_sources_type');
    table.index('status', 'idx_file_sources_status');
    table.index('department', 'idx_file_sources_department');
    table.index('enabled', 'idx_file_sources_enabled');
    table.index('schedule', 'idx_file_sources_schedule');
    table.index('last_sync', 'idx_file_sources_last_sync');

    // Unique constraint
    table.unique(['name', 'department'], {
      indexName: 'unique_name_per_department',
    });

    // GIN index for JSONB queries
    knex.raw('CREATE INDEX idx_file_sources_connection_config ON file_sources USING GIN (connection_config);');
  });

  // Add comment to table
  await knex.raw(`
    COMMENT ON TABLE file_sources IS 'Stores file source configurations for all types (S3, SFTP, FTP, etc.)';
  `);

  // Add comments to important columns
  await knex.raw(`
    COMMENT ON COLUMN file_sources.connection_config IS 'JSONB field storing type-specific configuration. Structure varies by type field.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN file_sources.poll_frequency_minutes IS 'How often to poll this source (in minutes). Alternative to schedule field.';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('file_sources');
}
