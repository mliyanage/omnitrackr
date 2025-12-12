import apiClient from './client';
import type {
  ApiResponse,
  Watcher,
  WatcherLog,
  FileTracking,
  CreateWatcherRequest,
  UpdateWatcherRequest,
  WatcherLogFilters,
  FileTrackingFilters,
  WatcherSummary,
  SLASummary,
} from '@/types';

/**
 * Get all watchers with optional filters
 */
export const getWatchers = async (params?: {
  status?: string;
  department_id?: number;
  connection_id?: number;
}): Promise<Watcher[]> => {
  const response = await apiClient.get<ApiResponse<Watcher[]>>('/api/watchers', {
    params,
  });
  return response.data.data || [];
};

/**
 * Get a single watcher by ID
 */
export const getWatcherById = async (id: number): Promise<Watcher> => {
  const response = await apiClient.get<ApiResponse<Watcher>>(`/api/watchers/${id}`);
  if (!response.data.data) {
    throw new Error('Watcher not found');
  }
  return response.data.data;
};

/**
 * Create a new watcher
 */
export const createWatcher = async (
  data: CreateWatcherRequest
): Promise<Watcher> => {
  const response = await apiClient.post<ApiResponse<Watcher>>(
    '/api/watchers',
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to create watcher');
  }
  return response.data.data;
};

/**
 * Update an existing watcher
 */
export const updateWatcher = async (
  id: number,
  data: UpdateWatcherRequest
): Promise<Watcher> => {
  const response = await apiClient.patch<ApiResponse<Watcher>>(
    `/api/watchers/${id}`,
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to update watcher');
  }
  return response.data.data;
};

/**
 * Delete a watcher
 */
export const deleteWatcher = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/watchers/${id}`);
};

/**
 * Trigger a manual poll for a watcher
 */
export const triggerWatcherPoll = async (id: number): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await apiClient.post<ApiResponse<{
    success: boolean;
    message: string;
  }>>(`/api/watchers/${id}/poll`);
  if (!response.data.data) {
    throw new Error('Failed to trigger poll');
  }
  return response.data.data;
};

// ============================================================================
// Watcher Logs
// ============================================================================

/**
 * Get logs for a watcher
 */
export const getWatcherLogs = async (
  watcherId: number,
  filters?: WatcherLogFilters
): Promise<WatcherLog[]> => {
  const response = await apiClient.get<ApiResponse<WatcherLog[]>>(
    `/api/watchers/${watcherId}/logs`,
    { params: filters }
  );
  return response.data.data || [];
};

/**
 * Get a single log entry
 */
export const getWatcherLogById = async (
  watcherId: number,
  logId: number
): Promise<WatcherLog> => {
  const response = await apiClient.get<ApiResponse<WatcherLog>>(
    `/api/watchers/${watcherId}/logs/${logId}`
  );
  if (!response.data.data) {
    throw new Error('Log entry not found');
  }
  return response.data.data;
};

// ============================================================================
// File Tracking (SLA)
// ============================================================================

/**
 * Get file tracking records for a watcher
 */
export const getWatcherFileTracking = async (
  watcherId: number,
  filters?: FileTrackingFilters
): Promise<FileTracking[]> => {
  const response = await apiClient.get<ApiResponse<FileTracking[]>>(
    `/api/watchers/${watcherId}/file-tracking`,
    { params: filters }
  );
  return response.data.data || [];
};

/**
 * Get all missing file alerts
 */
export const getMissingFileAlerts = async (params?: {
  from_date?: string;
  to_date?: string;
}): Promise<FileTracking[]> => {
  const response = await apiClient.get<ApiResponse<FileTracking[]>>(
    '/api/file-tracking/alerts',
    { params }
  );
  return response.data.data || [];
};

// ============================================================================
// Dashboard & Summary
// ============================================================================

/**
 * Get watcher summary statistics
 */
export const getWatcherSummary = async (): Promise<WatcherSummary> => {
  const response = await apiClient.get<ApiResponse<WatcherSummary>>(
    '/api/watchers/summary'
  );
  if (!response.data.data) {
    throw new Error('Failed to get watcher summary');
  }
  return response.data.data;
};

/**
 * Get SLA compliance summary
 */
export const getSLASummary = async (params?: {
  from_date?: string;
  to_date?: string;
}): Promise<SLASummary> => {
  const response = await apiClient.get<ApiResponse<SLASummary>>(
    '/api/file-tracking/sla-summary',
    { params }
  );
  if (!response.data.data) {
    throw new Error('Failed to get SLA summary');
  }
  return response.data.data;
};

// ============================================================================
// File Listing for Manual Override
// ============================================================================

export type S3File = {
  file_name: string;
  file_path: string;
  file_size: number;
  last_modified: Date;
};

/**
 * List files from source for a watcher (for manual override)
 */
export const getWatcherFiles = async (watcherId: number): Promise<S3File[]> => {
  const response = await apiClient.get<ApiResponse<S3File[]>>(
    `/api/watchers/${watcherId}/files`
  );
  return response.data.data || [];
};
