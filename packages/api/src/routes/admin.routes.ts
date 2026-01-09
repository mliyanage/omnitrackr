import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';

const router = Router();

/**
 * @route   POST /api/admin/organizations
 * @desc    Create organization with owner (super admin only)
 * @access  Private (Super Admin)
 */
router.post('/organizations', adminController.createOrganization);

export default router;
