import { Router } from 'express';
import { fileSourceController } from '../controllers/fileSource.controller';
import {
  validate,
  createS3FileSourceSchema,
  testS3ConnectionSchema,
  updateFileSourceSchema,
} from '../middleware/validation';

const router = Router();

/**
 * @route   GET /api/file-sources
 * @desc    Get all file sources with pagination
 * @access  Private (TODO: Add auth middleware)
 */
router.get('/', fileSourceController.getAll);

/**
 * @route   GET /api/file-sources/:id
 * @desc    Get a single file source by ID
 * @access  Private
 */
router.get('/:id', fileSourceController.getById);

/**
 * @route   GET /api/file-sources/:id/statistics
 * @desc    Get statistics for a file source
 * @access  Private
 * @todo    Implement once InwardFileRepository is created
 */
// router.get('/:id/statistics', fileSourceController.getStatistics);

/**
 * @route   POST /api/file-sources/s3/test-connection
 * @desc    Test S3 connection before creating file source
 * @access  Private
 */
router.post(
  '/s3/test-connection',
  validate(testS3ConnectionSchema),
  fileSourceController.testS3Connection
);

/**
 * @route   POST /api/file-sources/s3
 * @desc    Create a new S3 file source
 * @access  Private
 */
router.post(
  '/s3',
  validate(createS3FileSourceSchema),
  fileSourceController.createS3
);

/**
 * @route   PATCH /api/file-sources/:id
 * @desc    Update a file source
 * @access  Private
 */
router.patch(
  '/:id',
  validate(updateFileSourceSchema),
  fileSourceController.update
);

/**
 * @route   PATCH /api/file-sources/:id/toggle
 * @desc    Enable/disable a file source
 * @access  Private
 */
router.patch('/:id/toggle', fileSourceController.toggleEnabled);

/**
 * @route   DELETE /api/file-sources/:id
 * @desc    Delete a file source
 * @access  Private
 */
router.delete('/:id', fileSourceController.delete);

export default router;
