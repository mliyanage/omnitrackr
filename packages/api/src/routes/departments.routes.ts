import { Router } from 'express';
import { departmentController } from '../controllers/department.controller';

const router = Router();

/**
 * @route   GET /api/departments
 * @desc    List departments (owner sees all, editor/viewer see assigned)
 * @access  Private
 */
router.get('/', departmentController.listDepartments);

/**
 * @route   GET /api/departments/:id
 * @desc    Get department by ID
 * @access  Private
 */
router.get('/:id', departmentController.getDepartment);

/**
 * @route   POST /api/departments
 * @desc    Create new department
 * @access  Private (Owner)
 */
router.post('/', departmentController.createDepartment);

/**
 * @route   PATCH /api/departments/:id
 * @desc    Update department
 * @access  Private (Owner)
 */
router.patch('/:id', departmentController.updateDepartment);

/**
 * @route   DELETE /api/departments/:id
 * @desc    Delete department
 * @access  Private (Owner)
 */
router.delete('/:id', departmentController.deleteDepartment);

export default router;
