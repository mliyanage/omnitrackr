import { Router } from 'express';
import { scheduleController } from '../controllers/schedule.controller';

const router = Router();

/**
 * @route   GET /api/schedules
 * @desc    Get all schedules with pagination
 * @access  Private
 */
router.get('/', scheduleController.getAll);

/**
 * @route   GET /api/schedules/active
 * @desc    Get all active schedules
 * @access  Private
 */
router.get('/active', scheduleController.getActive);

/**
 * @route   GET /api/schedules/:id
 * @desc    Get a single schedule by ID (with exclusions)
 * @access  Private
 */
router.get('/:id', scheduleController.getById);

/**
 * @route   POST /api/schedules
 * @desc    Create a new schedule
 * @access  Private
 */
router.post('/', scheduleController.create);

/**
 * @route   PATCH /api/schedules/:id
 * @desc    Update a schedule
 * @access  Private
 */
router.patch('/:id', scheduleController.update);

/**
 * @route   DELETE /api/schedules/:id
 * @desc    Delete a schedule (soft delete)
 * @access  Private
 */
router.delete('/:id', scheduleController.delete);

/**
 * @route   PATCH /api/schedules/:id/toggle
 * @desc    Enable/disable a schedule
 * @access  Private
 */
router.patch('/:id/toggle', scheduleController.toggleEnabled);

// Exclusion routes

/**
 * @route   GET /api/schedules/:id/exclusions
 * @desc    Get all exclusions for a schedule
 * @access  Private
 */
router.get('/:id/exclusions', scheduleController.getExclusions);

/**
 * @route   POST /api/schedules/:id/exclusions
 * @desc    Add an exclusion to a schedule
 * @access  Private
 */
router.post('/:id/exclusions', scheduleController.addExclusion);

/**
 * @route   DELETE /api/schedules/exclusions/:exclusionId
 * @desc    Delete an exclusion
 * @access  Private
 */
router.delete('/exclusions/:exclusionId', scheduleController.deleteExclusion);

export default router;
