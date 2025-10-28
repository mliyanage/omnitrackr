import { Knex } from 'knex';
import { PaginationParams, PaginationResult } from '../types/common.types';

/**
 * Base Repository
 * Provides common CRUD operations for all repositories
 */
export abstract class BaseRepository<T = any> {
  protected constructor(protected db: Knex) {}

  /**
   * Get the table name for this repository
   * Must be implemented by child classes
   */
  protected abstract get tableName(): string;

  /**
   * Find a single record by ID
   */
  async findById(id: number | string): Promise<T | undefined> {
    return this.db(this.tableName).where({ id }).first();
  }

  /**
   * Find all records matching the filter
   */
  async findAll(filters?: Partial<T>): Promise<T[]> {
    const query = this.db(this.tableName);

    if (filters) {
      query.where(filters);
    }

    return query.select('*');
  }

  /**
   * Find with pagination
   */
  async paginate(options: PaginationParams & { filters?: Partial<T> }): Promise<PaginationResult<T>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      filters,
    } = options;

    const offset = (page - 1) * limit;

    // Build base query
    const query = this.db(this.tableName);

    if (filters) {
      query.where(filters);
    }

    // Get total count
    const [{ count }] = await query.clone().count('* as count');
    const total = parseInt(count as string);

    // Get paginated data
    const data = await query
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset)
      .select('*');

    return {
      data: data as T[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    const [created] = await this.db(this.tableName).insert(data).returning('*');
    return created as T;
  }

  /**
   * Create multiple records
   */
  async createMany(data: Partial<T>[]): Promise<T[]> {
    const created = await this.db(this.tableName).insert(data).returning('*');
    return created as T[];
  }

  /**
   * Update a record by ID
   */
  async update(id: number | string, data: Partial<T>): Promise<T> {
    const [updated] = await this.db(this.tableName)
      .where({ id })
      .update({
        ...data,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return updated as T;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: number | string): Promise<boolean> {
    const deletedCount = await this.db(this.tableName).where({ id }).del();
    return deletedCount > 0;
  }

  /**
   * Check if a record exists
   */
  async exists(filters: Partial<T>): Promise<boolean> {
    const result = await this.db(this.tableName).where(filters).first();
    return !!result;
  }

  /**
   * Count records
   */
  async count(filters?: Partial<T>): Promise<number> {
    const query = this.db(this.tableName);

    if (filters) {
      query.where(filters);
    }

    const [{ count }] = await query.count('* as count');
    return parseInt(count as string);
  }

  /**
   * Execute within a transaction
   */
  async transaction<R>(callback: (trx: Knex.Transaction) => Promise<R>): Promise<R> {
    return this.db.transaction(callback);
  }
}
