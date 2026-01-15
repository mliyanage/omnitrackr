/**
 * Type definitions for SLA breach alerting system
 */

import type { AlertType } from './watcher.types';

// ============================================================================
// Enums and Constants
// ============================================================================

// AlertType is now imported from watcher.types.ts
export type DeliveryStatus = 'pending' | 'processing' | 'delivered' | 'failed' | 'partially_delivered';
export type ChannelType = 'email' | 'slack' | 'teams' | 'jira' | 'sms' | 'servicenow';

// ============================================================================
// Alert Config
// ============================================================================

export interface AlertConfig {
  id: number;
  watcher_id: number;
  organization_id: number;
  department_id?: number | null;

  alert_types: AlertType[];

  // Email configuration
  email_enabled: boolean;
  email_recipients?: string[] | null;
  email_cc?: string[] | null;
  email_bcc?: string[] | null;
  recipient_group_ids?: number[] | null;

  // Future channels
  channel_configs?: Record<ChannelType, any> | null;

  enabled: boolean;

  // Audit fields
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
  deleted_at?: string | null;

  // Populated fields (from joins)
  watcher?: {
    id: number;
    name: string;
    department_code?: string;
  };
  recipient_groups?: AlertRecipientGroup[];
  escalations?: AlertEscalation[];
}

export interface CreateAlertConfigRequest {
  watcher_id: number;
  alert_types: AlertType[];
  email_enabled: boolean;
  email_recipients?: string[];
  email_cc?: string[];
  email_bcc?: string[];
  recipient_group_ids?: number[];
  channel_configs?: Record<ChannelType, any>;
  enabled?: boolean;
}

export interface UpdateAlertConfigRequest {
  alert_types?: AlertType[];
  email_enabled?: boolean;
  email_recipients?: string[];
  email_cc?: string[];
  email_bcc?: string[];
  recipient_group_ids?: number[];
  channel_configs?: Record<ChannelType, any>;
  enabled?: boolean;
}

// ============================================================================
// Recipient Groups
// ============================================================================

export interface AlertRecipientGroup {
  id: number;
  organization_id: number;
  department_id?: number | null;
  name: string;
  description?: string | null;
  email_addresses: string[];
  user_ids?: number[] | null;

  // Audit fields
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
  deleted_at?: string | null;
}

export interface CreateRecipientGroupRequest {
  name: string;
  description?: string;
  email_addresses: string[];
  user_ids?: number[];
}

export interface UpdateRecipientGroupRequest {
  name?: string;
  description?: string;
  email_addresses?: string[];
  user_ids?: number[];
}

// ============================================================================
// Escalations
// ============================================================================

export interface AlertEscalation {
  id: number;
  alert_config_id: number;
  escalation_level: number;
  delay_minutes: number;

  // Email configuration for this level
  email_recipients?: string[] | null;
  email_cc?: string[] | null;
  recipient_group_ids?: number[] | null;

  // Future channels
  channel_configs?: Record<ChannelType, any> | null;

  // Audit fields
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;

  // Populated fields
  recipient_groups?: AlertRecipientGroup[];
}

export interface CreateEscalationRequest {
  alert_config_id: number;
  escalation_level: number;
  delay_minutes: number;
  email_recipients?: string[];
  email_cc?: string[];
  recipient_group_ids?: number[];
  channel_configs?: Record<ChannelType, any>;
}

export interface UpdateEscalationRequest {
  escalation_level?: number;
  delay_minutes?: number;
  email_recipients?: string[];
  email_cc?: string[];
  recipient_group_ids?: number[];
  channel_configs?: Record<ChannelType, any>;
}

// ============================================================================
// Alert History
// ============================================================================

export interface AlertHistory {
  id: number;
  alert_config_id: number;
  file_tracking_id: number;
  watcher_id: number;

  alert_type: AlertType;
  alert_message: string;
  alert_context?: Record<string, any> | null;

  escalation_level: number;
  delivery_status: DeliveryStatus;
  delivery_details?: Record<string, any> | null;

  acknowledged: boolean;
  acknowledged_at?: string | null;
  acknowledged_by?: number | null;
  acknowledgment_note?: string | null;

  retry_count: number;
  max_retries: number;
  next_retry_at?: string | null;

  priority: number;

  // Audit fields
  created_at: string;
  updated_at: string;

  // Populated fields
  watcher?: {
    id: number;
    name: string;
    department_code?: string;
  };
  acknowledged_by_user?: {
    id: number;
    name: string;
    email: string;
  };
  comments?: AlertComment[];
}

export interface AlertHistoryQueryOptions {
  watcher_id?: number;
  alert_type?: AlertType;
  delivery_status?: DeliveryStatus;
  acknowledged?: boolean;
  from_date?: Date;
  to_date?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedAlertHistoryResponse {
  success: boolean;
  data: AlertHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Comments
// ============================================================================

export interface AlertComment {
  id: number;
  alert_history_id: number;
  user_id: number;
  comment: string;

  created_at: string;

  // Populated fields
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreateAlertCommentRequest {
  comment: string;
}

// ============================================================================
// Statistics
// ============================================================================

export interface AlertDashboardStats {
  total_alerts: number;
  total_breaches: number;
  total_at_risk: number;
  unacknowledged_alerts: number;
  failed_deliveries: number;

  alerts_by_type: Record<AlertType, number>;
  alerts_by_watcher: Array<{
    watcher_id: number;
    watcher_name: string;
    count: number;
  }>;

  recent_alerts: Array<{
    id: number;
    alert_type: AlertType;
    watcher_name: string;
    created_at: string;
    acknowledged: boolean;
  }>;

  delivery_success_rate: number;
  average_acknowledgment_time_minutes: number | null;
}
