import { apiClient } from './client';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  Verify2FARequest,
  TokenResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ChangePasswordRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
  Setup2FAResponse,
  Enable2FARequest,
  Disable2FARequest,
  RegenerateBackupCodesRequest,
  RegenerateBackupCodesResponse,
  LogoutRequest,
  LogoutAllResponse,
  User,
} from '../types';

/**
 * Authentication API Functions
 * All functions use the authenticated apiClient
 */

/**
 * Login with email and password
 * Returns either tokens or 2FA challenge
 */
export const login = async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
  const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data);
  return response.data;
};

/**
 * Verify 2FA code and complete login
 */
export const verify2FA = async (data: Verify2FARequest): Promise<ApiResponse<TokenResponse>> => {
  const response = await apiClient.post<ApiResponse<TokenResponse>>('/auth/verify-2fa', data);
  return response.data;
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (
  data: RefreshTokenRequest
): Promise<ApiResponse<RefreshTokenResponse>> => {
  const response = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
    '/auth/refresh',
    data
  );
  return response.data;
};

/**
 * Logout from current session
 */
export const logout = async (data: LogoutRequest): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>('/auth/logout', data);
  return response.data;
};

/**
 * Logout from all sessions
 */
export const logoutAll = async (): Promise<ApiResponse<LogoutAllResponse>> => {
  const response = await apiClient.post<ApiResponse<LogoutAllResponse>>('/auth/logout-all');
  return response.data;
};

/**
 * Get current authenticated user
 */
export const getMe = async (): Promise<ApiResponse<User>> => {
  const response = await apiClient.get<ApiResponse<User>>('/auth/me');
  return response.data;
};

/**
 * Change password for authenticated user
 */
export const changePassword = async (
  data: ChangePasswordRequest
): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>('/auth/change-password', data);
  return response.data;
};

/**
 * Request password reset link via email
 */
export const requestPasswordReset = async (
  data: RequestPasswordResetRequest
): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(
    '/auth/request-password-reset',
    data
  );
  return response.data;
};

/**
 * Reset password using token from email
 */
export const resetPassword = async (data: ResetPasswordRequest): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>('/auth/reset-password', data);
  return response.data;
};

/**
 * Setup 2FA - Generate secret and QR code
 */
export const setup2FA = async (): Promise<ApiResponse<Setup2FAResponse>> => {
  const response = await apiClient.post<ApiResponse<Setup2FAResponse>>('/auth/2fa/setup');
  return response.data;
};

/**
 * Enable 2FA after verifying TOTP code
 */
export const enable2FA = async (data: Enable2FARequest): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>('/auth/2fa/enable', data);
  return response.data;
};

/**
 * Disable 2FA with password verification
 */
export const disable2FA = async (data: Disable2FARequest): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>('/auth/2fa/disable', data);
  return response.data;
};

/**
 * Regenerate backup codes with password verification
 */
export const regenerateBackupCodes = async (
  data: RegenerateBackupCodesRequest
): Promise<ApiResponse<RegenerateBackupCodesResponse>> => {
  const response = await apiClient.post<ApiResponse<RegenerateBackupCodesResponse>>(
    '/auth/2fa/regenerate-backup-codes',
    data
  );
  return response.data;
};

/**
 * Verify email address using token from email
 */
export const verifyEmail = async (token: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>('/auth/verify-email', { token });
  return response.data;
};

/**
 * Resend email verification link
 */
export const resendVerification = async (email: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>('/auth/resend-verification', {
    email,
  });
  return response.data;
};
