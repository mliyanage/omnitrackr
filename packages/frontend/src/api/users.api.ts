import { apiClient } from './client';
import type {
  ApiResponse,
  UserWithDepartments,
  InviteUserRequest,
  InviteUserResponse,
  UpdateUserRequest,
} from '../types';

/**
 * User Management API Functions
 * All functions require authentication
 */

/**
 * List all users in the organization
 * Only accessible by owners and super admins
 */
export const listUsers = async (): Promise<ApiResponse<UserWithDepartments[]>> => {
  const response = await apiClient.get<ApiResponse<UserWithDepartments[]>>('/users');
  return response.data;
};

/**
 * Get a specific user by ID
 */
export const getUser = async (id: number): Promise<ApiResponse<UserWithDepartments>> => {
  const response = await apiClient.get<ApiResponse<UserWithDepartments>>(`/users/${id}`);
  return response.data;
};

/**
 * Invite a new user to the organization
 * Only accessible by owners
 */
export const inviteUser = async (
  data: InviteUserRequest
): Promise<ApiResponse<InviteUserResponse>> => {
  const response = await apiClient.post<ApiResponse<InviteUserResponse>>('/users/invite', data);
  return response.data;
};

/**
 * Update user details
 * Owners can update any user, users can update themselves
 */
export const updateUser = async (
  id: number,
  data: UpdateUserRequest
): Promise<ApiResponse<UserWithDepartments>> => {
  const response = await apiClient.patch<ApiResponse<UserWithDepartments>>(
    `/users/${id}`,
    data
  );
  return response.data;
};

/**
 * Deactivate a user
 * Only accessible by owners
 */
export const deactivateUser = async (id: number): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(`/users/${id}`);
  return response.data;
};

/**
 * Assign user to departments
 * Only accessible by owners
 */
export const assignDepartments = async (
  userId: number,
  departmentIds: number[]
): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(`/users/${userId}/departments`, {
    departmentIds,
  });
  return response.data;
};

/**
 * Accept invitation and create user account
 * Public endpoint - no authentication required
 */
export interface AcceptInvitationRequest {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface AcceptInvitationResponse {
  user: UserWithDepartments;
  accessToken: string;
  refreshToken: string;
}

export const acceptInvitation = async (
  data: AcceptInvitationRequest
): Promise<ApiResponse<AcceptInvitationResponse>> => {
  const response = await apiClient.post<ApiResponse<AcceptInvitationResponse>>(
    '/users/accept-invitation',
    data
  );
  return response.data;
};
