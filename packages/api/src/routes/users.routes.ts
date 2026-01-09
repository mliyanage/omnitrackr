import { Router } from 'express';
import { userController } from '../controllers/user.controller';

const router = Router();

/**
 * @route   GET /api/users
 * @desc    List all users in organization (owner only)
 * @access  Private (Owner)
 */
router.get('/', userController.listUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', userController.getUser);

/**
 * @route   POST /api/users/invite
 * @desc    Invite a new user to organization
 * @access  Private (Owner)
 */
router.post('/invite', userController.inviteUser);

/**
 * @route   POST /api/users/accept-invitation
 * @desc    Accept invitation and create user account
 * @access  Public
 */
router.post('/accept-invitation', userController.acceptInvitation);

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user details
 * @access  Private (Owner or self)
 */
router.patch('/:id', userController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Deactivate user
 * @access  Private (Owner)
 */
router.delete('/:id', userController.deactivateUser);

/**
 * @route   POST /api/users/:id/departments
 * @desc    Assign user to departments
 * @access  Private (Owner)
 */
router.post('/:id/departments', userController.assignDepartments);

export default router;
