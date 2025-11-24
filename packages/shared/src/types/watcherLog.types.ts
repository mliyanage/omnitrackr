/**
 * Watcher Log Types
 * Shared types for polling audit trail
 */

import { ConnectionStatus } from './sourceConnection.types';

// Enums matching database types
export type PollStatus = 'success' | 'failed' | 'timeout' | 'cancelled' | 'skipped';
export type TriggerType = 'scheduler' | 'manual' | 'api' | 'retry';

/**
 * Watcher Log Entity (database model)
 */
export interface WatcherLog {
  id: number; // bigint in DB

  // Foreign Keys
  watcher_id: number;
  source_connection_id: number;

  // Poll Execution
  poll_started_at: Date;
  poll_completed_at?: Date | null;
  poll_duration_ms?: number | null;

  // Poll Results
  poll_status: PollStatus;
  objects_scanned: number;
  files_detected: number;
  files_new: number;
  files_duplicate: number;

  // Error Information
  error_details?: ErrorDetails | null;

  // Performance Metrics
  api_calls_made: number;
  bytes_transferred: number;

  // Connection Status at Poll Time
  connection_status_at_poll?: ConnectionStatus | null;

  // Metadata
  triggered_by: TriggerType;
  triggered_by_user?: string | null;

  // Partitioning helper
  poll_date: Date;

  // Audit
  created_at: Date;
}

/**
 * Error Details JSON structure
 */
export interface ErrorDetails {
  message: string;
  code?: string;
  stack?: string;
  context?: Record<string, any>;
}

/**
 * Create Watcher Log Request
 */
export interface CreateWatcherLogRequest {
  watcher_id: number;
  source_connection_id: number;
  poll_started_at: Date;
  poll_status: PollStatus;
  triggered_by: TriggerType;
  triggered_by_user?: string;
  poll_date: Date;
}

/**
 * Complete Watcher Log Request (after poll completes)
 */
export interface CompleteWatcherLogRequest {
  poll_completed_at: Date;
  poll_duration_ms: number;
  poll_status: PollStatus;
  objects_scanned: number;
  files_detected: number;
  files_new: number;
  files_duplicate: number;
  error_details?: ErrorDetails;
  api_calls_made?: number;
  bytes_transferred?: number;
  connection_status_at_poll?: ConnectionStatus;
}

/**
 * Watcher Log Query Options
 */
export interface WatcherLogQueryOptions {
  watcher_id?: number;
  source_connection_id?: number;
  poll_status?: PollStatus;
  triggered_by?: TriggerType;
  start_date?: Date;
  end_date?: Date;
  page?: number;
  limit?: number;
}

/**
 * Watcher Log Summary
 */
export interface WatcherLogSummary {
  watcher_id: number;
  period_start: Date;
  period_end: Date;
  total_polls: number;
  successful_polls: number;
  failed_polls: number;
  total_files_detected: number;
  total_files_new: number;
  average_duration_ms: number;
  total_bytes_transferred: number;
}
