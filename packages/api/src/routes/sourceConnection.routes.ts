import { Router } from 'express';
import { sourceConnectionController } from '../controllers/sourceConnection.controller';
import { requireEditor } from '../middleware/authorization.middleware';

const router = Router();

/**
 * @route   GET /api/source-connections
 * @desc    Get all source connections with pagination
 * @access  Private
 */
router.get('/', sourceConnectionController.getAll);

/**
 * @route   GET /api/source-connections/:id
 * @desc    Get a single source connection by ID
 * @access  Private
 */
router.get('/:id', sourceConnectionController.getById);

/**
 * @route   POST /api/source-connections/test
 * @desc    Test a connection configuration
 * @access  Private (Owner, Editor only)
 */
router.post('/test', requireEditor(), sourceConnectionController.testConnection);

/**
 * @route   POST /api/source-connections
 * @desc    Create a new source connection
 * @access  Private (Owner, Editor only)
 */
router.post('/', requireEditor(), sourceConnectionController.create);

/**
 * @route   PATCH /api/source-connections/:id
 * @desc    Update a source connection
 * @access  Private (Owner, Editor only)
 */
router.patch('/:id', requireEditor(), sourceConnectionController.update);

/**
 * @route   DELETE /api/source-connections/:id
 * @desc    Delete a source connection (soft delete)
 * @access  Private (Owner, Editor only)
 */
router.delete('/:id', requireEditor(), sourceConnectionController.delete);

/**
 * @route   POST /api/source-connections/:id/health-check
 * @desc    Check connection health
 * @access  Private (Owner, Editor only)
 */
router.post('/:id/health-check', requireEditor(), sourceConnectionController.checkHealth);

/**
 * @route   PATCH /api/source-connections/:id/toggle
 * @desc    Enable/disable a source connection
 * @access  Private (Owner, Editor only)
 */
router.patch('/:id/toggle', requireEditor(), sourceConnectionController.toggleEnabled);

export default router;
