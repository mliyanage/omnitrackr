import { Knex } from 'knex';

/**
 * Migration: Create source_connections table
 * Stores reusable connection configurations and credentials
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('source_connections', (table) => {
    // Primary key
    table.increments('id').primary();

    // Basic Info
    table.string('name', 255).notNullable().unique();
    table.specificType('type', 'source_type').notNullable();
    table.text('description');

    // Connection Configuration (JSONB - should be encrypted at application level)
    // For S3: { region, bucket, accessKeyId, secretAccessKey }
    // For SFTP: { host, port, username, password/keyPath }
    table.jsonb('connection_config').notNullable();

    // Connection Health
    table.specificType('connection_status', 'connection_status').notNullable().defaultTo('untested');
    table.timestamp('last_health_check');
    table.timestamp('last_successful_connection');
    table.text('health_check_error');

    // Security
    table.timestamp('credential_last_rotated');
    table.timestamp('credential_expires_at');

    // Control
    table.boolean('enabled').notNullable().defaultTo(true);

    // Audit
    table.timestamps(true, true);
    table.string('created_by', 255);
    table.string('updated_by', 255);
    table.timestamp('deleted_at');

    // Indexes
    table.index('type', 'idx_source_connections_type');
    table.index('connection_status', 'idx_source_connections_status');
    table.index('enabled', 'idx_source_connections_enabled');
    table.index('deleted_at', 'idx_source_connections_deleted_at');
  });

  // GIN index for JSONB queries
  await knex.raw(`
    CREATE INDEX idx_source_connections_config ON source_connections USING GIN (connection_config);
  `);

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE source_connections IS 'Stores reusable connection configurations. One connection can be shared by multiple watchers.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN source_connections.connection_config IS 'JSONB field storing type-specific connection details. Should be encrypted at application level.';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('source_connections');
}
