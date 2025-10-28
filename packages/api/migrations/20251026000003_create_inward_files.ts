import { Knex } from 'knex';

/**
 * Migration: Create inward_files table
 * Tracks detected inward files from all file sources
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('inward_files', (table) => {
    // Primary key
    table.increments('id').primary();

    // Foreign key to file_sources
    table.integer('file_source_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('file_sources')
      .onDelete('CASCADE');

    // File Information
    table.string('file_name', 500).notNullable();
    table.string('file_path', 1000).notNullable(); // Full path/key
    table.bigInteger('file_size'); // bytes
    table.string('file_hash', 64); // Optional: for deduplication

    // Source-specific Metadata (JSONB for flexibility)
    // For S3: ETag, StorageClass, LastModified, etc.
    // For SFTP: permissions, owner, etc.
    table.jsonb('s3_metadata');

    // Timestamps
    table.timestamp('detected_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('s3_last_modified'); // From source metadata

    // SLA Tracking
    table.timestamp('sla_deadline');
    table.enum('sla_status', ['on_time', 'at_risk', 'breached', 'not_applicable'])
      .notNullable()
      .defaultTo('not_applicable');

    // Processing Status
    table.enum('processing_status', ['detected', 'processing', 'completed', 'failed'])
      .notNullable()
      .defaultTo('detected');

    // Audit
    table.timestamps(true, true); // created_at, updated_at

    // Indexes
    table.index('file_source_id', 'idx_inward_files_source');
    table.index('detected_at', 'idx_inward_files_detected_at');
    table.index('sla_status', 'idx_inward_files_sla_status');
    table.index('processing_status', 'idx_inward_files_processing_status');
    table.index('sla_deadline', 'idx_inward_files_sla_deadline');

    // Unique constraint - prevent duplicate file records
    table.unique(['file_source_id', 'file_path', 's3_last_modified'], {
      indexName: 'unique_file_per_source',
    });
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE inward_files IS 'Tracks all detected inward files from file sources. Used by Worker service.';
  `);

  // Add column comments
  await knex.raw(`
    COMMENT ON COLUMN inward_files.s3_metadata IS 'Source-specific metadata in JSONB format. For S3: ETag, StorageClass, etc.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN inward_files.sla_status IS 'SLA compliance status: on_time, at_risk, breached, or not_applicable';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('inward_files');
}
