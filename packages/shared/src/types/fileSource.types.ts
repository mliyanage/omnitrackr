/**
 * File Source Types
 * Shared types for file source configurations across all services
 */

export type FileSourceType =
  | 'S3'
  | 'AZURE_BLOB'
  | 'GCS'
  | 'SFTP'
  | 'FTP'
  | 'FTPS'
  | 'SHAREPOINT'
  | 'REST_API'
  | 'DATABASE'
  | 'FILE_SHARE';

export type FileSourceStatus = 'active' | 'failed' | 'pending' | 'disabled';
export type FileSourceDirection = 'inward' | 'outward' | 'bidirectional';
export type MatchRule = 'partial' | 'exact' | 'regex';
export type LastSyncStatus = 'success' | 'failed' | 'in_progress';

/**
 * Base connection configuration
 */
export interface BaseConnectionConfig {
  sourceType: FileSourceType;
  credentialId: string;
  lastValidation?: ValidationResult;
}

export interface ValidationResult {
  timestamp: string;
  canAuthenticate: boolean;
  errorMessage?: string;
  [key: string]: any; // Type-specific validation fields
}

/**
 * S3 Connection Configuration
 */
export interface S3ConnectionConfig extends BaseConnectionConfig {
  sourceType: 'S3';
  bucketName: string;
  bucketRegion: string;
  monitorPath: string;
  advancedOptions?: {
    usePathStyle?: boolean;
    endpoint?: string | null;
    forcePathStyle?: boolean;
  };
  lastValidation?: S3ValidationResult;
}

export interface S3ValidationResult extends ValidationResult {
  canAccessBucket: boolean;
  canListObjects: boolean;
}

/**
 * Union type for all connection configs
 */
export type ConnectionConfig = S3ConnectionConfig; // Add other types as we implement them

/**
 * File Source Entity (database model)
 */
export interface FileSource {
  id: number;
  name: string;
  type: FileSourceType;
  status: FileSourceStatus;
  enabled: boolean;

  // Unified connection configuration
  connection_config: ConnectionConfig;

  // Pattern matching
  file_name_pattern: string;
  match_rule: MatchRule;

  // Schedule
  schedule: string; // HH:MM
  timezone: string;
  poll_frequency_minutes?: number;

  // SLA
  sla_threshold: number; // minutes

  // Metadata
  direction: FileSourceDirection;
  department: string;

  // Stats
  last_sync?: Date | null;
  last_sync_status?: LastSyncStatus | null;
  last_sync_error?: string | null;
  success_rate: number;
  files_processed: number;

  // Polling metadata
  last_poll_duration_ms?: number | null;
  last_objects_scanned?: number | null;
  last_objects_detected?: number | null;

  // Audit
  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
  updated_by?: string | null;
}

/**
 * Create File Source Request (API)
 */
export interface CreateS3FileSourceRequest {
  name: string;
  department: string;

  // AWS credentials
  awsAccessKeyId: string;
  awsSecretAccessKey: string;

  // S3 configuration
  bucketName: string;
  bucketRegion: string;
  monitorPath: string;

  // Pattern matching
  fileNamePattern: string;
  matchRule: MatchRule;

  // Schedule
  schedule: string;
  timezone: string;

  // SLA
  slaThreshold: number;

  direction: FileSourceDirection;
}

/**
 * Test Connection Request
 */
export interface TestConnectionRequest {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  bucketName: string;
  bucketRegion: string;
  monitorPath: string;
}

/**
 * Test Connection Response
 */
export interface TestConnectionResponse {
  success: boolean;
  canAuthenticate: boolean;
  canAccessBucket: boolean;
  canListObjects: boolean;
  errorMessage?: string;
  sampleFiles?: string[]; // First 5 files found
}
