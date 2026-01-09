import { Knex } from 'knex';

/**
 * Migration: Add Authentication and Multi-Tenancy Tables
 * Phase 1: Core Authentication
 *
 * Creates:
 * - user_role enum
 * - organizations table
 * - users table (with 2FA and email verification)
 * - refresh_tokens table (session management)
 * - password_reset_tokens table
 * - email_verification_tokens table
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Create user_role enum
  await knex.raw(`
    CREATE TYPE user_role AS ENUM (
      'super_admin',      -- Platform administrators
      'owner',            -- Organization administrators
      'editor',           -- Can modify resources in assigned departments
      'viewer',           -- Read-only access to assigned departments
      'service_account'   -- Automated background processes
    );
  `);

  // 2. Create organizations table
  await knex.schema.createTable('organizations', (table) => {
    table.increments('id').primary();

    // Organization Identity
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.string('domain', 255);

    // Branding
    table.string('logo_url', 500);
    table.string('primary_color', 7); // Hex color code

    // Settings
    table.jsonb('settings').defaultTo('{}');

    // SSO Configuration (Future)
    table.boolean('sso_enabled').defaultTo(false);
    table.string('sso_provider', 50);
    table.jsonb('sso_config');

    // Subscription
    table.integer('max_users').defaultTo(50);
    table.integer('max_watchers');
    table.string('subscription_tier', 50).defaultTo('free');
    table.timestamp('subscription_expires_at');

    // Status
    table.string('status', 20).defaultTo('active');

    // Audit Fields
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.string('created_by', 255);
    table.string('updated_by', 255);
    table.timestamp('deleted_at');
  });

  // Indexes for organizations
  await knex.schema.raw('CREATE INDEX idx_organizations_slug ON organizations(slug)');
  await knex.schema.raw('CREATE INDEX idx_organizations_domain ON organizations(domain)');
  await knex.schema.raw('CREATE INDEX idx_organizations_status ON organizations(status)');
  await knex.schema.raw('CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at)');

  // 3. Create users table
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();

    // Foreign Keys
    table.integer('organization_id')
      .unsigned()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
    // NULL for super_admin users

    // Identity
    table.string('email', 255).notNullable().unique();
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('email_verified_at');

    // Authentication
    table.string('password_hash', 255).notNullable();
    table.timestamp('password_changed_at').defaultTo(knex.fn.now());
    table.timestamp('password_expires_at');

    // 2FA
    table.boolean('two_fa_enabled').defaultTo(false);
    table.string('two_fa_secret', 255);
    table.specificType('two_fa_backup_codes', 'TEXT[]');
    table.timestamp('two_fa_verified_at');

    // Profile
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.string('phone_number', 20);
    table.string('avatar_url', 500);
    table.string('timezone', 50).defaultTo('UTC');
    table.string('locale', 10).defaultTo('en-US');

    // Role
    table.specificType('role', 'user_role').notNullable().defaultTo('viewer');

    // Status
    table.string('status', 20).defaultTo('invited');

    // Login Tracking
    table.timestamp('last_login_at');
    table.string('last_login_ip', 45);
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('locked_until');

    // Security
    table.boolean('must_change_password').defaultTo(false);

    // SSO Identity
    table.string('sso_provider', 50);
    table.string('sso_subject', 255);

    // Audit Fields
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.string('created_by', 255);
    table.string('updated_by', 255);
    table.timestamp('deleted_at');
  });

  // Add constraint: super_admin must have NULL organization_id
  await knex.schema.raw(`
    ALTER TABLE users ADD CONSTRAINT check_super_admin_no_org CHECK (
      (role = 'super_admin' AND organization_id IS NULL) OR
      (role != 'super_admin' AND organization_id IS NOT NULL)
    );
  `);

  // Indexes for users
  await knex.schema.raw('CREATE INDEX idx_users_email ON users(email)');
  await knex.schema.raw('CREATE INDEX idx_users_org_id ON users(organization_id)');
  await knex.schema.raw('CREATE INDEX idx_users_role ON users(role)');
  await knex.schema.raw('CREATE INDEX idx_users_status ON users(status)');
  await knex.schema.raw('CREATE INDEX idx_users_deleted_at ON users(deleted_at)');
  await knex.schema.raw('CREATE INDEX idx_users_sso ON users(sso_provider, sso_subject)');

  // 4. Create refresh_tokens table
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.increments('id').primary();

    // Foreign Keys
    table.integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Token Data
    table.string('token_hash', 255).notNullable().unique();

    // Device Info
    table.string('device_name', 255);
    table.string('device_fingerprint', 255);
    table.string('ip_address', 45);
    table.text('user_agent');

    // Geolocation
    table.string('country', 2);
    table.string('city', 100);

    // Token Lifecycle
    table.timestamp('expires_at').notNullable();
    table.timestamp('last_used_at');
    table.timestamp('revoked_at');
    table.string('revoke_reason', 100);

    // Audit Fields
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Indexes for refresh_tokens
  await knex.schema.raw('CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id)');
  await knex.schema.raw('CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash)');
  await knex.schema.raw('CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at)');
  await knex.schema.raw('CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked_at)');

  // 5. Create password_reset_tokens table
  await knex.schema.createTable('password_reset_tokens', (table) => {
    table.increments('id').primary();

    // Foreign Keys
    table.integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Token Data
    table.string('token_hash', 255).notNullable().unique();

    // Lifecycle
    table.timestamp('expires_at').notNullable();
    table.timestamp('used_at');

    // Security
    table.string('ip_address', 45);
    table.text('user_agent');

    // Audit Fields
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Indexes for password_reset_tokens
  await knex.schema.raw('CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id)');
  await knex.schema.raw('CREATE INDEX idx_password_reset_token_hash ON password_reset_tokens(token_hash)');
  await knex.schema.raw('CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at)');

  // 6. Create email_verification_tokens table
  await knex.schema.createTable('email_verification_tokens', (table) => {
    table.increments('id').primary();

    // Foreign Keys
    table.integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Token Data
    table.string('token_hash', 255).notNullable().unique();

    // Lifecycle
    table.timestamp('expires_at').notNullable();
    table.timestamp('verified_at');

    // Audit Fields
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Indexes for email_verification_tokens
  await knex.schema.raw('CREATE INDEX idx_email_verification_user_id ON email_verification_tokens(user_id)');
  await knex.schema.raw('CREATE INDEX idx_email_verification_token_hash ON email_verification_tokens(token_hash)');

  console.log('✅ Phase 1 authentication tables created successfully');
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('email_verification_tokens');
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('organizations');

  // Drop enum
  await knex.raw('DROP TYPE IF EXISTS user_role CASCADE');

  console.log('✅ Phase 1 authentication tables dropped successfully');
}
