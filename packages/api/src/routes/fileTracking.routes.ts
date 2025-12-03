import { Router } from 'express';
import { fileTrackingController } from '../controllers/fileTracking.controller';

const router = Router();

/**
 * @route   GET /api/file-tracking/summary
 * @desc    Get SLA dashboard summary
 * @access  Private
 */
router.get('/summary', fileTrackingController.getSummary);

/**
 * @route   GET /api/file-tracking/alerts
 * @desc    Get missing file alerts
 * @access  Private
 */
router.get('/alerts', fileTrackingController.getAlerts);

/**
 * @route   GET /api/file-tracking/:id
 * @desc    Get a single file tracking record by ID
 * @access  Private
 */
router.get('/:id', fileTrackingController.getById);

/**
 * @route   GET /api/file-tracking
 * @desc    Get all file tracking records with filters and pagination
 * @access  Private
 */
router.get('/', fileTrackingController.getAll);

export default router;
