import { apiClient } from './client';
import type { ApiResponse, Department } from '../types';

/**
 * Department Management API Functions
 * All functions require authentication
 */

/**
 * Request body for creating a department
 */
export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description?: string;
  status?: 'active' | 'inactive';
  settings?: Record<string, unknown>;
}

/**
 * Request body for updating a department
 */
export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  description?: string;
  status?: 'active' | 'inactive';
  settings?: Record<string, unknown>;
}

/**
 * List all departments
 * Owners see all departments, editors/viewers see only assigned departments
 */
export const listDepartments = async (): Promise<ApiResponse<Department[]>> => {
  const response = await apiClient.get<ApiResponse<Department[]>>('/api/departments');
  return response.data;
};

/**
 * Get a specific department by ID
 */
export const getDepartment = async (id: number): Promise<ApiResponse<Department>> => {
  const response = await apiClient.get<ApiResponse<Department>>(`/api/departments/${id}`);
  return response.data;
};

/**
 * Create a new department
 * Only accessible by owners
 */
export const createDepartment = async (
  data: CreateDepartmentRequest
): Promise<ApiResponse<Department>> => {
  const response = await apiClient.post<ApiResponse<Department>>('/api/departments', data);
  return response.data;
};

/**
 * Update department details
 * Only accessible by owners
 */
export const updateDepartment = async (
  id: number,
  data: UpdateDepartmentRequest
): Promise<ApiResponse<Department>> => {
  const response = await apiClient.patch<ApiResponse<Department>>(
    `/api/departments/${id}`,
    data
  );
  return response.data;
};

/**
 * Delete a department (soft delete)
 * Only accessible by owners
 */
export const deleteDepartment = async (id: number): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(`/api/departments/${id}`);
  return response.data;
};
