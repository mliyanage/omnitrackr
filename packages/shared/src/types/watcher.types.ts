/**
 * Watcher Types
 * Shared types for file watching configurations
 */

// Import MatchRule from fileSource.types to avoid duplicate
import { MatchRule } from './fileSource.types';

// Enums matching database types
export type WatcherStatus = 'active' | 'paused' | 'error' | 'disabled';
export type CheckStatus = 'success' | 'failed' | 'in_progress' | 'never_run';
export type DirectionType = 'inward' | 'outward' | 'bidirectional';

// Re-export MatchRule for convenience
export type { MatchRule };

/**
 * Watcher Entity (database model)
 */
export interface Watcher {
  id: number;

  // Foreign Keys
  source_connection_id: number;
  schedule_id?: number | null;
  department_code?: string | null;

  // Watcher Identity
  name: string;
  description?: string | null;

  // File Pattern Matching
  file_name_pattern?: string | null;
  file_path_pattern?: string | null;
  match_rule: MatchRule;

  // Last Check Info
  last_check_at?: Date | null;
  last_check_status: CheckStatus;
  last_files_detected: number;

  // SLA Configuration
  sla_enabled: boolean;
  sla_threshold_minutes?: number | null;

  // Metadata
  direction: DirectionType;
  owner_team?: string | null;

  // Status
  status: WatcherStatus;

  // Statistics
  total_files_detected: number;
  total_polls_succeeded: number;
  total_polls_failed: number;
  success_rate: number;

  // Audit
  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: Date | null;
}

/**
 * Create Watcher Request
 */
export interface CreateWatcherRequest {
  source_connection_id: number;
  schedule_id?: number;
  department_code?: string;
  name: string;
  description?: string;
  file_name_pattern?: string;
  file_path_pattern?: string;
  match_rule?: MatchRule;
  sla_enabled?: boolean;
  sla_threshold_minutes?: number;
  direction?: DirectionType;
  owner_team?: string;
  status?: WatcherStatus;
}

/**
 * Update Watcher Request
 */
export interface UpdateWatcherRequest {
  source_connection_id?: number;
  schedule_id?: number;
  department_code?: string;
  name?: string;
  description?: string;
  file_name_pattern?: string;
  file_path_pattern?: string;
  match_rule?: MatchRule;
  sla_enabled?: boolean;
  sla_threshold_minutes?: number;
  direction?: DirectionType;
  owner_team?: string;
  status?: WatcherStatus;
}

/**
 * Watcher with Relations
 */
export interface WatcherWithRelations extends Watcher {
  source_connection?: {
    id: number;
    name: string;
    type: string;
    connection_status: string;
  };
  schedule?: {
    id: number;
    name: string;
    frequency_type: string;
  };
  department?: {
    code: string;
    name: string;
  };
}

/**
 * Watcher Statistics
 */
export interface WatcherStatistics {
  watcher_id: number;
  total_polls: number;
  successful_polls: number;
  failed_polls: number;
  total_files_detected: number;
  average_poll_duration_ms: number;
  last_24h_files: number;
  last_7d_files: number;
  success_rate: number;
}
