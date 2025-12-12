/**
 * File Tracking Types
 * Shared types for SLA tracking and missing file alerts
 */

import type { DirectionType } from './watcher.types';

// Enums matching database types
export type TrackingStatus = 'pending' | 'arrived' | 'late' | 'missing';
export type AlertType = 'sla_at_risk' | 'sla_breached' | 'file_arrived';

/**
 * File Tracking Entity (database model)
 */
export interface FileTracking {
  id: number;

  // Foreign Key
  watcher_id: number;

  // Expected Arrival Information
  expected_pattern: string;
  expected_at: Date;
  expected_schedule?: string | null;

  // Actual Arrival Tracking
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  arrived_at?: Date | null;

  // Status
  tracking_status: TrackingStatus;

  // Alert Information
  alert_triggered: boolean;
  alert_triggered_at?: Date | null;
  alert_type?: AlertType | null;

  // SLA
  sla_threshold_minutes?: number | null;
  sla_deadline: Date;

  // Audit
  created_at: Date;
  updated_at: Date;
}

/**
 * Create File Tracking Request
 */
export interface CreateFileTrackingRequest {
  watcher_id: number;
  expected_pattern: string;
  expected_at: Date;
  expected_schedule?: string;
  sla_threshold_minutes?: number;
  sla_deadline: Date;
}

/**
 * Update File Tracking (when file arrives)
 */
export interface FileArrivedRequest {
  file_path: string;
  file_name: string;
  file_size?: number;
  arrived_at: Date;
}

/**
 * File Tracking Query Options
 */
export interface FileTrackingQueryOptions {
  watcher_id?: number;
  tracking_status?: TrackingStatus;
  alert_triggered?: boolean;
  expected_from?: Date;
  expected_to?: Date;
  direction?: DirectionType;
  page?: number;
  limit?: number;
}

/**
 * SLA Dashboard Summary
 */
export interface SLADashboardSummary {
  period_start: Date;
  period_end: Date;
  total_expected: number;
  arrived_on_time: number;
  arrived_late: number;
  missing: number;
  pending: number;
  on_time_percentage: number;
  at_risk_count: number;
}

/**
 * File Tracking with Watcher Info
 */
export interface FileTrackingWithWatcher extends FileTracking {
  watcher?: {
    id: number;
    name: string;
    department_code?: string;
    source_connection_id: number;
  };
}

/**
 * Missing File Alert
 */
export interface MissingFileAlert {
  file_tracking_id: number;
  watcher_id: number;
  watcher_name: string;
  department_code?: string;
  expected_pattern: string;
  expected_at: Date;
  sla_deadline: Date;
  minutes_overdue: number;
  alert_type: AlertType;
}
