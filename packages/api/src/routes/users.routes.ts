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
 * @route   POST /api/users/invite
 * @desc    Invite a new user to organization
 * @access  Private (Owner)
 */
router.post('/invite', userController.inviteUser);

/**
 * @route   GET /api/users/invitations
 * @desc    List pending invitations for organization
 * @access  Private (Owner)
 * IMPORTANT: Must be defined before /:id route to avoid matching "invitations" as an ID
 */
router.get('/invitations', userController.listInvitations);

/**
 * @route   POST /api/users/invitations/:id/resend
 * @desc    Resend invitation email
 * @access  Private (Owner)
 */
router.post('/invitations/:id/resend', userController.resendInvitation);

/**
 * @route   DELETE /api/users/invitations/:id
 * @desc    Delete/cancel invitation
 * @access  Private (Owner)
 */
router.delete('/invitations/:id', userController.deleteInvitation);

/**
 * @route   GET /api/users/invitation/:token
 * @desc    Get invitation details by token
 * @access  Public
 * NOTE: This route is defined in routes/index.ts as a public route (before auth middleware)
 */

/**
 * @route   POST /api/users/accept-invitation
 * @desc    Accept invitation and create user account
 * @access  Public
 * NOTE: This route is defined in routes/index.ts as a public route (before auth middleware)
 */

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 * IMPORTANT: Must be defined after specific routes like /invitations
 */
router.get('/:id', userController.getUser);

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
