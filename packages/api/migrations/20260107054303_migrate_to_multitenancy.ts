import type { Knex } from 'knex';
import bcrypt from 'bcrypt';

/**
 * Phase 6: Data Migration to Multi-Tenancy
 *
 * This migration:
 * 1. Creates default "System" organization
 * 2. Migrates ref_data departments to departments table
 * 3. Links existing watchers to department_id
 * 4. Creates default super admin user
 * 5. Creates default organization owner user
 */

export async function up(knex: Knex): Promise<void> {
  console.log('🚀 Starting Phase 6: Multi-Tenancy Data Migration...');

  // 1. Create default "System" organization
  console.log('📦 Creating default System organization...');
  const [systemOrg] = await knex('organizations')
    .insert({
      name: 'System Organization',
      slug: 'system',
      sso_enabled: false,
      settings: {},
      created_at: knex.fn.now(),
      created_by: 'migration',
    })
    .returning('*');

  console.log(`✅ Created organization: ${systemOrg.name} (ID: ${systemOrg.id})`);

  // 2. Migrate ref_data departments to departments table
  console.log('📁 Migrating departments from ref_data...');

  const refDataDepartments = await knex('ref_data')
    .where('code', 'like', 'DEPARTMENT:%')
    .select('*');

  console.log(`   Found ${refDataDepartments.length} departments to migrate`);

  const departmentMapping: Record<string, number> = {};

  for (const refDept of refDataDepartments) {
    // Parse metadata JSON
    const metadata = typeof refDept.metadata === 'string'
      ? JSON.parse(refDept.metadata)
      : refDept.metadata || {};

    const [newDept] = await knex('departments')
      .insert({
        organization_id: systemOrg.id,
        name: refDept.value1, // value1 is the full name
        code: refDept.value2, // value2 is the short code (FIN, OPS, IT, etc.)
        description: metadata.description || null,
        status: metadata.is_active ? 'active' : 'inactive',
        settings: {},
        created_at: knex.fn.now(),
        created_by: 'migration',
      })
      .returning('*');

    // Map the full ref_data code (e.g., "DEPARTMENT:Loyalty") to the new department ID for watcher linking
    departmentMapping[refDept.code] = newDept.id;
    console.log(`   ✓ Migrated: ${refDept.value1} (${refDept.value2}) → ID: ${newDept.id}`);
  }

  // 3. Link existing watchers to department_id
  console.log('🔗 Linking watchers to new department IDs...');

  const watchers = await knex('watchers')
    .whereNotNull('department_code')
    .select('id', 'name', 'department_code');

  console.log(`   Found ${watchers.length} watchers to link`);

  let linkedCount = 0;
  let skippedCount = 0;

  for (const watcher of watchers) {
    const departmentId = departmentMapping[watcher.department_code];

    if (departmentId) {
      await knex('watchers')
        .where({ id: watcher.id })
        .update({
          department_id: departmentId,
          organization_id: systemOrg.id,
          updated_at: knex.fn.now(),
          updated_by: 'migration',
        });
      linkedCount++;
    } else {
      console.log(`   ⚠️  Skipping watcher "${watcher.name}" - department_code "${watcher.department_code}" not found`);
      skippedCount++;
    }
  }

  console.log(`   ✓ Linked ${linkedCount} watchers to departments`);
  if (skippedCount > 0) {
    console.log(`   ⚠️  Skipped ${skippedCount} watchers (invalid department_code)`);
  }

  // 4. Link source_connections, schedules to organization
  console.log('🔗 Linking source_connections to organization...');
  const connectionsCount = await knex('source_connections')
    .update({
      organization_id: systemOrg.id,
      updated_at: knex.fn.now(),
      updated_by: 'migration',
    });
  console.log(`   ✓ Linked ${connectionsCount} source connections`);

  console.log('🔗 Linking schedules to organization...');
  const schedulesCount = await knex('schedules')
    .update({
      organization_id: systemOrg.id,
      updated_at: knex.fn.now(),
      updated_by: 'migration',
    });
  console.log(`   ✓ Linked ${schedulesCount} schedules`);

  // 5. Link file_tracking to organization (via watchers)
  console.log('🔗 Linking file_tracking records to organization...');
  const fileTrackingCount = await knex('file_tracking')
    .update({
      organization_id: systemOrg.id,
      updated_at: knex.fn.now(),
    });
  console.log(`   ✓ Linked ${fileTrackingCount} file tracking records`);

  // 6. Create default super admin user
  console.log('👤 Creating default super admin user...');

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@omnitrackr.local';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
  const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, 12);

  // Check if super admin already exists
  const existingSuperAdmin = await knex('users')
    .where({ email: superAdminEmail })
    .first();

  let superAdminId: number;

  if (existingSuperAdmin) {
    console.log(`   ℹ️  Super admin already exists: ${superAdminEmail}`);
    superAdminId = existingSuperAdmin.id;
  } else {
    const [superAdmin] = await knex('users')
      .insert({
        email: superAdminEmail,
        email_verified: true,
        email_verified_at: knex.fn.now(),
        password_hash: superAdminPasswordHash,
        password_changed_at: knex.fn.now(),
        first_name: 'Super',
        last_name: 'Admin',
        timezone: 'UTC',
        locale: 'en',
        role: 'super_admin',
        status: 'active',
        two_fa_enabled: false,
        failed_login_attempts: 0,
        must_change_password: true, // Force password change on first login
        created_at: knex.fn.now(),
        created_by: 'migration',
      })
      .returning('*');

    superAdminId = superAdmin.id;
    console.log(`   ✅ Created super admin: ${superAdminEmail}`);
    console.log(`   🔑 Default password: ${superAdminPassword}`);
    console.log(`   ⚠️  IMPORTANT: Change password on first login!`);
  }

  // 7. Create default organization owner
  console.log('👤 Creating default organization owner...');

  const ownerEmail = process.env.ORG_OWNER_EMAIL || 'owner@omnitrackr.local';
  const ownerPassword = process.env.ORG_OWNER_PASSWORD || 'OrgOwner123!';
  const ownerPasswordHash = await bcrypt.hash(ownerPassword, 12);

  // Check if owner already exists
  const existingOwner = await knex('users')
    .where({ email: ownerEmail })
    .first();

  if (existingOwner) {
    console.log(`   ℹ️  Organization owner already exists: ${ownerEmail}`);
  } else {
    const [owner] = await knex('users')
      .insert({
        organization_id: systemOrg.id,
        email: ownerEmail,
        email_verified: true,
        email_verified_at: knex.fn.now(),
        password_hash: ownerPasswordHash,
        password_changed_at: knex.fn.now(),
        first_name: 'Organization',
        last_name: 'Owner',
        timezone: 'UTC',
        locale: 'en',
        role: 'owner',
        status: 'active',
        two_fa_enabled: false,
        failed_login_attempts: 0,
        must_change_password: true, // Force password change on first login
        created_at: knex.fn.now(),
        created_by: 'migration',
      })
      .returning('*');

    console.log(`   ✅ Created organization owner: ${ownerEmail}`);
    console.log(`   🔑 Default password: ${ownerPassword}`);
    console.log(`   ⚠️  IMPORTANT: Change password on first login!`);
  }

  console.log('');
  console.log('✅ Phase 6: Multi-Tenancy Data Migration Complete!');
  console.log('');
  console.log('📊 Migration Summary:');
  console.log(`   - Created organization: ${systemOrg.name} (ID: ${systemOrg.id})`);
  console.log(`   - Migrated ${refDataDepartments.length} departments`);
  console.log(`   - Linked ${linkedCount} watchers to departments`);
  console.log(`   - Linked ${connectionsCount} source connections`);
  console.log(`   - Linked ${schedulesCount} schedules`);
  console.log(`   - Linked ${fileTrackingCount} file tracking records`);
  console.log(`   - Super Admin: ${superAdminEmail}`);
  console.log(`   - Org Owner: ${ownerEmail}`);
  console.log('');
  console.log('⚠️  NEXT STEPS:');
  console.log('   1. Login with super admin or owner credentials');
  console.log('   2. Change default passwords immediately');
  console.log('   3. Create additional users via /api/users/invite');
  console.log('   4. Assign users to departments');
  console.log('');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Rolling back Phase 6: Multi-Tenancy Data Migration...');

  // Remove organization_id and department_id from existing tables
  await knex('file_tracking')
    .update({
      organization_id: null,
      updated_at: knex.fn.now(),
    });

  await knex('schedules')
    .update({
      organization_id: null,
      updated_at: knex.fn.now(),
      updated_by: 'rollback',
    });

  await knex('source_connections')
    .update({
      organization_id: null,
      updated_at: knex.fn.now(),
      updated_by: 'rollback',
    });

  await knex('watchers')
    .update({
      organization_id: null,
      department_id: null,
      updated_at: knex.fn.now(),
      updated_by: 'rollback',
    });

  // Delete migrated departments (this will cascade delete user_departments)
  await knex('departments')
    .where({ created_by: 'migration' })
    .delete();

  // Delete default users
  await knex('users')
    .where({ created_by: 'migration' })
    .delete();

  // Delete default organization
  await knex('organizations')
    .where({ created_by: 'migration' })
    .delete();

  console.log('✅ Rollback complete');
}
