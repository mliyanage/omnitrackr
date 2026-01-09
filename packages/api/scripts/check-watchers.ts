import { db } from '../src/config/database';

async function checkWatchers() {
  const watchers = await db('watchers')
    .whereNotNull('department_code')
    .select('id', 'name', 'department_code', 'department_id', 'organization_id');

  console.log('Watchers with department_code:');
  console.table(watchers);

  const departments = await db('departments').select('id', 'name', 'code');
  console.log('\nMigrated departments:');
  console.table(departments);

  await db.destroy();
}

checkWatchers().catch(console.error);
