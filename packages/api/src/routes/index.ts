import { Router } from 'express';
import authRoutes from './auth.routes';
import fileSourceRoutes from './fileSource.routes';
import sourceConnectionRoutes from './sourceConnection.routes';
import scheduleRoutes from './schedule.routes';
import watcherRoutes from './watcher.routes';
import refDataRoutes from './refData.routes';
import fileTrackingRoutes from './fileTracking.routes';
import dashboardRoutes from './dashboard.routes';
import usersRoutes from './users.routes';
import departmentsRoutes from './departments.routes';
import organizationsRoutes from './organizations.routes';
import adminRoutes from './admin.routes';
import auditRoutes from './audit.routes';
import { authenticate } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/auditLog.middleware';
import { userController } from '../controllers/user.controller';

const router = Router();

/**
 * Health check endpoint (public)
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

// Authentication routes (public)
router.use('/auth', authRoutes);

// Public user routes (invitation acceptance - no auth required)
router.post('/users/accept-invitation', userController.acceptInvitation);

// Protected routes - require authentication and audit logging
router.use('/file-sources', authenticate, auditLog(), fileSourceRoutes);
router.use('/source-connections', authenticate, auditLog(), sourceConnectionRoutes);
router.use('/schedules', authenticate, auditLog(), scheduleRoutes);
router.use('/watchers', authenticate, auditLog(), watcherRoutes);
router.use('/ref-data', authenticate, auditLog(), refDataRoutes);
router.use('/file-tracking', authenticate, auditLog(), fileTrackingRoutes);
router.use('/dashboard', authenticate, dashboardRoutes);

// User & Department Management (Phase 2)
router.use('/users', authenticate, auditLog(), usersRoutes);
router.use('/departments', authenticate, auditLog(), departmentsRoutes);
router.use('/organizations', authenticate, auditLog(), organizationsRoutes);
router.use('/admin', authenticate, auditLog(), adminRoutes);

// Security & Audit (Phase 5) - No audit logging on audit routes
router.use('/audit', authenticate, auditRoutes);

// TODO: Add more routes as we build them
// router.use('/watcher-logs', watcherLogRoutes);
// router.use('/notifications', notificationRoutes);

export default router;
