import apiClient from './client';
import type {
  ApiResponse,
  SourceConnection,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  TestConnectionRequest,
  TestConnectionResponse,
} from '@/types';

/**
 * Get all source connections
 */
export const getConnections = async (): Promise<SourceConnection[]> => {
  const response = await apiClient.get<ApiResponse<SourceConnection[]>>('/api/source-connections');
  return response.data.data || [];
};

/**
 * Get a single connection by ID
 */
export const getConnectionById = async (id: number): Promise<SourceConnection> => {
  const response = await apiClient.get<ApiResponse<SourceConnection>>(`/api/source-connections/${id}`);
  if (!response.data.data) {
    throw new Error('Connection not found');
  }
  return response.data.data;
};

/**
 * Create a new source connection
 */
export const createConnection = async (
  data: CreateConnectionRequest
): Promise<SourceConnection> => {
  const response = await apiClient.post<ApiResponse<SourceConnection>>(
    '/api/source-connections',
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to create connection');
  }
  return response.data.data;
};

/**
 * Update an existing connection
 */
export const updateConnection = async (
  id: number,
  data: UpdateConnectionRequest
): Promise<SourceConnection> => {
  const response = await apiClient.put<ApiResponse<SourceConnection>>(
    `/api/source-connections/${id}`,
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to update connection');
  }
  return response.data.data;
};

/**
 * Delete a connection
 */
export const deleteConnection = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/source-connections/${id}`);
};

/**
 * Test connection
 */
export const testConnection = async (
  data: TestConnectionRequest
): Promise<TestConnectionResponse> => {
  const response = await apiClient.post<ApiResponse<TestConnectionResponse>>(
    '/api/source-connections/test',
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to test connection');
  }
  return response.data.data;
};

/**
 * Get connections by type
 */
export const getConnectionsByType = async (type: string): Promise<SourceConnection[]> => {
  const response = await apiClient.get<ApiResponse<SourceConnection[]>>(
    `/api/source-connections?type=${type}`
  );
  return response.data.data || [];
};
