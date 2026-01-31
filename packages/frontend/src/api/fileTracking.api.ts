import apiClient from './client';
import type { PaginatedApiResponse, ApiResponse } from '@/types';

/**
 * File Tracking API Client
 */

export type FileTracking = {
  id: number;
  watcher_id: number;
  expected_pattern: string;
  expected_at: string;
  expected_schedule?: string;
  sla_threshold_minutes: number;
  sla_deadline: string;
  tracking_status: 'pending' | 'arrived' | 'late' | 'missing';
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  arrived_at?: string | null;
  alert_triggered: boolean;
  alert_triggered_at?: string | null;
  alert_type?: 'sla_at_risk' | 'sla_breached' | 'file_arrived' | null;
  created_at: string;
  updated_at: string;
  watcher?: {
    id: number;
    name: string;
    department_code?: string;
    sla_enabled?: boolean;
  };
};

export type SLADashboardSummary = {
  period_start: Date;
  period_end: Date;
  total_expected: number;
  arrived_on_time: number;
  arrived_late: number;
  missing: number;
  pending: number;
  on_time_percentage: number;
  at_risk_count: number;
};

export type FileTrackingQueryParams = {
  watcher_id?: number;
  tracking_status?: 'pending' | 'arrived' | 'late' | 'missing';
  alert_triggered?: boolean;
  expected_from?: string;
  expected_to?: string;
  direction?: 'inward' | 'outward' | 'bidirectional';
  page?: number;
  limit?: number;
};

/**
 * Get all file tracking records with filters and pagination
 */
export const getFileTracking = async (
  params?: FileTrackingQueryParams
): Promise<{
  data: FileTracking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const response = await apiClient.get<
    PaginatedApiResponse<FileTracking[]>
  >('/file-tracking', { params });

  return {
    data: response.data.data || [],
    pagination: response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 },
  };
};

/**
 * Get file tracking by ID
 */
export const getFileTrackingById = async (id: number): Promise<FileTracking> => {
  const response = await apiClient.get<ApiResponse<FileTracking>>(
    `/file-tracking/${id}`
  );
  if (!response.data.data) {
    throw new Error('File tracking record not found');
  }
  return response.data.data;
};

/**
 * Get SLA summary statistics with all filters
 */
export const getSLASummary = async (params?: {
  from_date?: string;
  to_date?: string;
  watcher_id?: number;
  tracking_status?: 'pending' | 'arrived' | 'late' | 'missing';
  alert_triggered?: boolean;
  direction?: 'inward' | 'outward' | 'bidirectional';
}): Promise<SLADashboardSummary> => {
  const response = await apiClient.get<ApiResponse<SLADashboardSummary>>(
    '/file-tracking/summary',
    { params }
  );
  if (!response.data.data) {
    throw new Error('Failed to get SLA summary');
  }
  return response.data.data;
};

/**
 * Manually mark a file tracking record as arrived
 */
export const markFileAsArrived = async (
  trackingId: number,
  fileData: {
    file_path: string;
    file_name: string;
    file_size: number;
    arrived_at: string;
  }
): Promise<FileTracking> => {
  const response = await apiClient.post<ApiResponse<FileTracking>>(
    `/file-tracking/${trackingId}/mark-arrived`,
    fileData
  );
  if (!response.data.data) {
    throw new Error('Failed to mark file as arrived');
  }
  return response.data.data;
};
