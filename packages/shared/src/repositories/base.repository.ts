import { Knex } from 'knex';

/**
 * Base Repository class providing common database operations
 * All specific repositories should extend this class
 */
export abstract class BaseRepository {
  constructor(protected db: Knex) {}

  /**
   * Override this in subclasses to specify the table name
   */
  protected abstract get tableName(): string;

  /**
   * Find a single record by ID
   */
  async findById<T>(id: number | string): Promise<T | undefined> {
    return this.db(this.tableName).where({ id }).first();
  }

  /**
   * Find all records with optional filters
   */
  async findAll<T>(filters?: Partial<T>): Promise<T[]> {
    let query = this.db(this.tableName);
    if (filters) {
      query = query.where(filters);
    }
    return query.orderBy('created_at', 'desc');
  }

  /**
   * Create a new record
   */
  async create<T>(data: Partial<T>): Promise<T> {
    const [result] = await this.db(this.tableName)
      .insert(data)
      .returning('*');
    return result;
  }

  /**
   * Update a record by ID
   */
  async update<T>(id: number | string, data: Partial<T>): Promise<T> {
    const [result] = await this.db(this.tableName)
      .where({ id })
      .update({
        ...data,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return result;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: number | string): Promise<boolean> {
    const count = await this.db(this.tableName).where({ id }).del();
    return count > 0;
  }

  /**
   * Count records with optional filters
   */
  async count(filters?: any): Promise<number> {
    let query = this.db(this.tableName).count('* as count');
    if (filters) {
      query = query.where(filters);
    }
    const [{ count }] = await query;
    return parseInt(String(count), 10);
  }

  /**
   * Check if a record exists
   */
  async exists(filters: any): Promise<boolean> {
    const count = await this.count(filters);
    return count > 0;
  }

  /**
   * Find records with pagination
   */
  async paginate<T>(options: {
    page?: number;
    limit?: number;
    filters?: Partial<T>;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  }): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const orderBy = options.orderBy || 'created_at';
    const orderDirection = options.orderDirection || 'desc';

    let query = this.db(this.tableName);
    if (options.filters) {
      query = query.where(options.filters);
    }

    // Get total count
    const [{ count: total }] = await query.clone().count('* as count');
    const totalCount = parseInt(String(total), 10);

    // Get paginated data
    const data = await query
      .orderBy(orderBy, orderDirection)
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
   * Execute within a transaction
   * Usage: await repository.transaction(async (trx) => { ... })
   */
  async transaction<T>(
    callback: (trx: Knex.Transaction) => Promise<T>
  ): Promise<T> {
    return this.db.transaction(callback);
  }
}
