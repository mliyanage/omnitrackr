import apiClient from './client';
import type {
  ApiResponse,
  RefData,
  CreateRefDataRequest,
} from '@/types';

/**
 * Get all reference data
 */
export const getAllRefData = async (): Promise<RefData[]> => {
  const response = await apiClient.get<ApiResponse<RefData[]>>('/api/ref-data');
  return response.data.data || [];
};

/**
 * Get departments
 */
export const getDepartments = async (): Promise<RefData[]> => {
  const response = await apiClient.get<ApiResponse<RefData[]>>('/api/ref-data/departments');
  return response.data.data || [];
};

/**
 * Get timezones
 */
export const getTimezones = async (): Promise<RefData[]> => {
  const response = await apiClient.get<ApiResponse<RefData[]>>('/api/ref-data/timezones');
  return response.data.data || [];
};

/**
 * Create reference data entry
 */
export const createRefData = async (data: CreateRefDataRequest): Promise<RefData> => {
  const response = await apiClient.post<ApiResponse<RefData>>(
    '/api/ref-data',
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to create reference data');
  }
  return response.data.data;
};

/**
 * Update reference data entry by code
 */
export const updateRefData = async (
  code: string,
  data: Partial<CreateRefDataRequest>
): Promise<RefData> => {
  const response = await apiClient.patch<ApiResponse<RefData>>(
    `/api/ref-data/code/${encodeURIComponent(code)}`,
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to update reference data');
  }
  return response.data.data;
};

/**
 * Delete reference data entry by code
 */
export const deleteRefData = async (code: string): Promise<void> => {
  await apiClient.delete(`/api/ref-data/code/${encodeURIComponent(code)}`);
};
