import { Router } from 'express';
import { refDataController } from '../controllers/refData.controller';

const router = Router();

/**
 * @route   GET /api/ref-data
 * @desc    Get all reference data with pagination
 * @access  Private
 */
router.get('/', refDataController.getAll);

/**
 * @route   GET /api/ref-data/search
 * @desc    Search reference data
 * @access  Private
 */
router.get('/search', refDataController.search);

/**
 * @route   GET /api/ref-data/categories
 * @desc    Get all categories
 * @access  Private
 */
router.get('/categories', refDataController.getCategories);

/**
 * @route   GET /api/ref-data/timezones
 * @desc    Get all timezones
 * @access  Private
 */
router.get('/timezones', refDataController.getTimezones);

/**
 * @route   GET /api/ref-data/sla-thresholds
 * @desc    Get all SLA thresholds
 * @access  Private
 */
router.get('/sla-thresholds', refDataController.getSLAThresholds);

/**
 * @route   GET /api/ref-data/holidays/:calendarCode
 * @desc    Get holidays for a calendar
 * @access  Private
 */
router.get('/holidays/:calendarCode', refDataController.getHolidays);

/**
 * @route   GET /api/ref-data/prefix/:prefix
 * @desc    Get reference data by prefix
 * @access  Private
 */
router.get('/prefix/:prefix', refDataController.getByPrefix);

/**
 * @route   GET /api/ref-data/code/:code
 * @desc    Get reference data by code
 * @access  Private
 */
router.get('/code/:code', refDataController.getByCode);

/**
 * @route   POST /api/ref-data
 * @desc    Create new reference data
 * @access  Private
 */
router.post('/', refDataController.create);

/**
 * @route   PATCH /api/ref-data/code/:code
 * @desc    Update reference data by code
 * @access  Private
 */
router.patch('/code/:code', refDataController.update);

/**
 * @route   DELETE /api/ref-data/code/:code
 * @desc    Delete reference data by code
 * @access  Private
 */
router.delete('/code/:code', refDataController.delete);

export default router;
