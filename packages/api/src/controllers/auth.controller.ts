import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../utils/errors';
import { db } from '../config/database';

/**
 * Authentication Controller
 * Handles HTTP requests for authentication
 */
export class AuthController {
  private authService: AuthService;
  private emailService: EmailService;

  constructor() {
    this.authService = new AuthService();
    this.emailService = new EmailService();
  }

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, deviceName } = req.body;

      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      const deviceInfo = {
        deviceName,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      };

      const result = await this.authService.login(email, password, deviceInfo);

      res.status(200).json({
        success: true,
        data: result,
        message: result.requires2FA
          ? '2FA required. Please enter your verification code.'
          : 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/verify-2fa
   * Verify 2FA code and complete login
   */
  verify2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, totpCode, tempToken, deviceName } = req.body;

      if (!email || !totpCode || !tempToken) {
        throw new ValidationError('Email, TOTP code, and temporary token are required');
      }

      const deviceInfo = {
        deviceName,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      };

      const result = await this.authService.verify2FA(
        email,
        totpCode,
        tempToken,
        deviceInfo
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      const result = await this.authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/logout
   * Logout current session
   */
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      await this.authService.logout(refreshToken, 'logout');

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/logout-all
   * Logout all sessions for current user
   */
  logoutAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user.id;

      const revokedCount = await this.authService.logoutAll(userId);

      res.status(200).json({
        success: true,
        data: { revokedSessions: revokedCount },
        message: `Logged out from ${revokedCount} device(s) successfully`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user.id;

      // Fetch full user details
      const user = await db('users')
        .where({ id: userId })
        .first();

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      // Remove sensitive fields and map field names for frontend
      const { password_hash, two_fa_secret, two_fa_backup_codes, phone_number, ...sanitizedUser } = user;

      res.status(200).json({
        success: true,
        data: {
          ...sanitizedUser,
          phone: phone_number, // Map phone_number to phone for frontend compatibility
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/change-password
   * Change password for authenticated user
   */
  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required');
      }

      await this.authService.changePassword(
        userId,
        currentPassword,
        newPassword,
        req.ip,
        req.headers['user-agent']
      );

      // Send notification email
      const user = await db('users').where({ id: userId }).first();
      if (user) {
        await this.emailService.sendPasswordChangedEmail(user.email, user.first_name);
      }

      res.status(200).json({
        success: true,
        message:
          'Password changed successfully. You have been logged out from all devices for security.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/request-password-reset
   * Request password reset link via email
   */
  requestPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ValidationError('Email is required');
      }

      // Generate reset token and send email
      await this.authService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/reset-password
   * Reset password using token from email
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new ValidationError('Token and new password are required');
      }

      // TODO: Implement password reset with token verification
      // This will be completed after implementing the full reset flow
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Password reset functionality coming soon',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/verify-email
   * Verify email address using token from email
   */
  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      if (!token) {
        throw new ValidationError('Verification token is required');
      }

      // TODO: Implement email verification with token
      // This will be completed after implementing the registration flow
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Email verification functionality coming soon',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/resend-verification
   * Resend email verification link
   */
  resendVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ValidationError('Email is required');
      }

      // TODO: Implement resend verification
      // This will be completed after implementing the registration flow
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Resend verification functionality coming soon',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/2fa/setup
   * Setup 2FA - Generate secret and QR code
   */
  setup2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user.id;

      const result = await this.authService.setup2FA(userId);

      res.status(200).json({
        success: true,
        data: result,
        message:
          'Scan the QR code with your authenticator app and save the backup codes in a secure location.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/2fa/enable
   * Enable 2FA after verifying TOTP code
   */
  enable2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user.id;
      const { totpCode } = req.body;

      if (!totpCode) {
        throw new ValidationError('TOTP code is required');
      }

      await this.authService.enable2FA(userId, totpCode, req.ip, req.headers['user-agent']);

      // Send notification email
      const user = await db('users').where({ id: userId }).first();
      if (user) {
        await this.emailService.send2FAEnabledEmail(user.email, user.first_name);
      }

      res.status(200).json({
        success: true,
        message: '2FA enabled successfully. Your account is now more secure.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/2fa/disable
   * Disable 2FA with password verification
   */
  disable2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user.id;
      const { password } = req.body;

      if (!password) {
        throw new ValidationError('Password is required to disable 2FA');
      }

      await this.authService.disable2FA(userId, password);

      res.status(200).json({
        success: true,
        message: '2FA disabled successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/2fa/regenerate-backup-codes
   * Regenerate backup codes with password verification
   */
  regenerateBackupCodes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user.id;
      const { password } = req.body;

      if (!password) {
        throw new ValidationError('Password is required to regenerate backup codes');
      }

      const backupCodes = await this.authService.regenerateBackupCodes(userId, password);

      res.status(200).json({
        success: true,
        data: { backupCodes },
        message:
          'New backup codes generated. Please save them in a secure location. Previous codes are no longer valid.',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
