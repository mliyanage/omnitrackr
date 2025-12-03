/**
 * Type definitions for the new watcher-based data model
 * Based on schema refactoring from Phase 1 & 2
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type ConnectionType = 'S3' | 'SFTP' | 'AZURE_BLOB' | 'GCS' | 'FTP' | 'FTPS' | 'SHAREPOINT' | 'REST_API' | 'DATABASE' | 'FILE_SHARE';
export type ConnectionStatus = 'healthy' | 'degraded' | 'failed' | 'untested';

export type FrequencyType = 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
export type WeekOfMonth = 'first' | 'second' | 'third' | 'fourth' | 'last';
export type ExclusionType = 'holiday' | 'blackout_period' | 'maintenance_window';

export type WatcherStatus = 'active' | 'inactive' | 'error';
export type WatcherDirection = 'inward' | 'outward' | 'bidirectional';
export type MatchRule = 'exact' | 'partial' | 'regex';

export type PollStatus = 'success' | 'failed' | 'in_progress' | 'skipped';
export type TriggerType = 'scheduled' | 'manual' | 'api' | 'retry';

export type TrackingStatus = 'pending' | 'arrived' | 'late' | 'missing';
export type AlertType = 'missing_file' | 'late_arrival' | 'sla_violation' | 'pattern_mismatch';

// ============================================================================
// Source Connection Types
// ============================================================================

export interface S3ConnectionConfig {
  bucket: string;
  region: string;
  path_prefix?: string;
  access_key_id: string;
  secret_access_key: string;
}

export interface SFTPConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  private_key?: string;
  path_prefix?: string;
}

export interface AzureBlobConnectionConfig {
  account_name: string;
  container: string;
  account_key: string;
  path_prefix?: string;
}

export type ConnectionConfig = S3ConnectionConfig | SFTPConnectionConfig | AzureBlobConnectionConfig | Record<string, unknown>;

export interface SourceConnection {
  id: number;
  name: string;
  description?: string | null;
  type: ConnectionType;
  connection_config: ConnectionConfig;
  enabled: boolean;

  // Health status fields
  connection_status: ConnectionStatus;
  last_health_check?: string | null;
  last_successful_connection?: string | null;
  health_check_error?: string | null;

  // Audit fields
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CreateConnectionRequest {
  name: string;
  description?: string;
  type: ConnectionType;
  connection_config: ConnectionConfig;
}

export interface UpdateConnectionRequest {
  name?: string;
  description?: string;
  connection_config?: ConnectionConfig;
  status?: ConnectionStatus;
}

export interface TestConnectionRequest {
  type: ConnectionType;
  connection_config: ConnectionConfig;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: {
    objects_found?: number;
    connection_time_ms?: number;
    buckets?: string[];
    containers?: string[];
  };
}

export interface ConnectionHealthCheckResult {
  connection_status: ConnectionStatus;
  last_health_check: Date | string;
  last_successful_connection?: Date | string | null;
  health_check_error?: string | null;
}

// ============================================================================
// Schedule Types
// ============================================================================

export interface Schedule {
  id: number;
  name: string;
  description?: string | null;
  enabled: boolean;

  // Frequency configuration
  frequency_type: FrequencyType;
  interval: number;

  // Time-based settings
  execution_times?: string[] | null; // Array of HH:MM times
  timezone: string;

  // Weekly settings
  days_of_week?: DayOfWeek[] | null;

  // Monthly settings
  day_of_month?: number | null; // 1-31
  week_of_month?: WeekOfMonth | null;

  // Date range
  valid_from?: string | null;
  valid_until?: string | null;

  // Audit fields
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface ScheduleExclusion {
  id: number;
  schedule_id: number;
  exclusion_type: ExclusionType;
  exclusion_date?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  description?: string | null;
  created_at: string;
}

export interface CreateScheduleRequest {
  name: string;
  description?: string;
  enabled?: boolean;
  frequency_type: FrequencyType;
  interval: number;
  execution_times?: string[];
  timezone: string;
  days_of_week?: DayOfWeek[];
  day_of_month?: number;
  week_of_month?: WeekOfMonth;
  valid_from?: string;
  valid_until?: string;
}

export interface UpdateScheduleRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  frequency_type?: FrequencyType;
  interval?: number;
  execution_times?: string[];
  timezone?: string;
  days_of_week?: DayOfWeek[];
  day_of_month?: number;
  week_of_month?: WeekOfMonth;
  valid_from?: string;
  valid_until?: string;
}

export interface CreateScheduleExclusionRequest {
  schedule_id: number;
  exclusion_type: ExclusionType;
  exclusion_date?: string;
  valid_from?: string;
  valid_until?: string;
  description?: string;
}

// ============================================================================
// Watcher Types
// ============================================================================

export interface Watcher {
  id: number;
  name: string;
  description?: string | null;

  // Foreign keys
  source_connection_id: number;
  schedule_id: number;
  department_code?: string | null;

  // Status
  status: WatcherStatus;

  // File pattern matching
  file_name_pattern?: string | null;
  file_path_pattern?: string | null;
  match_rule: MatchRule;
  direction: WatcherDirection;

  // SLA settings
  sla_enabled: boolean;
  sla_threshold_minutes?: number | null;

  // Polling statistics
  last_check_at?: string | null;
  last_check_status?: PollStatus | null;
  last_files_detected?: number | null;
  total_files_detected: number;
  total_polls_succeeded: number;
  total_polls_failed: number;
  success_rate: number;

  // Audit fields
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;

  // Populated relations (optional - for joined queries)
  source_connection?: SourceConnection;
  schedule?: Schedule;
  department?: RefData;
}

export interface CreateWatcherRequest {
  name: string;
  description?: string;
  source_connection_id: number;
  schedule_id: number;
  department_code?: string;
  file_name_pattern?: string;
  file_path_pattern?: string;
  match_rule: MatchRule;
  direction: WatcherDirection;
  sla_enabled?: boolean;
  sla_threshold_minutes?: number;
}

export interface UpdateWatcherRequest {
  name?: string;
  description?: string;
  source_connection_id?: number;
  schedule_id?: number;
  department_code?: string;
  file_name_pattern?: string;
  file_path_pattern?: string;
  match_rule?: MatchRule;
  direction?: WatcherDirection;
  sla_enabled?: boolean;
  sla_threshold_minutes?: number;
  status?: WatcherStatus;
}

// ============================================================================
// Watcher Log Types
// ============================================================================

export interface WatcherLog {
  id: number;
  watcher_id: number;
  source_connection_id: number;

  // Poll timing
  poll_started_at: string;
  poll_completed_at?: string | null;
  poll_duration_ms?: number | null;
  poll_date: string;

  // Status and trigger
  poll_status: PollStatus;
  triggered_by: TriggerType;
  triggered_by_user?: string | null;

  // Results
  objects_scanned?: number | null;
  objects_detected?: number | null;
  files_new?: number | null;
  files_modified?: number | null;

  // Error handling
  error_message?: string | null;
  error_details?: Record<string, unknown> | null;

  created_at: string;

  // Populated relations
  watcher?: Watcher;
}

export interface WatcherLogFilters {
  watcher_id?: number;
  poll_status?: PollStatus;
  triggered_by?: TriggerType;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// File Tracking Types
// ============================================================================

export interface FileTracking {
  id: number;
  watcher_id: number;

  // Expected file info
  expected_pattern: string;
  expected_at: string;
  expected_schedule?: string | null;

  // SLA tracking
  sla_threshold_minutes: number;
  sla_deadline: string;

  // Actual file info
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  arrived_at?: string | null;

  // Status
  tracking_status: TrackingStatus;

  // Alerts
  alert_triggered: boolean;
  alert_triggered_at?: string | null;
  alert_type?: AlertType | null;
  alert_message?: string | null;

  created_at: string;
  updated_at: string;

  // Populated relations
  watcher?: Watcher;
}

export interface FileTrackingFilters {
  watcher_id?: number;
  tracking_status?: TrackingStatus;
  alert_triggered?: boolean;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Reference Data Types
// ============================================================================

export interface RefData {
  id: number;
  code: string;
  value1?: string | null;
  value2?: string | null;
  value3?: string | null;
  value4?: string | null;
  value5?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CreateRefDataRequest {
  code: string;
  value1?: string;
  value2?: string;
  value3?: string;
  value4?: string;
  value5?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Dashboard/Summary Types
// ============================================================================

export interface WatcherSummary {
  total_watchers: number;
  active_watchers: number;
  inactive_watchers: number;
  error_watchers: number;
  total_files_detected_today: number;
  total_polls_today: number;
  success_rate_today: number;
  sla_violations_today: number;
}

export interface SLASummary {
  total_expected: number;
  arrived_on_time: number;
  arrived_late: number;
  missing: number;
  pending: number;
  compliance_rate: number;
}
