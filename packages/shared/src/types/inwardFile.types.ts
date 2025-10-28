/**
 * Inward File Types
 * Shared types for inward files across all services
 */

export type SLAStatus = 'on_time' | 'at_risk' | 'breached' | 'not_applicable';
export type ProcessingStatus = 'detected' | 'processing' | 'completed' | 'failed';

/**
 * S3 Metadata
 */
export interface S3Metadata {
  etag: string;
  storageClass: string;
  lastModified: string;
  contentType?: string;
  contentLength?: number;
}

/**
 * Inward File Entity (database model)
 */
export interface InwardFile {
  id: number;
  file_source_id: number;

  // File information
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_hash?: string | null;

  // S3 metadata
  s3_metadata?: S3Metadata | null;

  // Timestamps
  detected_at: Date;
  s3_last_modified?: Date | null;

  // SLA tracking
  sla_deadline?: Date | null;
  sla_status: SLAStatus;

  // Processing status
  processing_status: ProcessingStatus;

  // Audit
  created_at: Date;
  updated_at: Date;
}

/**
 * File Tracking Entity
 */
export interface FileTracking {
  id: number;
  file_source_id: number;

  // Expected arrival information
  expected_pattern: string;
  expected_at: Date;
  expected_schedule: string;

  // Actual arrival tracking
  actual_file_id?: number | null;
  arrived_at?: Date | null;

  // Status
  tracking_status: 'pending' | 'arrived' | 'late' | 'missing';

  // Alert information
  alert_triggered: boolean;
  alert_triggered_at?: Date | null;

  // SLA
  sla_threshold: number; // minutes
  sla_deadline: Date;

  // Audit
  created_at: Date;
  updated_at: Date;
}
