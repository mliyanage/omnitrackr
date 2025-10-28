import type { Knex } from 'knex';

/**
 * Migration: Add customer_id to file_source_credentials for multi-tenant isolation
 *
 * This migration adds customer_id column to support multi-tenant SaaS architecture
 * where each customer's credentials are isolated and tagged.
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('file_source_credentials', (table) => {
    // Add customer_id for multi-tenant isolation
    table.string('customer_id', 255).notNullable().defaultTo('default-customer');

    // Add index for customer queries
    table.index('customer_id', 'idx_credentials_customer');
  });

  // Add comment
  await knex.raw(`
    COMMENT ON COLUMN file_source_credentials.customer_id IS
    'Customer identifier for multi-tenant isolation. Critical for security.'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('file_source_credentials', (table) => {
    table.dropIndex('customer_id', 'idx_credentials_customer');
    table.dropColumn('customer_id');
  });
}
