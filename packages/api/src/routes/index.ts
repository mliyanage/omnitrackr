import { Router } from 'express';
import fileSourceRoutes from './fileSource.routes';
import sourceConnectionRoutes from './sourceConnection.routes';
import scheduleRoutes from './schedule.routes';
import watcherRoutes from './watcher.routes';
import refDataRoutes from './refData.routes';

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

// Legacy routes (will be deprecated)
router.use('/file-sources', fileSourceRoutes);

// New schema routes
router.use('/source-connections', sourceConnectionRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/watchers', watcherRoutes);
router.use('/ref-data', refDataRoutes);

// TODO: Add more routes as we build them
// router.use('/watcher-logs', watcherLogRoutes);
// router.use('/file-tracking', fileTrackingRoutes);
// router.use('/notifications', notificationRoutes);

export default router;
