import type { Knex } from "knex";

/**
 * Migration: Fix users email unique constraint for multi-tenancy
 *
 * Changes the unique constraint from email alone to (email, organization_id) combination.
 * This allows the same email to exist in different organizations.
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Drop the existing unique constraint on email
  await knex.schema.raw(`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_email_unique
  `);

  // 2. Drop the index created for the unique constraint
  await knex.schema.raw(`
    DROP INDEX IF EXISTS users_email_unique
  `);

  // 3. Add a new unique constraint on (email, organization_id)
  // This allows the same email in different organizations
  // For super_admin users with NULL organization_id, email will still be unique
  await knex.schema.raw(`
    CREATE UNIQUE INDEX users_email_org_unique
    ON users(email, organization_id)
  `);

  console.log('✅ Fixed users email unique constraint for multi-tenancy');
}

export async function down(knex: Knex): Promise<void> {
  // 1. Drop the multi-tenant unique constraint
  await knex.schema.raw(`
    DROP INDEX IF EXISTS users_email_org_unique
  `);

  // 2. Restore the original unique constraint on email only
  await knex.schema.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_email_unique UNIQUE (email)
  `);

  console.log('✅ Reverted users email unique constraint to email only');
}

