import { Knex } from 'knex';

/**
 * Migration: Create alert_comments table
 * User comments and notes on alerts
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('alert_comments', (table) => {
    // Primary key
    table.increments('id').primary();

    // Foreign Keys
    table
      .integer('alert_history_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('alert_history')
      .onDelete('CASCADE');

    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Comment
    table.text('comment').notNullable();

    // Audit
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    // Indexes
    table.index('alert_history_id', 'idx_alert_comments_alert_history_id');
    table.index('user_id', 'idx_alert_comments_user_id');
    table.index('created_at', 'idx_alert_comments_created_at');
    table.index('deleted_at', 'idx_alert_comments_deleted_at');
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE alert_comments IS 'User comments and notes on alert notifications for collaboration and incident documentation.';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('alert_comments');
}
