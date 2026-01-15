/**
 * Alert Types
 * Comprehensive type definitions for SLA breach alerting system
 */

// Import AlertType from fileTracking (reuse existing type)
import type { AlertType } from './fileTracking.types';
export type { AlertType };

// Enums matching database types
export type DeliveryStatus =
  | 'pending'
  | 'processing'
  | 'delivered'
  | 'failed'
  | 'partially_delivered';
export type ChannelType =
  | 'email'
  | 'slack'
  | 'teams'
  | 'jira'
  | 'sms'
  | 'servicenow';

/**
 * Alert Config Entity (database model)
 */
export interface AlertConfig {
  id: number;
  watcher_id: number;
  organization_id: number;
  department_id?: number | null;
  alert_types: AlertType[];
  email_enabled: boolean;
  email_recipients?: string[] | null;
  email_cc?: string[] | null;
  email_bcc?: string[] | null;
  recipient_group_ids?: number[] | null;
  channel_configs?: Record<ChannelType, any> | null;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: number | null;
  updated_by?: number | null;
  deleted_at?: Date | null;
  // Populated relations (optional - for joined queries)
  watcher?: {
    id: number;
    name: string;
    department_code?: string;
  };
  escalations?: any[];
}

/**
 * Create Alert Config Request
 */
export interface CreateAlertConfigRequest {
  watcher_id: number;
  alert_types?: AlertType[];
  email_enabled?: boolean;
  email_recipients?: string[];
  email_cc?: string[];
  email_bcc?: string[];
  recipient_group_ids?: number[];
  channel_configs?: Record<ChannelType, any>;
  enabled?: boolean;
}

/**
 * Update Alert Config Request
 */
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

/**
 * Alert Recipient Group Entity (database model)
 */
export interface AlertRecipientGroup {
  id: number;
  organization_id: number;
  name: string;
  description?: string | null;
  email_addresses: string[];
  user_ids?: number[] | null;
  created_at: Date;
  updated_at: Date;
  created_by?: number | null;
  updated_by?: number | null;
  deleted_at?: Date | null;
}

/**
 * Create Recipient Group Request
 */
export interface CreateRecipientGroupRequest {
  name: string;
  description?: string;
  email_addresses: string[];
  user_ids?: number[];
}

/**
 * Update Recipient Group Request
 */
export interface UpdateRecipientGroupRequest {
  name?: string;
  description?: string;
  email_addresses?: string[];
  user_ids?: number[];
}

/**
 * Alert Escalation Entity (database model)
 */
export interface AlertEscalation {
  id: number;
  alert_config_id: number;
  escalation_level: number;
  delay_minutes: number;
  email_recipients?: string[] | null;
  email_cc?: string[] | null;
  recipient_group_ids?: number[] | null;
  channel_configs?: Record<ChannelType, any> | null;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

/**
 * Create Escalation Request
 */
export interface CreateEscalationRequest {
  alert_config_id: number;
  escalation_level: number;
  delay_minutes: number;
  email_recipients?: string[];
  email_cc?: string[];
  recipient_group_ids?: number[];
  channel_configs?: Record<ChannelType, any>;
}

/**
 * Update Escalation Request
 */
export interface UpdateEscalationRequest {
  escalation_level?: number;
  delay_minutes?: number;
  email_recipients?: string[];
  email_cc?: string[];
  recipient_group_ids?: number[];
  channel_configs?: Record<ChannelType, any>;
}

/**
 * Alert History Entity (database model)
 */
export interface AlertHistory {
  id: number;
  alert_config_id: number;
  file_tracking_id: number;
  watcher_id: number;
  alert_type: AlertType;
  alert_message: string;
  alert_context: Record<string, any>;
  escalation_level: number;
  escalation_to_id?: number | null;
  delivery_status: DeliveryStatus;
  delivery_details?: Record<string, any> | null;
  delivery_attempts: number;
  last_delivery_attempt?: Date | null;
  delivered_at?: Date | null;
  acknowledged: boolean;
  acknowledged_at?: Date | null;
  acknowledged_by?: number | null;
  acknowledgment_note?: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at?: Date | null;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Alert History with related data
 */
export interface AlertHistoryWithDetails extends AlertHistory {
  watcher?: {
    id: number;
    name: string;
    department_code?: string;
  };
  file_tracking?: {
    expected_pattern: string;
    expected_at: Date;
    sla_deadline: Date;
  };
  acknowledged_by_user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  comments?: AlertComment[];
}

/**
 * Acknowledge Alert Request
 */
export interface AcknowledgeAlertRequest {
  acknowledgment_note?: string;
}

/**
 * Alert Comment Entity (database model)
 */
export interface AlertComment {
  id: number;
  alert_history_id: number;
  user_id: number;
  comment: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

/**
 * Alert Comment with user details
 */
export interface AlertCommentWithUser extends AlertComment {
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

/**
 * Create Alert Comment Request
 */
export interface CreateAlertCommentRequest {
  comment: string;
}

/**
 * Query Options for Alert History
 */
export interface AlertHistoryQueryOptions {
  organization_id?: number;
  watcher_id?: number;
  alert_type?: AlertType;
  delivery_status?: DeliveryStatus;
  acknowledged?: boolean;
  from_date?: Date;
  to_date?: Date;
  page?: number;
  limit?: number;
}

/**
 * Paginated Alert History Response
 */
export interface PaginatedAlertHistoryResponse {
  data: AlertHistoryWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Dashboard Statistics
 */
export interface AlertDashboardStats {
  total_alerts: number;
  acknowledged_alerts: number;
  pending_alerts: number;
  failed_deliveries: number;
  average_acknowledgment_time_minutes: number;
  alerts_by_type: Record<AlertType, number>;
  alerts_by_watcher: Array<{
    watcher_id: number;
    watcher_name: string;
    count: number;
  }>;
}

/**
 * Alert Config with related data
 */
export interface AlertConfigWithDetails extends AlertConfig {
  watcher?: {
    id: number;
    name: string;
    description?: string;
  };
  recipient_groups?: AlertRecipientGroup[];
  escalations?: AlertEscalation[];
}
