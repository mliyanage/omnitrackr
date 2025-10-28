import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { InwardFile, CreateInwardFileData, SLAStatus, ProcessingStatus } from '../types/inwardFile.types';

/**
 * Inward File Repository
 * Handles database operations for detected inward files
 */
export class InwardFileRepository extends BaseRepository<InwardFile> {
  constructor(db: Knex) {
    super(db);
  }

  protected get tableName(): string {
    return 'inward_files';
  }

  /**
   * Find files by source ID
   */
  async findBySourceId(fileSourceId: number): Promise<InwardFile[]> {
    return this.db(this.tableName)
      .where({ file_source_id: fileSourceId })
      .orderBy('detected_at', 'desc')
      .select('*');
  }

  /**
   * Find files by SLA status
   */
  async findBySLAStatus(slaStatus: SLAStatus): Promise<InwardFile[]> {
    return this.db(this.tableName)
      .where({ sla_status: slaStatus })
      .orderBy('sla_deadline', 'asc')
      .select('*');
  }

  /**
   * Find files at risk (SLA deadline approaching)
   */
  async findAtRisk(minutesUntilDeadline: number = 30): Promise<InwardFile[]> {
    return this.db(this.tableName)
      .where({ sla_status: 'on_time' })
      .whereNotNull('sla_deadline')
      .whereRaw(
        'EXTRACT(EPOCH FROM (sla_deadline - NOW()))/60 <= ?',
        [minutesUntilDeadline]
      )
      .select('*');
  }

  /**
   * Check if file already exists (for deduplication)
   */
  async checkDuplicate(
    fileSourceId: number,
    filePath: string,
    s3LastModified?: Date
  ): Promise<boolean> {
    const query = this.db(this.tableName)
      .where({
        file_source_id: fileSourceId,
        file_path: filePath,
      });

    if (s3LastModified) {
      query.where({ s3_last_modified: s3LastModified });
    }

    const result = await query.first();
    return !!result;
  }

  /**
   * Create multiple files (bulk insert for performance)
   */
  async createBatch(files: CreateInwardFileData[]): Promise<InwardFile[]> {
    return this.createMany(files as Partial<InwardFile>[]);
  }

  /**
   * Update SLA status
   */
  async updateSLAStatus(id: number, slaStatus: SLAStatus): Promise<InwardFile> {
    const [updated] = await this.db(this.tableName)
      .where({ id })
      .update({
        sla_status: slaStatus,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return updated;
  }

  /**
   * Update processing status
   */
  async updateProcessingStatus(id: number, processingStatus: ProcessingStatus): Promise<InwardFile> {
    const [updated] = await this.db(this.tableName)
      .where({ id })
      .update({
        processing_status: processingStatus,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return updated;
  }

  /**
   * Find files detected within a date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<InwardFile[]> {
    return this.db(this.tableName)
      .whereBetween('detected_at', [startDate, endDate])
      .orderBy('detected_at', 'desc')
      .select('*');
  }

  /**
   * Get statistics for a file source
   */
  async getSourceStatistics(fileSourceId: number): Promise<{
    total: number;
    byStatus: Record<ProcessingStatus, number>;
    bySLA: Record<SLAStatus, number>;
    avgFileSize: number;
  }> {
    const files = await this.findBySourceId(fileSourceId);
    
    const byStatus: any = {};
    const bySLA: any = {};
    let totalSize = 0;
    let filesWithSize = 0;

    files.forEach(file => {
      byStatus[file.processing_status] = (byStatus[file.processing_status] || 0) + 1;
      bySLA[file.sla_status] = (bySLA[file.sla_status] || 0) + 1;
      
      if (file.file_size) {
        totalSize += file.file_size;
        filesWithSize++;
      }
    });

    return {
      total: files.length,
      byStatus,
      bySLA,
      avgFileSize: filesWithSize > 0 ? Math.round(totalSize / filesWithSize) : 0,
    };
  }
}
