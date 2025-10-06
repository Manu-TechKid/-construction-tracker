const express = require('express');
const { body, param, query } = require('express-validator');
const scheduleController = require('../controllers/scheduleController');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Get all schedules
router.get('/', scheduleController.getAllSchedules);

// Get building schedules
router.get('/building/:buildingId', scheduleController.getBuildingSchedules);

// Create schedule
router.post(
  '/',
  [
    authController.restrictTo('admin', 'manager', 'supervisor'),
    body('title').notEmpty().withMessage('Title is required'),
    body('building').isMongoId().withMessage('Valid building ID is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('type').optional().isIn(['painting', 'cleaning', 'repair', 'inspection', 'maintenance']),
    body('status').optional().isIn(['planned', 'in_progress', 'completed', 'cancelled']),
    body('assignedWorkers').optional().isArray(),
    body('assignedWorkers.*').optional().isMongoId(),
    validateRequest
  ],
  scheduleController.createSchedule
);

// Get single schedule
router.get('/:id', scheduleController.getSchedule);

// Update schedule
router.patch(
  '/:id',
  [
    authController.restrictTo('admin', 'manager', 'supervisor'),
    param('id').isMongoId(),
    body('title').optional().notEmpty(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('type').optional().isIn(['painting', 'cleaning', 'repair', 'inspection', 'maintenance']),
    body('status').optional().isIn(['planned', 'in_progress', 'completed', 'cancelled']),
    body('assignedWorkers').optional().isArray(),
    body('assignedWorkers.*').optional().isMongoId(),
    validateRequest
  ],
  scheduleController.updateSchedule
);

// Delete schedule
router.delete(
  '/:id',
  [
    authController.restrictTo('admin', 'manager'),
    param('id').isMongoId(),
    validateRequest
  ],
  scheduleController.deleteSchedule
);

module.exports = router;
