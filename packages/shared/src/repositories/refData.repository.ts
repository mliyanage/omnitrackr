import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { RefData, RefDataQueryOptions } from '../types';

/**
 * Reference Data Repository
 * Handles all database operations for ref_data table
 */
export class RefDataRepository extends BaseRepository {
  protected get tableName(): string {
    return 'ref_data';
  }

  /**
   * Find by code
   */
  async findByCode(code: string): Promise<RefData | undefined> {
    return this.db(this.tableName)
      .where({ code })
      .first();
  }

  /**
   * Find by code prefix (e.g., 'DEPARTMENT:', 'HOLIDAY_US_2025:')
   */
  async findByPrefix(prefix: string): Promise<RefData[]> {
    return this.db(this.tableName)
      .where('code', 'like', `${prefix}%`)
      .orderBy('code', 'asc');
  }

  /**
   * Get all departments
   */
  async getDepartments(): Promise<RefData[]> {
    return this.findByPrefix('DEPARTMENT:');
  }

  /**
   * Get all timezones
   */
  async getTimezones(): Promise<RefData[]> {
    return this.findByPrefix('TIMEZONE:');
  }

  /**
   * Get holidays for a calendar
   */
  async getHolidays(calendarCode: string): Promise<RefData[]> {
    return this.findByPrefix(`${calendarCode}:`);
  }

  /**
   * Get SLA thresholds
   */
  async getSLAThresholds(): Promise<RefData[]> {
    return this.findByPrefix('SLA_THRESHOLD:');
  }

  /**
   * Check if code exists
   */
  async codeExists(code: string): Promise<boolean> {
    const result = await this.db(this.tableName)
      .where({ code })
      .first();
    return !!result;
  }

  /**
   * Upsert (update or insert)
   */
  async upsert(data: Partial<RefData>): Promise<RefData> {
    const existing = await this.findByCode(data.code!);

    if (existing) {
      return this.update<RefData>(existing.id, {
        value1: data.value1,
        value2: data.value2,
        value3: data.value3,
        value4: data.value4,
        value5: data.value5,
        metadata: data.metadata,
        updated_by: data.updated_by,
      });
    } else {
      return this.create<RefData>(data);
    }
  }

  /**
   * Delete by code
   */
  async deleteByCode(code: string): Promise<boolean> {
    const count = await this.db(this.tableName)
      .where({ code })
      .del();
    return count > 0;
  }

  /**
   * Delete by prefix
   */
  async deleteByPrefix(prefix: string): Promise<number> {
    return this.db(this.tableName)
      .where('code', 'like', `${prefix}%`)
      .del();
  }

  /**
   * Get unique prefixes (categories)
   */
  async getCategories(): Promise<string[]> {
    const results = await this.db(this.tableName)
      .select(this.db.raw("SPLIT_PART(code, ':', 1) as category"))
      .distinct()
      .orderBy('category', 'asc');

    return results.map((r: any) => r.category);
  }

  /**
   * Find with query options
   */
  async findWithOptions(options: RefDataQueryOptions): Promise<{
    data: RefData[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = options.limit || 100;
    const offset = (page - 1) * limit;

    let query = this.db(this.tableName);

    if (options.code_prefix) {
      query = query.where('code', 'like', `${options.code_prefix}%`);
    }

    // Get total count
    const [{ count: total }] = await query.clone().count('* as count');
    const totalCount = parseInt(String(total), 10);

    // Get paginated data
    const data = await query
      .orderBy('code', 'asc')
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Bulk insert reference data
   */
  async bulkInsert(items: Partial<RefData>[]): Promise<RefData[]> {
    return this.db(this.tableName)
      .insert(items)
      .returning('*');
  }

  /**
   * Search by value
   */
  async searchByValue(searchTerm: string): Promise<RefData[]> {
    return this.db(this.tableName)
      .where(function() {
        this.where('value1', 'ilike', `%${searchTerm}%`)
          .orWhere('value2', 'ilike', `%${searchTerm}%`)
          .orWhere('code', 'ilike', `%${searchTerm}%`);
      })
      .orderBy('code', 'asc')
      .limit(50);
  }
}
