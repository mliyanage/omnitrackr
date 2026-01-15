/**
 * Authentication and User Management Types
 * These types match the backend API responses
 */

export type UserRole = 'super_admin' | 'owner' | 'editor' | 'viewer' | 'service_account';
export type UserStatus = 'active' | 'inactive' | 'suspended';

/**
 * User entity returned from /api/auth/me and user management endpoints
 */
export interface User {
  id: number;
  organization_id: number | null;
  email: string;
  email_verified: boolean;
  email_verified_at: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  role: UserRole;
  status: UserStatus;
  two_fa_enabled: boolean;
  must_change_password: boolean;
  password_expires_at: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  failed_login_attempts: number;
  account_locked_until: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

/**
 * Department with user assignments
 */
export interface Department {
  id: number;
  organization_id: number;
  name: string;
  code: string;
  description: string | null;
  status: 'active' | 'inactive';
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  deleted_at: string | null;
}

/**
 * User with department assignments (extended User)
 */
export interface UserWithDepartments extends User {
  departments?: Department[];
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
  deviceName?: string;
}

/**
 * Login response - can require 2FA or return tokens
 */
export interface LoginResponse {
  requires2FA?: boolean;
  tempToken?: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * 2FA verification request
 */
export interface Verify2FARequest {
  email: string;
  totpCode: string;
  tempToken: string;
  deviceName?: string;
}

/**
 * Token response after successful login or 2FA verification
 */
export interface TokenResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Password reset request
 */
export interface RequestPasswordResetRequest {
  email: string;
}

/**
 * Reset password with token
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * 2FA setup response
 */
export interface Setup2FAResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/**
 * Enable 2FA request
 */
export interface Enable2FARequest {
  totpCode: string;
}

/**
 * Disable 2FA request
 */
export interface Disable2FARequest {
  password: string;
}

/**
 * Regenerate backup codes request
 */
export interface RegenerateBackupCodesRequest {
  password: string;
}

/**
 * Regenerate backup codes response
 */
export interface RegenerateBackupCodesResponse {
  backupCodes: string[];
}

/**
 * Logout request
 */
export interface LogoutRequest {
  refreshToken: string;
}

/**
 * Logout all sessions response
 */
export interface LogoutAllResponse {
  revokedSessions: number;
}

/**
 * Organization entity
 */
export interface Organization {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  primary_color: string | null;
  settings: Record<string, unknown>;
  sso_enabled: boolean;
  sso_provider: string | null;
  sso_config: Record<string, unknown> | null;
  max_users: number;
  max_watchers: number | null;
  subscription_tier: string;
  subscription_expires_at: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  deleted_at: string | null;
}

/**
 * Invite user request
 */
export interface InviteUserRequest {
  email: string;
  role: UserRole;
  departmentIds: number[];
}

/**
 * Invite user response
 */
export interface InviteUserResponse {
  invitation: {
    id: number;
    email: string;
    token: string;
    expires_at: string;
  };
  invitationUrl: string;
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
  role?: UserRole;
  status?: UserStatus;
  departmentIds?: number[];
}

/**
 * Session info for active sessions page
 */
export interface Session {
  id: number;
  user_id: number;
  device_name: string | null;
  user_agent: string | null;
  ip_address: string;
  last_used_at: string;
  expires_at: string;
  created_at: string;
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: number;
  user_id: number | null;
  organization_id: number | null;
  action: 'create' | 'update' | 'delete' | 'read';
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Security event entry
 */
export interface SecurityEvent {
  id: number;
  user_id: number | null;
  organization_id: number | null;
  event_type:
    | 'login_success'
    | 'login_failed'
    | 'login_locked'
    | 'logout'
    | 'password_changed'
    | 'password_reset_requested'
    | 'password_reset_completed'
    | '2fa_enabled'
    | '2fa_disabled'
    | '2fa_verified'
    | '2fa_failed'
    | 'permission_denied'
    | 'account_suspended'
    | 'account_activated'
    | 'suspicious_activity';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
