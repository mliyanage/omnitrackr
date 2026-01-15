import apiClient from './client';
import type {
  ApiResponse,
  AlertConfig,
  AlertRecipientGroup,
  AlertEscalation,
  AlertHistory,
  AlertComment,
  CreateAlertConfigRequest,
  UpdateAlertConfigRequest,
  CreateRecipientGroupRequest,
  UpdateRecipientGroupRequest,
  CreateEscalationRequest,
  UpdateEscalationRequest,
  CreateAlertCommentRequest,
  AlertHistoryQueryOptions,
  PaginatedAlertHistoryResponse,
  AlertDashboardStats,
} from '@/types';

// ============================================================================
// Alert Configs
// ============================================================================

/**
 * Get all alert configurations
 */
export const getAlertConfigs = async (): Promise<AlertConfig[]> => {
  const response = await apiClient.get<ApiResponse<AlertConfig[]>>('/alerts/configs');
  return response.data.data || [];
};

/**
 * Get a single alert configuration by ID
 */
export const getAlertConfigById = async (id: number): Promise<AlertConfig> => {
  const response = await apiClient.get<ApiResponse<AlertConfig>>(`/alerts/configs/${id}`);
  if (!response.data.data) {
    throw new Error('Alert configuration not found');
  }
  return response.data.data;
};

/**
 * Create a new alert configuration
 */
export const createAlertConfig = async (
  data: CreateAlertConfigRequest
): Promise<AlertConfig> => {
  const response = await apiClient.post<ApiResponse<AlertConfig>>(
    '/alerts/configs',
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to create alert configuration');
  }
  return response.data.data;
};

/**
 * Update an existing alert configuration
 */
export const updateAlertConfig = async (
  id: number,
  data: UpdateAlertConfigRequest
): Promise<AlertConfig> => {
  const response = await apiClient.patch<ApiResponse<AlertConfig>>(
    `/alerts/configs/${id}`,
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to update alert configuration');
  }
  return response.data.data;
};

/**
 * Delete an alert configuration
 */
export const deleteAlertConfig = async (id: number): Promise<void> => {
  await apiClient.delete(`/alerts/configs/${id}`);
};

// ============================================================================
// Recipient Groups
// ============================================================================

/**
 * Get all recipient groups
 */
export const getRecipientGroups = async (): Promise<AlertRecipientGroup[]> => {
  const response = await apiClient.get<ApiResponse<AlertRecipientGroup[]>>(
    '/alerts/recipient-groups'
  );
  return response.data.data || [];
};

/**
 * Get a single recipient group by ID
 */
export const getRecipientGroupById = async (id: number): Promise<AlertRecipientGroup> => {
  const response = await apiClient.get<ApiResponse<AlertRecipientGroup>>(
    `/alerts/recipient-groups/${id}`
  );
  if (!response.data.data) {
    throw new Error('Recipient group not found');
  }
  return response.data.data;
};

/**
 * Create a new recipient group
 */
export const createRecipientGroup = async (
  data: CreateRecipientGroupRequest
): Promise<AlertRecipientGroup> => {
  const response = await apiClient.post<ApiResponse<AlertRecipientGroup>>(
    '/alerts/recipient-groups',
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to create recipient group');
  }
  return response.data.data;
};

/**
 * Update an existing recipient group
 */
export const updateRecipientGroup = async (
  id: number,
  data: UpdateRecipientGroupRequest
): Promise<AlertRecipientGroup> => {
  const response = await apiClient.patch<ApiResponse<AlertRecipientGroup>>(
    `/alerts/recipient-groups/${id}`,
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to update recipient group');
  }
  return response.data.data;
};

/**
 * Delete a recipient group
 */
export const deleteRecipientGroup = async (id: number): Promise<void> => {
  await apiClient.delete(`/alerts/recipient-groups/${id}`);
};

// ============================================================================
// Escalations
// ============================================================================

/**
 * Get escalations for an alert config
 */
export const getEscalations = async (configId: number): Promise<AlertEscalation[]> => {
  const response = await apiClient.get<ApiResponse<AlertEscalation[]>>(
    `/alerts/configs/${configId}/escalations`
  );
  return response.data.data || [];
};

/**
 * Create a new escalation level
 */
export const createEscalation = async (
  data: CreateEscalationRequest
): Promise<AlertEscalation> => {
  const response = await apiClient.post<ApiResponse<AlertEscalation>>(
    '/alerts/escalations',
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to create escalation');
  }
  return response.data.data;
};

/**
 * Update an existing escalation level
 */
export const updateEscalation = async (
  id: number,
  data: UpdateEscalationRequest
): Promise<AlertEscalation> => {
  const response = await apiClient.patch<ApiResponse<AlertEscalation>>(
    `/alerts/escalations/${id}`,
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to update escalation');
  }
  return response.data.data;
};

/**
 * Delete an escalation level
 */
export const deleteEscalation = async (id: number): Promise<void> => {
  await apiClient.delete(`/alerts/escalations/${id}`);
};

// ============================================================================
// Alert History
// ============================================================================

/**
 * Get alert history with filters and pagination
 */
export const getAlertHistory = async (
  options?: AlertHistoryQueryOptions
): Promise<PaginatedAlertHistoryResponse> => {
  const params = new URLSearchParams();

  if (options?.watcher_id) params.append('watcher_id', options.watcher_id.toString());
  if (options?.alert_type) params.append('alert_type', options.alert_type);
  if (options?.delivery_status) params.append('delivery_status', options.delivery_status);
  if (options?.acknowledged !== undefined) {
    params.append('acknowledged', options.acknowledged.toString());
  }
  if (options?.from_date) params.append('from_date', options.from_date.toISOString());
  if (options?.to_date) params.append('to_date', options.to_date.toISOString());
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());

  const response = await apiClient.get<PaginatedAlertHistoryResponse>(
    `/alerts/history?${params.toString()}`
  );
  return response.data;
};

/**
 * Get a single alert by ID
 */
export const getAlertHistoryById = async (id: number): Promise<AlertHistory> => {
  const response = await apiClient.get<ApiResponse<AlertHistory>>(`/alerts/history/${id}`);
  if (!response.data.data) {
    throw new Error('Alert not found');
  }
  return response.data.data;
};

/**
 * Acknowledge an alert
 */
export const acknowledgeAlert = async (
  id: number,
  acknowledgment_note?: string
): Promise<void> => {
  await apiClient.post(`/alerts/history/${id}/acknowledge`, {
    acknowledgment_note,
  });
};

// ============================================================================
// Comments
// ============================================================================

/**
 * Get all comments for an alert
 */
export const getAlertComments = async (alertHistoryId: number): Promise<AlertComment[]> => {
  const response = await apiClient.get<ApiResponse<AlertComment[]>>(
    `/alerts/history/${alertHistoryId}/comments`
  );
  return response.data.data || [];
};

/**
 * Add a comment to an alert
 */
export const addAlertComment = async (
  alertHistoryId: number,
  data: CreateAlertCommentRequest
): Promise<AlertComment> => {
  const response = await apiClient.post<ApiResponse<AlertComment>>(
    `/alerts/history/${alertHistoryId}/comments`,
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to add comment');
  }
  return response.data.data;
};

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get alert dashboard statistics
 */
export const getAlertStats = async (): Promise<AlertDashboardStats> => {
  const response = await apiClient.get<ApiResponse<AlertDashboardStats>>('/alerts/stats');
  if (!response.data.data) {
    throw new Error('Failed to get alert statistics');
  }
  return response.data.data;
};
