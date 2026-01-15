import { Knex } from 'knex';

/**
 * Migration: Create alert_recipient_groups table
 * Reusable recipient groups/distribution lists
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('alert_recipient_groups', (table) => {
    // Primary key
    table.increments('id').primary();

    // Foreign Keys
    table
      .integer('organization_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    // Identity
    table.string('name', 100).notNullable();
    table.text('description').nullable();

    // Email addresses
    table.specificType('email_addresses', 'text[]').notNullable();

    // Future: User IDs for internal users
    table
      .specificType('user_ids', 'integer[]')
      .nullable()
      .comment('Internal user IDs (future feature)');

    // Audit
    table.timestamps(true, true);
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.timestamp('deleted_at').nullable();

    // Indexes
    table.index(
      'organization_id',
      'idx_alert_recipient_groups_organization_id'
    );
    table.index('deleted_at', 'idx_alert_recipient_groups_deleted_at');

    // Unique constraint: organization + name (excluding soft deleted)
    table.unique(['organization_id', 'name', 'deleted_at'], {
      indexName: 'unique_alert_recipient_group_org_name',
    });
  });

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE alert_recipient_groups IS 'Reusable recipient groups (distribution lists) for alert notifications.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN alert_recipient_groups.email_addresses IS 'Array of email addresses in this group';
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('alert_recipient_groups');
}
