/**
 * Inward File Types
 * Types for detected inward files
 */

export type SLAStatus = 'on_time' | 'at_risk' | 'breached' | 'not_applicable';
export type ProcessingStatus = 'detected' | 'processing' | 'completed' | 'failed';

/**
 * Inward File Entity (database model)
 */
export interface InwardFile {
  id: number;
  file_source_id: number;

  // File information
  file_name: string;
  file_path: string;
  file_size?: number;
  file_hash?: string;

  // Source-specific metadata
  s3_metadata?: Record<string, any>;

  // Timestamps
  detected_at: Date;
  s3_last_modified?: Date;

  // SLA tracking
  sla_deadline?: Date;
  sla_status: SLAStatus;

  // Processing
  processing_status: ProcessingStatus;

  // Audit
  created_at: Date;
  updated_at: Date;
}

/**
 * Create Inward File (for bulk insert)
 */
export interface CreateInwardFileData {
  file_source_id: number;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_hash?: string;
  s3_metadata?: Record<string, any>;
  s3_last_modified?: Date;
  sla_deadline?: Date;
  sla_status?: SLAStatus;
}
