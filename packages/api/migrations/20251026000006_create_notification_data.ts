import { Knex } from 'knex';

/**
 * Migration: Create notification_data table
 * Queue of notification events created by Worker, processed by Notification Manager
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notification_data', (table) => {
    // Primary key
    table.increments('id').primary();

    // Event information
    table.string('event_type', 100).notNullable();
    table.enum('event_source', [
      's3_poller',
      'sftp_poller',
      'ftp_poller',
      'api_poller',
      'file_tracking',
      'system',
    ]).notNullable();

    // Related entities (nullable - depends on event type)
    table.integer('file_source_id')
      .unsigned()
      .references('id')
      .inTable('file_sources')
      .onDelete('CASCADE');

    table.integer('inward_file_id')
      .unsigned()
      .references('id')
      .inTable('inward_files')
      .onDelete('CASCADE');

    table.integer('file_tracking_id')
      .unsigned()
      .references('id')
      .inTable('file_tracking')
      .onDelete('CASCADE');

    // Target user/department
    table.integer('target_user_id');
    table.string('target_department', 100);

    // Event payload (flexible JSON structure)
    table.jsonb('payload').notNullable();

    // Processing status
    table.boolean('processed').notNullable().defaultTo(false);
    table.timestamp('processed_at');

    // Delivery tracking
    table.enum('delivery_status', [
      'pending',
      'processing',
      'delivered',
      'failed',
      'partially_delivered',
    ]).defaultTo('pending');
    table.integer('delivery_attempts').defaultTo(0);
    table.timestamp('last_delivery_attempt');

    // Delivery details (which channels succeeded/failed)
    table.jsonb('delivery_details');

    // Priority (1=highest, 10=lowest)
    table.integer('priority').defaultTo(5);

    // Retry configuration
    table.integer('retry_count').defaultTo(0);
    table.integer('max_retries').defaultTo(3);
    table.timestamp('next_retry_at');

    // Audit
    table.timestamps(true, true); // created_at, updated_at

    // Indexes
    table.index('processed', 'idx_notification_data_processed');
    table.index('file_source_id', 'idx_notification_data_file_source');
    table.index('event_type', 'idx_notification_data_event_type');
    table.index('created_at', 'idx_notification_data_created_at');
    table.index('delivery_status', 'idx_notification_data_delivery_status');
    table.index('priority', 'idx_notification_data_priority');

    // Partial index for unprocessed records (most common query)
    knex.raw(`
      CREATE INDEX idx_notification_data_unprocessed
      ON notification_data(created_at, priority)
      WHERE processed = false;
    `);

    // Partial index for retry queue
    knex.raw(`
      CREATE INDEX idx_notification_data_retry_queue
      ON notification_data(next_retry_at)
      WHERE next_retry_at IS NOT NULL AND processed = false;
    `);
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE notification_data IS 'Notification event queue. Worker creates events, Notification Manager processes them.';
  `);

  // Add column comments
  await knex.raw(`
    COMMENT ON COLUMN notification_data.payload IS 'JSONB event payload. Structure varies by event_type. Contains file details, error messages, etc.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN notification_data.delivery_details IS 'JSONB with delivery results per channel. Example: {"email":"sent","slack":"failed"}';
  `);

  await knex.raw(`
    COMMENT ON COLUMN notification_data.processed IS 'Set to true after Notification Manager processes the event (regardless of delivery success)';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_data');
}
