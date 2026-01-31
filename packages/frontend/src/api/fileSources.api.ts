import apiClient from './client';
import type {
  ApiResponse,
  FileSource,
  CreateFileSourceRequest,
  UpdateFileSourceRequest,
  TestConnectionRequest,
  TestConnectionResponse,
} from '@/types';

/**
 * Get all file sources
 */
export const getFileSources = async (): Promise<FileSource[]> => {
  const response = await apiClient.get<ApiResponse<FileSource[]>>('/file-sources');
  return response.data.data || [];
};

/**
 * Get a single file source by ID
 */
export const getFileSourceById = async (id: string): Promise<FileSource> => {
  const response = await apiClient.get<ApiResponse<FileSource>>(`/file-sources/${id}`);
  if (!response.data.data) {
    throw new Error('File source not found');
  }
  return response.data.data;
};

/**
 * Create a new file source
 */
export const createFileSource = async (
  data: CreateFileSourceRequest
): Promise<FileSource> => {
  const response = await apiClient.post<ApiResponse<FileSource>>(
    '/file-sources',
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to create file source');
  }
  return response.data.data;
};

/**
 * Update an existing file source
 */
export const updateFileSource = async (
  id: string,
  data: UpdateFileSourceRequest
): Promise<FileSource> => {
  const response = await apiClient.put<ApiResponse<FileSource>>(
    `/file-sources/${id}`,
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to update file source');
  }
  return response.data.data;
};

/**
 * Delete a file source
 */
export const deleteFileSource = async (id: string): Promise<void> => {
  await apiClient.delete(`/file-sources/${id}`);
};

/**
 * Toggle file source active status
 */
export const toggleFileSource = async (id: string): Promise<FileSource> => {
  const response = await apiClient.patch<ApiResponse<FileSource>>(
    `/file-sources/${id}/toggle`
  );
  if (!response.data.data) {
    throw new Error('Failed to toggle file source');
  }
  return response.data.data;
};

/**
 * Test connection to a file source
 */
export const testConnection = async (
  data: TestConnectionRequest
): Promise<TestConnectionResponse> => {
  const response = await apiClient.post<ApiResponse<TestConnectionResponse>>(
    '/file-sources/s3/test-connection',
    data
  );
  if (!response.data.data) {
    throw new Error('Failed to test connection');
  }
  return response.data.data;
};
