import { Knex } from 'knex';

/**
 * Migration: Create alert_history table
 * Complete audit trail of all alerts sent, delivery status, and acknowledgments
 */
export async function up(knex: Knex): Promise<void> {
  // Create delivery_status enum
  await knex.raw(`
    CREATE TYPE delivery_status AS ENUM (
      'pending',
      'processing',
      'delivered',
      'failed',
      'partially_delivered'
    );
  `);

  await knex.schema.createTable('alert_history', (table) => {
    // Primary key
    table.increments('id').primary();

    // Alert Context
    table
      .integer('alert_config_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('alert_configs')
      .onDelete('CASCADE');

    table
      .integer('file_tracking_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('file_tracking')
      .onDelete('CASCADE');

    table
      .integer('watcher_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('watchers')
      .onDelete('CASCADE');

    // Alert Details
    table
      .specificType('alert_type', 'alert_type')
      .notNullable()
      .comment('Type: sla_breached, sla_at_risk, file_arrived_late');

    table.text('alert_message').notNullable();

    table
      .jsonb('alert_context')
      .notNullable()
      .comment('Full context: watcher name, file pattern, expected time, etc.');

    // Escalation Tracking
    table
      .integer('escalation_level')
      .notNullable()
      .defaultTo(0)
      .comment('0=initial alert, 1+=escalation levels');

    table
      .integer('escalation_to_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('alert_escalations')
      .onDelete('SET NULL');

    // Delivery Status
    table
      .specificType('delivery_status', 'delivery_status')
      .notNullable()
      .defaultTo('pending');

    table
      .jsonb('delivery_details')
      .nullable()
      .comment('Per-channel delivery results');

    table.integer('delivery_attempts').defaultTo(0);
    table.timestamp('last_delivery_attempt').nullable();
    table.timestamp('delivered_at').nullable();

    // Acknowledgment
    table.boolean('acknowledged').notNullable().defaultTo(false);
    table.timestamp('acknowledged_at').nullable();
    table
      .integer('acknowledged_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.text('acknowledgment_note').nullable();

    // Retry & Priority
    table.integer('retry_count').defaultTo(0);
    table.integer('max_retries').defaultTo(3);
    table.timestamp('next_retry_at').nullable();
    table.integer('priority').defaultTo(5).comment('1=highest, 10=lowest');

    // Audit
    table.timestamps(true, true);

    // Indexes
    table.index('alert_config_id', 'idx_alert_history_alert_config_id');
    table.index('file_tracking_id', 'idx_alert_history_file_tracking_id');
    table.index('watcher_id', 'idx_alert_history_watcher_id');
    table.index('delivery_status', 'idx_alert_history_delivery_status');
    table.index('acknowledged', 'idx_alert_history_acknowledged');
    table.index('created_at', 'idx_alert_history_created_at');
    table.index(
      ['acknowledged', 'next_retry_at'],
      'idx_alert_history_escalation_check'
    );
  });

  // Partial index for unacknowledged alerts pending escalation
  await knex.raw(`
    CREATE INDEX idx_alert_history_pending_escalation
    ON alert_history(created_at, escalation_level)
    WHERE acknowledged = false
    AND delivery_status IN ('delivered', 'partially_delivered');
  `);

  // Partial index for failed alerts needing retry
  await knex.raw(`
    CREATE INDEX idx_alert_history_pending_retry
    ON alert_history(next_retry_at, priority)
    WHERE delivery_status = 'failed'
    AND retry_count < max_retries;
  `);

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE alert_history IS 'Complete audit trail of all alert notifications sent, delivery status, and acknowledgments.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN alert_history.alert_context IS 'Full alert context including watcher details, file info, SLA deadlines';
  `);

  await knex.raw(`
    COMMENT ON COLUMN alert_history.escalation_level IS '0=initial alert, 1=first escalation, 2=second escalation, etc.';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('alert_history');
  await knex.raw('DROP TYPE IF EXISTS delivery_status;');
}
