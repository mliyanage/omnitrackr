/**
 * Script to create a test organization and user for authentication testing
 * Run with: npx tsx scripts/create-test-user.ts
 */

import { db } from '../src/config/database';
import { hashPassword } from '../src/utils/password.utils';

async function createTestUser() {
  try {
    console.log('🔧 Creating test organization and user...\n');

    // Check if test org already exists
    const existingOrg = await db('organizations')
      .where({ slug: 'acme-corp' })
      .first();

    let orgId: number;

    if (existingOrg) {
      console.log('✓ Test organization already exists:', existingOrg.name);
      orgId = existingOrg.id;
    } else {
      // Create test organization
      const [org] = await db('organizations')
        .insert({
          name: 'Acme Corporation',
          slug: 'acme-corp',
          domain: 'acme.local',
          status: 'active',
          subscription_tier: 'enterprise',
          max_users: 100,
          settings: JSON.stringify({
            timezone: 'America/New_York',
            dateFormat: 'MM/DD/YYYY',
          }),
          created_at: db.fn.now(),
        })
        .returning('*');

      orgId = org.id;
      console.log('✓ Created test organization:', org.name);
    }

    // Check if test user already exists
    const existingUser = await db('users')
      .where({ email: 'test@acme.local' })
      .first();

    if (existingUser) {
      console.log('✓ Test user already exists:', existingUser.email);
      console.log('\n📧 Email:', existingUser.email);
      console.log('🔑 Password: Test123!@# (use this to login)');
      console.log('👤 Role:', existingUser.role);
      console.log('🏢 Organization ID:', existingUser.organization_id);
      console.log('✅ Email Verified:', existingUser.email_verified);
    } else {
      // Hash password: Test123!@#
      const passwordHash = await hashPassword('Test123!@#');

      // Create test user
      const [user] = await db('users')
        .insert({
          organization_id: orgId,
          email: 'test@acme.local',
          password_hash: passwordHash,
          first_name: 'Test',
          last_name: 'User',
          role: 'owner',
          status: 'active',
          email_verified: true,
          email_verified_at: db.fn.now(),
          timezone: 'America/New_York',
          created_at: db.fn.now(),
          created_by: 'system',
        })
        .returning('*');

      console.log('✓ Created test user:', user.email);
      console.log('\n📧 Email:', user.email);
      console.log('🔑 Password: Test123!@#');
      console.log('👤 Role:', user.role);
      console.log('🏢 Organization ID:', user.organization_id);
      console.log('✅ Email Verified:', user.email_verified);
    }

    console.log('\n✅ Test user setup complete!');
    console.log('\nYou can now test authentication with:');
    console.log('POST http://localhost:3000/api/auth/login');
    console.log('Body: { "email": "test@acme.local", "password": "Test123!@#" }');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

createTestUser();
