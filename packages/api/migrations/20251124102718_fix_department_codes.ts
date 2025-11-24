import type { Knex } from "knex";

/**
 * Migration: Fix department codes to use full names consistently
 * Updates DEPARTMENT:IT -> DEPARTMENT:Information Technology
 * Updates DEPARTMENT:HR -> DEPARTMENT:Human Resources
 * Adds metadata fields (is_active, sort_order) to all departments
 */
export async function up(knex: Knex): Promise<void> {
  // Update IT department to use full name
  const itDept = await knex('ref_data')
    .where('code', 'DEPARTMENT:IT')
    .first();

  if (itDept) {
    await knex('ref_data')
      .where('code', 'DEPARTMENT:IT')
      .update({
        code: 'DEPARTMENT:Information Technology',
        value1: 'Information Technology',
        metadata: JSON.stringify({
          description: 'IT Department',
          is_active: true,
          sort_order: 3,
        }),
      });
  }

  // Update HR department to use full name
  const hrDept = await knex('ref_data')
    .where('code', 'DEPARTMENT:HR')
    .first();

  if (hrDept) {
    await knex('ref_data')
      .where('code', 'DEPARTMENT:HR')
      .update({
        code: 'DEPARTMENT:Human Resources',
        value1: 'Human Resources',
        metadata: JSON.stringify({
          description: 'Human Resources Department',
          is_active: true,
          sort_order: 4,
        }),
      });
  }

  // Update existing departments to add metadata if missing
  const departments = [
    {
      code: 'DEPARTMENT:Finance',
      value1: 'Finance',
      sort_order: 1,
      description: 'Finance Department',
    },
    {
      code: 'DEPARTMENT:Operations',
      value1: 'Operations',
      sort_order: 2,
      description: 'Operations Department',
    },
    {
      code: 'DEPARTMENT:Sales',
      value1: 'Sales',
      sort_order: 5,
      description: 'Sales Department',
    },
  ];

  for (const dept of departments) {
    const existing = await knex('ref_data').where('code', dept.code).first();

    if (existing) {
      // Parse existing metadata if any
      let metadata: any = {};
      if (existing.metadata) {
        try {
          metadata = typeof existing.metadata === 'string'
            ? JSON.parse(existing.metadata)
            : existing.metadata;
        } catch (e) {
          metadata = {};
        }
      }

      // Update with merged metadata
      await knex('ref_data')
        .where('code', dept.code)
        .update({
          metadata: JSON.stringify({
            ...metadata,
            description: metadata.description || dept.description,
            is_active: metadata.is_active !== false,
            sort_order: metadata.sort_order || dept.sort_order,
          }),
        });
    }
  }
}

/**
 * Rollback: Revert to abbreviated codes
 */
export async function down(knex: Knex): Promise<void> {
  // Revert Information Technology to IT
  await knex('ref_data')
    .where('code', 'DEPARTMENT:Information Technology')
    .update({
      code: 'DEPARTMENT:IT',
      value1: 'Information Technology',
    });

  // Revert Human Resources to HR
  await knex('ref_data')
    .where('code', 'DEPARTMENT:Human Resources')
    .update({
      code: 'DEPARTMENT:HR',
      value1: 'Human Resources',
    });
}

