import {
  RefDataRepository,
  RefData,
  CreateRefDataRequest,
  UpdateRefDataRequest,
  RefDataQueryOptions,
} from '@omnitrackr/shared';
import { db } from '../config/database';
import { NotFoundError, ConflictError } from '../utils/errors';

/**
 * Reference Data Service
 * Business logic for managing reference/lookup data
 */
export class RefDataService {
  private repo: RefDataRepository;

  constructor() {
    this.repo = new RefDataRepository(db);
  }

  /**
   * Get all ref data with pagination
   */
  async getAll(options: RefDataQueryOptions = {}) {
    return this.repo.findWithOptions(options);
  }

  /**
   * Get by code
   */
  async getByCode(code: string): Promise<RefData> {
    const refData = await this.repo.findByCode(code);
    if (!refData) {
      throw new NotFoundError('Reference Data', code);
    }
    return refData;
  }

  /**
   * Get by prefix (category)
   */
  async getByPrefix(prefix: string): Promise<RefData[]> {
    return this.repo.findByPrefix(prefix);
  }

  /**
   * Create ref data
   */
  async create(request: CreateRefDataRequest, createdBy?: string): Promise<RefData> {
    // Check if code exists
    const exists = await this.repo.codeExists(request.code);
    if (exists) {
      throw new ConflictError(`Reference data with code '${request.code}' already exists`);
    }

    return this.repo.create<RefData>({
      code: request.code,
      value1: request.value1,
      value2: request.value2,
      value3: request.value3,
      value4: request.value4,
      value5: request.value5,
      metadata: request.metadata,
      created_by: createdBy,
    });
  }

  /**
   * Update ref data
   */
  async update(
    code: string,
    request: UpdateRefDataRequest,
    updatedBy?: string
  ): Promise<RefData> {
    const existing = await this.getByCode(code);

    return this.repo.update<RefData>(existing.id, {
      ...request,
      updated_by: updatedBy,
    });
  }

  /**
   * Delete ref data
   */
  async delete(code: string): Promise<void> {
    const deleted = await this.repo.deleteByCode(code);
    if (!deleted) {
      throw new NotFoundError('Reference Data', code);
    }
  }

  /**
   * Upsert ref data
   */
  async upsert(request: CreateRefDataRequest, updatedBy?: string): Promise<RefData> {
    return this.repo.upsert({
      ...request,
      updated_by: updatedBy,
    });
  }

  // Convenience methods for specific data types

  /**
   * Get all timezones
   */
  async getTimezones(): Promise<RefData[]> {
    return this.repo.getTimezones();
  }

  /**
   * Get holidays for a calendar
   */
  async getHolidays(calendarCode: string): Promise<RefData[]> {
    return this.repo.getHolidays(calendarCode);
  }

  /**
   * Get SLA thresholds
   */
  async getSLAThresholds(): Promise<RefData[]> {
    return this.repo.getSLAThresholds();
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    return this.repo.getCategories();
  }

  /**
   * Search ref data
   */
  async search(searchTerm: string): Promise<RefData[]> {
    return this.repo.searchByValue(searchTerm);
  }
}
