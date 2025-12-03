import apiClient from './client';
import type {
  ApiResponse,
  Schedule,
  ScheduleExclusion,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  CreateScheduleExclusionRequest,
} from '@/types';

/**
 * Get all schedules
 */
export const getSchedules = async (): Promise<Schedule[]> => {
  const response = await apiClient.get<ApiResponse<Schedule[]>>('/api/schedules');
  return response.data.data || [];
};

/**
 * Get a single schedule by ID
 */
export const getScheduleById = async (id: number): Promise<Schedule> => {
  const response = await apiClient.get<ApiResponse<Schedule>>(`/api/schedules/${id}`);
  if (!response.data.data) {
    throw new Error('Schedule not found');
  }
  return response.data.data;
};

/**
 * Create a new schedule
 */
export const createSchedule = async (
  data: CreateScheduleRequest
): Promise<Schedule> => {
  const response = await apiClient.post<ApiResponse<Schedule>>(
    '/api/schedules',
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to create schedule');
  }
  return response.data.data;
};

/**
 * Update an existing schedule
 */
export const updateSchedule = async (
  id: number,
  data: UpdateScheduleRequest
): Promise<Schedule> => {
  const response = await apiClient.patch<ApiResponse<Schedule>>(
    `/api/schedules/${id}`,
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to update schedule');
  }
  return response.data.data;
};

/**
 * Delete a schedule
 */
export const deleteSchedule = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/schedules/${id}`);
};

/**
 * Calculate next run time for a schedule
 */
export const calculateNextRunTime = async (id: number): Promise<{ nextRunTime: string | null }> => {
  const response = await apiClient.get<ApiResponse<{ nextRunTime: string | null }>>(
    `/api/schedules/${id}/next-run`
  );
  if (!response.data.data) {
    throw new Error('Failed to calculate next run time');
  }
  return response.data.data;
};

// ============================================================================
// Schedule Exclusions
// ============================================================================

/**
 * Get exclusions for a schedule
 */
export const getScheduleExclusions = async (scheduleId: number): Promise<ScheduleExclusion[]> => {
  const response = await apiClient.get<ApiResponse<ScheduleExclusion[]>>(
    `/api/schedules/${scheduleId}/exclusions`
  );
  return response.data.data || [];
};

/**
 * Create a schedule exclusion
 */
export const createScheduleExclusion = async (
  data: CreateScheduleExclusionRequest
): Promise<ScheduleExclusion> => {
  const response = await apiClient.post<ApiResponse<ScheduleExclusion>>(
    `/api/schedules/${data.schedule_id}/exclusions`,
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to create exclusion');
  }
  return response.data.data;
};

/**
 * Delete a schedule exclusion
 */
export const deleteScheduleExclusion = async (
  scheduleId: number,
  exclusionId: number
): Promise<void> => {
  await apiClient.delete(`/api/schedules/${scheduleId}/exclusions/${exclusionId}`);
};
