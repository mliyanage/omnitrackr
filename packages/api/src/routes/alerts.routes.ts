import { Router } from 'express';
import { alertController } from '../controllers/alert.controller';
import { requireEditor } from '../middleware/authorization.middleware';

const router = Router();

// ==================== Alert Configs ====================

/**
 * @route   GET /api/alerts/configs
 * @desc    Get all alert configurations
 * @access  Private (All roles can view)
 */
router.get('/configs', alertController.getAllConfigs);

/**
 * @route   POST /api/alerts/configs
 * @desc    Create a new alert configuration
 * @access  Private (Owner, Editor only)
 */
router.post('/configs', requireEditor(), alertController.createConfig);

// ==================== Escalations (must come before /configs/:id) ====================

/**
 * @route   GET /api/alerts/configs/:configId/escalations
 * @desc    Get all escalations for an alert config
 * @access  Private (All roles can view)
 */
router.get('/configs/:configId/escalations', alertController.getEscalations);

/**
 * @route   POST /api/alerts/escalations
 * @desc    Create a new escalation level
 * @access  Private (Owner, Editor only)
 */
router.post('/escalations', requireEditor(), alertController.createEscalation);

/**
 * @route   PATCH /api/alerts/escalations/:id
 * @desc    Update an escalation level
 * @access  Private (Owner, Editor only)
 */
router.patch(
  '/escalations/:id',
  requireEditor(),
  alertController.updateEscalation
);

/**
 * @route   DELETE /api/alerts/escalations/:id
 * @desc    Delete an escalation level (soft delete)
 * @access  Private (Owner, Editor only)
 */
router.delete(
  '/escalations/:id',
  requireEditor(),
  alertController.deleteEscalation
);

/**
 * @route   GET /api/alerts/configs/:id
 * @desc    Get a single alert configuration by ID
 * @access  Private (All roles can view)
 */
router.get('/configs/:id', alertController.getConfigById);

/**
 * @route   PATCH /api/alerts/configs/:id
 * @desc    Update an alert configuration
 * @access  Private (Owner, Editor only)
 */
router.patch('/configs/:id', requireEditor(), alertController.updateConfig);

/**
 * @route   DELETE /api/alerts/configs/:id
 * @desc    Delete an alert configuration (soft delete)
 * @access  Private (Owner, Editor only)
 */
router.delete('/configs/:id', requireEditor(), alertController.deleteConfig);

// ==================== Recipient Groups ====================

/**
 * @route   GET /api/alerts/recipient-groups
 * @desc    Get all recipient groups
 * @access  Private (All roles can view)
 */
router.get('/recipient-groups', alertController.getAllRecipientGroups);

/**
 * @route   GET /api/alerts/recipient-groups/:id
 * @desc    Get a single recipient group by ID
 * @access  Private (All roles can view)
 */
router.get('/recipient-groups/:id', alertController.getRecipientGroupById);

/**
 * @route   POST /api/alerts/recipient-groups
 * @desc    Create a new recipient group
 * @access  Private (Owner, Editor only)
 */
router.post(
  '/recipient-groups',
  requireEditor(),
  alertController.createRecipientGroup
);

/**
 * @route   PATCH /api/alerts/recipient-groups/:id
 * @desc    Update a recipient group
 * @access  Private (Owner, Editor only)
 */
router.patch(
  '/recipient-groups/:id',
  requireEditor(),
  alertController.updateRecipientGroup
);

/**
 * @route   DELETE /api/alerts/recipient-groups/:id
 * @desc    Delete a recipient group (soft delete)
 * @access  Private (Owner, Editor only)
 */
router.delete(
  '/recipient-groups/:id',
  requireEditor(),
  alertController.deleteRecipientGroup
);

// ==================== Alert History ====================

/**
 * @route   GET /api/alerts/history
 * @desc    Get alert history with filters and pagination
 * @access  Private (All roles can view)
 */
router.get('/history', alertController.getAlertHistory);

// ==================== Comments ====================
// NOTE: Must be defined BEFORE /history/:id to avoid route conflicts

/**
 * @route   GET /api/alerts/history/:id/comments
 * @desc    Get all comments for an alert
 * @access  Private (All roles can view)
 */
router.get('/history/:id/comments', alertController.getAlertComments);

/**
 * @route   POST /api/alerts/history/:id/comments
 * @desc    Add a comment to an alert
 * @access  Private (Owner, Editor only)
 */
router.post(
  '/history/:id/comments',
  requireEditor(),
  alertController.addAlertComment
);

/**
 * @route   POST /api/alerts/history/:id/acknowledge
 * @desc    Acknowledge an alert
 * @access  Private (Owner, Editor only)
 */
router.post(
  '/history/:id/acknowledge',
  requireEditor(),
  alertController.acknowledgeAlert
);

/**
 * @route   GET /api/alerts/history/:id
 * @desc    Get a single alert by ID
 * @access  Private (All roles can view)
 */
router.get('/history/:id', alertController.getAlertHistoryById);

// ==================== Statistics ====================

/**
 * @route   GET /api/alerts/stats
 * @desc    Get alert dashboard statistics
 * @access  Private (All roles can view)
 */
router.get('/stats', alertController.getStats);

export default router;
