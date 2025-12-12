import { Router } from 'express';
import { watcherController } from '../controllers/watcher.controller';

const router = Router();

/**
 * @route   GET /api/watchers
 * @desc    Get all watchers with pagination
 * @access  Private
 */
router.get('/', watcherController.getAll);

/**
 * @route   GET /api/watchers/active
 * @desc    Get all active watchers
 * @access  Private
 */
router.get('/active', watcherController.getActive);

/**
 * @route   GET /api/watchers/by-connection/:connectionId
 * @desc    Get watchers by connection ID
 * @access  Private
 */
router.get('/by-connection/:connectionId', watcherController.getByConnection);

/**
 * @route   GET /api/watchers/by-department/:departmentCode
 * @desc    Get watchers by department code
 * @access  Private
 */
router.get('/by-department/:departmentCode', watcherController.getByDepartment);

/**
 * @route   GET /api/watchers/:id/files
 * @desc    List files from source for manual override
 * @access  Private
 */
router.get('/:id/files', watcherController.listFiles);

/**
 * @route   GET /api/watchers/:id
 * @desc    Get a single watcher by ID (with relations)
 * @access  Private
 */
router.get('/:id', watcherController.getById);

/**
 * @route   POST /api/watchers
 * @desc    Create a new watcher
 * @access  Private
 */
router.post('/', watcherController.create);

/**
 * @route   PATCH /api/watchers/:id
 * @desc    Update a watcher
 * @access  Private
 */
router.patch('/:id', watcherController.update);

/**
 * @route   DELETE /api/watchers/:id
 * @desc    Delete a watcher (soft delete)
 * @access  Private
 */
router.delete('/:id', watcherController.delete);

/**
 * @route   PATCH /api/watchers/:id/status
 * @desc    Update watcher status
 * @access  Private
 */
router.patch('/:id/status', watcherController.updateStatus);

export default router;
