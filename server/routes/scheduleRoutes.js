const express = require('express');
const { body, param, query } = require('express-validator');
const scheduleController = require('../controllers/scheduleController');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Schedule item routes
router.post(
  '/',
  [
    authController.restrictTo('admin', 'manager', 'supervisor'),
    body('workOrder').isMongoId(),
    body('worker').isMongoId(),
    body('date').isISO8601(),
    body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('location').isObject(),
    body('location.longitude').isFloat({ min: -180, max: 180 }),
    body('location.latitude').isFloat({ min: -90, max: 90 }),
    body('location.address').optional().isString(),
    body('notes').optional().isString(),
    validateRequest
  ],
  scheduleController.createScheduleItem
);

router.get(
  '/',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('worker').optional().isMongoId(),
    query('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
    validateRequest
  ],
  scheduleController.getSchedule
);

router.patch(
  '/:id',
  [
    authController.restrictTo('admin', 'manager', 'supervisor'),
    param('id').isMongoId(),
    body('date').optional().isISO8601(),
    body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
    body('notes').optional().isString(),
    validateRequest
  ],
  scheduleController.updateScheduleItem
);

router.delete(
  '/:id',
  [
    authController.restrictTo('admin', 'manager'),
    param('id').isMongoId(),
    validateRequest
  ],
  scheduleController.deleteScheduleItem
);

// Worker check-in/check-out routes
router.post(
  '/:id/check-in',
  [
    param('id').isMongoId(),
    body('location').isObject(),
    body('location.longitude').isFloat({ min: -180, max: 180 }),
    body('location.latitude').isFloat({ min: -90, max: 90 }),
    body('location.address').optional().isString(),
    body('notes').optional().isString(),
    validateRequest
  ],
  scheduleController.checkInWorker
);

router.post(
  '/:id/check-out',
  [
    param('id').isMongoId(),
    body('location').isObject(),
    body('location.longitude').isFloat({ min: -180, max: 180 }),
    body('location.latitude').isFloat({ min: -90, max: 90 }),
    body('location.address').optional().isString(),
    body('notes').optional().isString(),
    validateRequest
  ],
  scheduleController.checkOutWorker
);

// Worker schedule routes
router.get(
  '/worker/:workerId?',
  [
    param('workerId').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
    validateRequest
  ],
  scheduleController.getWorkerSchedule
);

// Work order schedule routes
router.get(
  '/work-order/:workOrderId',
  [
    param('workOrderId').isMongoId(),
    validateRequest
  ],
  scheduleController.getWorkOrderSchedule
);

module.exports = router;
