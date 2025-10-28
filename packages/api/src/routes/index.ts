import { Router } from 'express';
import fileSourceRoutes from './fileSource.routes';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OmniTrackr API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * API Routes
 */
router.use('/file-sources', fileSourceRoutes);

// TODO: Add more routes as we build them
// router.use('/inward-files', inwardFileRoutes);
// router.use('/notifications', notificationRoutes);

export default router;
