import { Router } from 'express';
import { organizationController } from '../controllers/organization.controller';

const router = Router();

/**
 * @route   GET /api/organizations/:id
 * @desc    Get organization details
 * @access  Private
 */
router.get('/:id', organizationController.getOrganization);

/**
 * @route   PATCH /api/organizations/:id
 * @desc    Update organization
 * @access  Private (Owner)
 */
router.patch('/:id', organizationController.updateOrganization);

export default router;
