import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { InwardFile, SLAStatus, ProcessingStatus } from '../types';

/**
 * Inward File Repository
 * Handles all database operations for inward_files table
 */
export class InwardFileRepository extends BaseRepository {
  protected get tableName(): string {
    return 'inward_files';
  }

  /**
   * Find inward files by file source
   */
  async findByFileSource(fileSourceId: number): Promise<InwardFile[]> {
    return this.db(this.tableName)
      .where({ file_source_id: fileSourceId })
      .orderBy('detected_at', 'desc');
  }

  /**
   * Find files by SLA status
   */
  async findBySLAStatus(
    fileSourceId: number,
    slaStatus: SLAStatus
  ): Promise<InwardFile[]> {
    return this.db(this.tableName)
      .where({
        file_source_id: fileSourceId,
        sla_status: slaStatus,
      })
      .orderBy('detected_at', 'desc');
  }

  /**
   * Check if a file already exists (deduplication)
   * Used by Worker service to prevent duplicate file records
   */
  async checkDuplicate(
    fileSourceId: number,
    filePath: string,
    s3LastModified: Date
  ): Promise<boolean> {
    const existing = await this.db(this.tableName)
      .where({
        file_source_id: fileSourceId,
        file_path: filePath,
        s3_last_modified: s3LastModified,
      })
      .first();

    return !!existing;
  }

  /**
   * Create multiple files in batch
   * Used by Worker service when detecting multiple files
   */
  async createBatch(files: Partial<InwardFile>[]): Promise<InwardFile[]> {
    return this.db(this.tableName).insert(files).returning('*');
  }

  /**
   * Update SLA status
   */
  async updateSLAStatus(id: number, slaStatus: SLAStatus): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        sla_status: slaStatus,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Update processing status
   */
  async updateProcessingStatus(
    id: number,
    processingStatus: ProcessingStatus
  ): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        processing_status: processingStatus,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Find files with filters and pagination
   */
  async findWithFilters(options: {
    fileSourceId?: number;
    slaStatus?: SLAStatus;
    processingStatus?: ProcessingStatus;
    detectedAfter?: Date;
    detectedBefore?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    data: InwardFile[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    let query = this.db(this.tableName);

    if (options.fileSourceId) {
      query = query.where({ file_source_id: options.fileSourceId });
    }
    if (options.slaStatus) {
      query = query.where({ sla_status: options.slaStatus });
    }
    if (options.processingStatus) {
      query = query.where({ processing_status: options.processingStatus });
    }
    if (options.detectedAfter) {
      query = query.where('detected_at', '>=', options.detectedAfter);
    }
    if (options.detectedBefore) {
      query = query.where('detected_at', '<=', options.detectedBefore);
    }

    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    // Get total count
    const [{ count: total }] = await query.clone().count('* as count');
    const totalCount = parseInt(String(total), 10);

    // Get paginated data
    const data = await query
      .orderBy('detected_at', 'desc')
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
   * Find files with breached SLA
   */
  async findBreachedSLA(): Promise<InwardFile[]> {
    return this.db(this.tableName)
      .where({ sla_status: 'breached' as SLAStatus })
      .orderBy('sla_deadline', 'asc');
  }

  /**
   * Find files at risk of SLA breach
   */
  async findAtRiskSLA(): Promise<InwardFile[]> {
    return this.db(this.tableName)
      .where({ sla_status: 'at_risk' as SLAStatus })
      .orderBy('sla_deadline', 'asc');
  }
}
