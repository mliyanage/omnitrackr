import { Knex } from 'knex';
import {
  UserRepository,
  OrganizationRepository,
  RefreshTokenRepository,
  User,
} from '@omnitrackr/shared';
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  checkPasswordHistory,
  savePasswordToHistory,
  calculatePasswordExpiration,
} from '../utils/password.utils';
import {
  generateAccessToken,
  generateTempToken,
  verifyTempToken,
  getTokenExpirySeconds,
} from '../utils/jwt.utils';
import {
  generateSecureToken,
  hashToken,
  calculateTokenExpiration,
  isTokenExpired,
  generateDeviceFingerprint,
} from '../utils/token.utils';
import {
  generateTOTPSecret,
  generateQRCodeDataURL,
  verifyTOTPToken,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from '../utils/totp.utils';
import { UnauthorizedError, ValidationError, NotFoundError } from '../utils/errors';
import { db } from '../config/database';
import { SecurityEventService } from './securityEvent.service';

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
const ACCOUNT_LOCKOUT_MINUTES = parseInt(process.env.ACCOUNT_LOCKOUT_MINUTES || '15');
const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5');

/**
 * Authentication Service
 * Handles all authentication-related business logic
 */
export class AuthService {
  private userRepo: UserRepository;
  private orgRepo: OrganizationRepository;
  private refreshTokenRepo: RefreshTokenRepository;
  private securityEventService: SecurityEventService;

  constructor() {
    this.userRepo = new UserRepository(db);
    this.orgRepo = new OrganizationRepository(db);
    this.refreshTokenRepo = new RefreshTokenRepository(db);
    this.securityEventService = new SecurityEventService();
  }

  /**
   * Login with email and password
   */
  async login(
    email: string,
    password: string,
    deviceInfo: {
      deviceName?: string;
      userAgent?: string;
      ip: string;
    }
  ): Promise<{
    user: Partial<User>;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    requires2FA: boolean;
    tempToken?: string;
    securityRecommendation?: {
      enable2fa: boolean;
      message: string;
    };
  }> {
    // Find user by email
    const user = await this.userRepo.findByEmail(email);

    if (!user || user.deleted_at) {
      // Log failed login attempt
      await this.securityEventService.logEvent({
        eventType: 'login_failed',
        description: `Failed login attempt for email: ${email}`,
        ipAddress: deviceInfo.ip,
        userAgent: deviceInfo.userAgent,
        metadata: { email, reason: 'user_not_found' },
      });
      // Increment failed attempts even if user doesn't exist (prevent enumeration)
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is locked
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const minutesLeft = Math.ceil(
        (new Date(user.locked_until).getTime() - Date.now()) / 60000
      );
      throw new UnauthorizedError(
        `Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`
      );
    }

    // Verify password
    const passwordValid = await comparePassword(password, user.password_hash);

    if (!passwordValid) {
      // Increment failed login attempts
      await this.userRepo.incrementFailedLoginAttempts(user.id);

      // Log failed login attempt
      await this.securityEventService.logEvent({
        userId: user.id,
        organizationId: user.organization_id || undefined,
        eventType: 'login_failed',
        description: `Failed login attempt - invalid password`,
        ipAddress: deviceInfo.ip,
        userAgent: deviceInfo.userAgent,
        metadata: { email, reason: 'invalid_password' },
      });

      // Lock account if max attempts reached
      if (user.failed_login_attempts + 1 >= MAX_LOGIN_ATTEMPTS) {
        await this.userRepo.lockAccount(user.id, ACCOUNT_LOCKOUT_MINUTES);

        // Log account lockout
        await this.securityEventService.logEvent({
          userId: user.id,
          organizationId: user.organization_id || undefined,
          eventType: 'login_locked',
          severity: 'critical',
          description: `Account locked due to ${MAX_LOGIN_ATTEMPTS} failed login attempts`,
          ipAddress: deviceInfo.ip,
          userAgent: deviceInfo.userAgent,
          metadata: { lockoutMinutes: ACCOUNT_LOCKOUT_MINUTES },
        });

        throw new UnauthorizedError(
          `Account locked due to too many failed attempts. Try again in ${ACCOUNT_LOCKOUT_MINUTES} minutes.`
        );
      }

      throw new UnauthorizedError('Invalid email or password');
    }

    // Check email verification
    if (!user.email_verified) {
      throw new UnauthorizedError(
        'Email not verified. Please check your email for verification link.'
      );
    }

    // Check user status
    if (user.status === 'suspended') {
      throw new UnauthorizedError('Account suspended. Contact support.');
    }

    if (user.status === 'deactivated') {
      throw new UnauthorizedError('Account deactivated.');
    }

    if (user.status === 'invited') {
      throw new UnauthorizedError('Please accept your invitation first.');
    }

    // Password is valid - reset failed attempts
    await this.userRepo.resetFailedLoginAttempts(user.id);

    // Check if 2FA is enabled
    if (user.two_fa_enabled) {
      // Generate temporary token for 2FA flow
      const tempToken = generateTempToken({
        userId: user.id,
        email: user.email,
      });

      return {
        user: this.sanitizeUser(user),
        requires2FA: true,
        tempToken,
      };
    }

    // No 2FA - complete login
    const { accessToken, refreshToken, expiresIn } = await this.generateTokens(
      user,
      deviceInfo
    );

    // Update last login
    await this.userRepo.updateLastLogin(user.id, deviceInfo.ip);

    // Log successful login
    await this.securityEventService.logEvent({
      userId: user.id,
      organizationId: user.organization_id || undefined,
      eventType: 'login_success',
      description: `Successful login`,
      ipAddress: deviceInfo.ip,
      userAgent: deviceInfo.userAgent,
      metadata: { email, has2FA: false },
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      expiresIn,
      requires2FA: false,
      securityRecommendation: {
        enable2fa: true,
        message: 'Protect your account with 2FA',
      },
    };
  }

  /**
   * Verify 2FA code and complete login
   */
  async verify2FA(
    email: string,
    totpCode: string,
    tempToken: string,
    deviceInfo: {
      deviceName?: string;
      userAgent?: string;
      ip: string;
    }
  ): Promise<{
    user: Partial<User>;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Verify temp token
    let decoded;
    try {
      decoded = verifyTempToken(tempToken);
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired 2FA session');
    }

    // Verify email matches
    if (decoded.email !== email) {
      throw new UnauthorizedError('Email mismatch');
    }

    const user = await this.userRepo.findById<User>(decoded.userId);
    if (!user || user.deleted_at) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.two_fa_enabled || !user.two_fa_secret) {
      throw new UnauthorizedError('2FA not enabled for this user');
    }

    // Verify TOTP code or backup code
    let isValid = false;

    // Try TOTP first
    if (verifyTOTPToken(totpCode, user.two_fa_secret)) {
      isValid = true;
    } else {
      // Try backup codes
      const backupCodes = user.two_fa_backup_codes || [];
      for (let i = 0; i < backupCodes.length; i++) {
        if (await verifyBackupCode(totpCode, backupCodes[i])) {
          isValid = true;
          // Remove used backup code
          backupCodes.splice(i, 1);
          await this.userRepo.update(user.id, {
            two_fa_backup_codes: backupCodes,
          } as any);
          break;
        }
      }
    }

    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA code');
    }

    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = await this.generateTokens(
      user,
      deviceInfo
    );

    // Update last login
    await this.userRepo.updateLastLogin(user.id, deviceInfo.ip);

    // Log successful login with 2FA
    await this.securityEventService.logEvent({
      userId: user.id,
      organizationId: user.organization_id || undefined,
      eventType: 'login_success',
      description: `Successful login with 2FA`,
      ipAddress: deviceInfo.ip,
      userAgent: deviceInfo.userAgent,
      metadata: { email: user.email, has2FA: true },
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshTokenString: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const tokenHash = hashToken(refreshTokenString);

    // Find refresh token
    const refreshToken = await this.refreshTokenRepo.findByTokenHash(tokenHash);

    if (!refreshToken || refreshToken.revoked_at) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check expiration
    if (isTokenExpired(refreshToken.expires_at)) {
      throw new UnauthorizedError('Refresh token expired');
    }

    // Get user
    const user = await this.userRepo.findById<User>(refreshToken.user_id);

    if (!user || user.deleted_at || user.status !== 'active') {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Update last used
    await this.refreshTokenRepo.updateLastUsed(refreshToken.id);

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user.id,
      organizationId: user.organization_id || null,
      role: user.role,
      email: user.email,
    });

    return {
      accessToken,
      expiresIn: getTokenExpirySeconds(),
    };
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(refreshTokenString: string, reason = 'logout'): Promise<void> {
    const tokenHash = hashToken(refreshTokenString);
    const refreshToken = await this.refreshTokenRepo.findByTokenHash(tokenHash);

    if (refreshToken) {
      await this.refreshTokenRepo.revokeToken(refreshToken.id, reason);
    }
  }

  /**
   * Logout all sessions for user
   */
  async logoutAll(userId: number): Promise<number> {
    return this.refreshTokenRepo.revokeAllForUser(userId, 'logout_all');
  }

  /**
   * Change password
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await this.userRepo.findById<User>(userId);

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Verify current password
    const passwordValid = await comparePassword(currentPassword, user.password_hash);

    if (!passwordValid) {
      throw new ValidationError('Current password is incorrect');
    }

    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join('. '));
    }

    // Check password history
    const isUnique = await checkPasswordHistory(userId, newPassword, db);
    if (!isUnique) {
      throw new ValidationError(
        `Password was used recently. Please choose a different password.`
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await this.userRepo.update(userId, {
      password_hash: newPasswordHash,
      password_changed_at: db.fn.now(),
      password_expires_at: calculatePasswordExpiration(),
      must_change_password: false,
    } as any);

    // Save to password history
    await savePasswordToHistory(userId, newPasswordHash, db);

    // Log password change
    await this.securityEventService.logEvent({
      userId: user.id,
      organizationId: user.organization_id || undefined,
      eventType: 'password_changed',
      description: `Password changed successfully`,
      ipAddress,
      userAgent,
      metadata: { email: user.email },
    });

    // Revoke all existing sessions (force re-login)
    await this.refreshTokenRepo.revokeAllForUser(userId, 'password_change');
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);

    if (!user || user.deleted_at) {
      // Don't reveal if user exists
      return;
    }

    // Generate reset token
    const resetToken = generateSecureToken();
    const tokenHash = hashToken(resetToken);

    // Store token in database
    await db('password_reset_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: calculateTokenExpiration(24), // 24 hours
      created_at: db.fn.now(),
    });

    // TODO: Send email with reset link (Phase 1 - EmailService)
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  /**
   * Setup 2FA - Generate secret and QR code
   * User must verify with a TOTP code before enabling
   */
  async setup2FA(userId: number): Promise<{
    secret: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
  }> {
    const user = await this.userRepo.findById<User>(userId);

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (user.two_fa_enabled) {
      throw new ValidationError('2FA is already enabled. Disable it first to regenerate.');
    }

    // Generate TOTP secret
    const { secret, otpauthUrl } = generateTOTPSecret(user.email);

    // Generate QR code
    const qrCodeDataUrl = await generateQRCodeDataURL(otpauthUrl);

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => hashBackupCode(code))
    );

    // Store secret and backup codes temporarily (not enabled yet)
    await this.userRepo.update(userId, {
      two_fa_secret: secret,
      two_fa_backup_codes: hashedBackupCodes,
      two_fa_enabled: false, // Not enabled until verified
    } as any);

    return {
      secret,
      qrCodeDataUrl,
      backupCodes, // Return plain text codes for user to save
    };
  }

  /**
   * Enable 2FA - Verify TOTP code and enable 2FA
   */
  async enable2FA(
    userId: number,
    totpCode: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await this.userRepo.findById<User>(userId);

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (user.two_fa_enabled) {
      throw new ValidationError('2FA is already enabled');
    }

    if (!user.two_fa_secret) {
      throw new ValidationError('2FA setup not initiated. Call setup2FA first.');
    }

    // Verify TOTP code
    if (!verifyTOTPToken(totpCode, user.two_fa_secret)) {
      throw new ValidationError('Invalid 2FA code. Please try again.');
    }

    // Enable 2FA
    await this.userRepo.update(userId, {
      two_fa_enabled: true,
      two_fa_enabled_at: db.fn.now(),
    } as any);

    // Log 2FA enabled
    await this.securityEventService.logEvent({
      userId: user.id,
      organizationId: user.organization_id || undefined,
      eventType: '2fa_enabled',
      description: `Two-factor authentication enabled`,
      ipAddress,
      userAgent,
      metadata: { email: user.email },
    });
  }

  /**
   * Disable 2FA - Requires password verification
   */
  async disable2FA(userId: number, password: string): Promise<void> {
    const user = await this.userRepo.findById<User>(userId);

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (!user.two_fa_enabled) {
      throw new ValidationError('2FA is not enabled');
    }

    // Verify password
    const passwordValid = await comparePassword(password, user.password_hash);

    if (!passwordValid) {
      throw new ValidationError('Incorrect password');
    }

    // Disable 2FA and clear secret/backup codes
    await this.userRepo.update(userId, {
      two_fa_enabled: false,
      two_fa_secret: null,
      two_fa_backup_codes: null,
      two_fa_enabled_at: null,
    } as any);
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(
    userId: number,
    password: string
  ): Promise<string[]> {
    const user = await this.userRepo.findById<User>(userId);

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (!user.two_fa_enabled) {
      throw new ValidationError('2FA is not enabled');
    }

    // Verify password
    const passwordValid = await comparePassword(password, user.password_hash);

    if (!passwordValid) {
      throw new ValidationError('Incorrect password');
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => hashBackupCode(code))
    );

    // Update backup codes
    await this.userRepo.update(userId, {
      two_fa_backup_codes: hashedBackupCodes,
    } as any);

    return backupCodes; // Return plain text codes for user to save
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    user: User,
    deviceInfo: {
      deviceName?: string;
      userAgent?: string;
      ip: string;
    }
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Check concurrent sessions limit
    const activeSessions = await this.refreshTokenRepo.countActiveSessions(user.id);

    if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
      // Revoke oldest session
      const sessions = await this.refreshTokenRepo.findActiveByUser(user.id);
      if (sessions.length > 0) {
        await this.refreshTokenRepo.revokeToken(
          sessions[sessions.length - 1].id,
          'max_sessions_exceeded'
        );
      }
    }

    // Generate access token
    const accessToken = generateAccessToken({
      userId: user.id,
      organizationId: user.organization_id || null,
      role: user.role,
      email: user.email,
    });

    // Generate refresh token
    const refreshTokenString = generateSecureToken();
    const tokenHash = hashToken(refreshTokenString);

    // Store refresh token
    await db('refresh_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      device_name: deviceInfo.deviceName,
      device_fingerprint: generateDeviceFingerprint(
        deviceInfo.userAgent || '',
        deviceInfo.ip
      ),
      ip_address: deviceInfo.ip,
      user_agent: deviceInfo.userAgent,
      expires_at: calculateTokenExpiration(30 * 24), // 30 days
      created_at: db.fn.now(),
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
      expiresIn: getTokenExpirySeconds(),
    };
  }

  /**
   * Remove sensitive fields from user object
   */
  /**
   * Generate tokens for a user (public method for use by other services)
   */
  async generateTokensForUser(
    user: User,
    deviceInfo: {
      deviceName?: string;
      userAgent?: string;
      ip: string;
    }
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    return this.generateTokens(user, deviceInfo);
  }

  private sanitizeUser(user: User): Partial<User> {
    const {
      password_hash,
      two_fa_secret,
      two_fa_backup_codes,
      failed_login_attempts,
      locked_until,
      deleted_at,
      ...sanitized
    } = user;

    return sanitized;
  }
}
