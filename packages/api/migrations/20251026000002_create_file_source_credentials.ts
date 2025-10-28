import { Knex } from 'knex';

/**
 * Migration: Create file_source_credentials table
 * Stores encrypted credentials for ALL file source types
 */
export async function up(knex: Knex): Promise<void> {
  // Enable uuid-ossp extension for UUID generation
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  await knex.schema.createTable('file_source_credentials', (table) => {
    // Primary key (UUID)
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Foreign key to file_sources
    table.integer('file_source_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('file_sources')
      .onDelete('CASCADE');

    // Credential type (matches file source type)
    table.enum('credential_type', [
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

    // Storage location
    table.enum('storage_method', ['secrets_manager', 'encrypted_db'])
      .notNullable();

    // Cloud secrets manager reference (if storage_method = 'secrets_manager')
    table.string('secret_id', 500); // ARN or secret name
    table.string('secret_version', 100);

    // Encrypted credentials (if storage_method = 'encrypted_db')
    // JSONB structure varies by credential_type
    table.jsonb('encrypted_credentials');

    // Encryption metadata
    table.string('encryption_algorithm', 50).defaultTo('AES-256-GCM');
    table.integer('encryption_key_version').defaultTo(1);
    table.text('encryption_iv');
    table.text('encryption_auth_tag');

    // Audit
    table.timestamps(true, true); // created_at, updated_at
    table.timestamp('last_used_at');
    table.timestamp('last_rotation_at');

    // Indexes
    table.index('file_source_id', 'idx_credentials_file_source');
    table.index('credential_type', 'idx_credentials_type');
    table.index('storage_method', 'idx_credentials_storage_method');

    // Unique constraint - one credential per file source
    table.unique('file_source_id', {
      indexName: 'unique_file_source_credential',
    });
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE file_source_credentials IS 'Stores encrypted credentials for all file source types. NEVER log or expose these fields!';
  `);

  // Add column comments
  await knex.raw(`
    COMMENT ON COLUMN file_source_credentials.encrypted_credentials IS 'JSONB with encrypted credential data. Structure varies by credential_type.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN file_source_credentials.storage_method IS 'Where credentials are stored: secrets_manager (AWS/GCP/Azure) or encrypted_db (local encryption)';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('file_source_credentials');
}
