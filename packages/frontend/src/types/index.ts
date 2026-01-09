// Re-export types from shared package
// Note: @omnitrackr/shared will be added as a dependency
// For now, define basic types locally until we can import from shared

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  message?: string;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Export new watcher-based types
export * from './watcher.types';

// Export authentication and user management types
export * from './auth.types';

export type FileSourceType = 'S3' | 'AZURE_BLOB' | 'GCS' | 'SFTP' | 'FTP' | 'FTPS' | 'SHAREPOINT' | 'REST_API' | 'DATABASE' | 'FILE_SHARE';
export type FileSourceStatus = 'active' | 'failed' | 'pending' | 'disabled';
export type FileSourceDirection = 'inward' | 'outward' | 'bidirectional';
export type MatchRule = 'partial' | 'exact' | 'regex';
export type LastSyncStatus = 'success' | 'failed' | 'in_progress';

export interface FileSource {
  id: number;
  name: string;
  description?: string | null;
  type: FileSourceType;
  status: FileSourceStatus;
  enabled: boolean;
  connection_config: Record<string, unknown>;

  // Pattern matching
  file_name_pattern: string;
  match_rule: MatchRule;

  // Schedule
  schedule: string; // HH:MM format
  timezone: string;
  poll_frequency_minutes?: number;

  // SLA
  sla_threshold: number; // minutes

  // Metadata
  direction: FileSourceDirection;
  department: string;

  // Stats
  last_sync?: string | null;
  last_sync_status?: LastSyncStatus | null;
  last_sync_error?: string | null;
  success_rate: number | string;
  files_processed: number;

  // Polling metadata
  last_poll_duration_ms?: number | null;
  last_objects_scanned?: number | null;
  last_objects_detected?: number | null;

  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface S3ConnectionConfig {
  bucket: string;
  region: string;
  path_prefix?: string;
  access_key_id: string;
  secret_access_key: string;
}

export interface CreateFileSourceRequest {
  name: string;
  description?: string;
  department: string;
  type: FileSourceType;
  connection_config: Record<string, unknown>;
  credentials: Record<string, unknown>;
  file_name_pattern: string;
  match_rule: MatchRule;
  direction?: FileSourceDirection;
  schedule: string;
  timezone: string;
  sla_threshold: number;
}

export interface UpdateFileSourceRequest {
  name?: string;
  description?: string;
  connection_config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  file_name_pattern?: string;
  match_rule?: MatchRule;
  direction?: FileSourceDirection;
  schedule?: string;
  timezone?: string;
  sla_threshold?: number;
  enabled?: boolean;
  status?: FileSourceStatus;
}

// Note: TestConnectionRequest and TestConnectionResponse are now exported from watcher.types.ts
