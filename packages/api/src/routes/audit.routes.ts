import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { requireOwnerOrSuperAdmin } from '../middleware/authorization.middleware';

const router = Router();
const auditController = new AuditController();

/**
 * All audit routes require owner or super_admin role
 * Authentication is already applied at the main router level
 */

/**
 * @route   GET /api/audit/logs
 * @desc    Query audit logs with filters
 * @access  Private (Owner, Super Admin)
 */
router.get('/logs', requireOwnerOrSuperAdmin(), auditController.queryAuditLogs);

/**
 * @route   GET /api/audit/logs/stats
 * @desc    Get audit log statistics
 * @access  Private (Owner, Super Admin)
 */
router.get('/logs/stats', requireOwnerOrSuperAdmin(), auditController.getAuditStats);

/**
 * @route   GET /api/audit/security-events
 * @desc    Query security events with filters
 * @access  Private (Owner, Super Admin)
 */
router.get('/security-events', requireOwnerOrSuperAdmin(), auditController.querySecurityEvents);

/**
 * @route   GET /api/audit/security-events/critical
 * @desc    Get critical security events
 * @access  Private (Owner, Super Admin)
 */
router.get('/security-events/critical', requireOwnerOrSuperAdmin(), auditController.getCriticalEvents);

/**
 * @route   GET /api/audit/security-events/stats
 * @desc    Get security event statistics
 * @access  Private (Owner, Super Admin)
 */
router.get('/security-events/stats', requireOwnerOrSuperAdmin(), auditController.getSecurityStats);

export default router;
