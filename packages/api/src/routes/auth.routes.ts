import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import {
  authRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
} from '../middleware/rateLimiter.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login with email and password
 * @access  Public
 */
router.post('/login', authRateLimiter, authController.login);

/**
 * @route   POST /api/auth/verify-2fa
 * @desc    Verify 2FA code and complete login
 * @access  Public
 */
router.post('/verify-2fa', authRateLimiter, authController.verify2FA);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', authController.refresh);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout from current session (revoke refresh token)
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all sessions
 * @access  Private
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticate, authController.me);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 */
router.post('/change-password', authenticate, authController.changePassword);

/**
 * @route   POST /api/auth/request-password-reset
 * @desc    Request password reset link via email
 * @access  Public
 */
router.post(
  '/request-password-reset',
  passwordResetRateLimiter,
  authController.requestPasswordReset
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token from email
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address using token from email
 * @access  Public
 */
router.post(
  '/verify-email',
  emailVerificationRateLimiter,
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post(
  '/resend-verification',
  emailVerificationRateLimiter,
  authController.resendVerification
);

/**
 * @route   POST /api/auth/2fa/setup
 * @desc    Setup 2FA - Generate secret and QR code
 * @access  Private
 */
router.post('/2fa/setup', authenticate, authController.setup2FA);

/**
 * @route   POST /api/auth/2fa/enable
 * @desc    Enable 2FA after verifying TOTP code
 * @access  Private
 */
router.post('/2fa/enable', authenticate, authController.enable2FA);

/**
 * @route   POST /api/auth/2fa/disable
 * @desc    Disable 2FA with password verification
 * @access  Private
 */
router.post('/2fa/disable', authenticate, authController.disable2FA);

/**
 * @route   POST /api/auth/2fa/regenerate-backup-codes
 * @desc    Regenerate backup codes with password verification
 * @access  Private
 */
router.post('/2fa/regenerate-backup-codes', authenticate, authController.regenerateBackupCodes);

export default router;
