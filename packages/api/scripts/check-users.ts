import { db } from '../src/config/database';

async function checkUsers() {
  const users = await db('users')
    .select('id', 'email', 'first_name', 'last_name', 'role', 'status', 'organization_id', 'must_change_password', 'email_verified');

  console.log('Created users:');
  console.table(users);

  const organization = await db('organizations')
    .where({ created_by: 'migration' })
    .first();

  console.log('\nSystem Organization:');
  console.log(organization);

  await db.destroy();
}

checkUsers().catch(console.error);
