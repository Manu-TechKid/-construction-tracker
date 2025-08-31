const express = require('express');
const workerController = require('../controllers/workerController');
const authController = require('../controllers/authController');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Validation middleware
const validateWorkerData = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  body('password')
    .if((value, { req }) => req.method === 'POST')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('paymentType').optional().isIn(['hourly', 'contract']).withMessage('Invalid payment type'),
  body('hourlyRate').optional().isNumeric().withMessage('Hourly rate must be a number'),
  body('contractRate').optional().isNumeric().withMessage('Contract rate must be a number'),
  body('notes').optional().trim()
];

// Apply validation to all routes that modify worker data
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      status: 'fail',
      errors: errors.array().map(err => err.msg)
    });
  }
  next();
};

// Routes for workers
router
  .route('/')
  .get(workerController.getAllWorkers)
  .post(
    authController.restrictTo('admin', 'manager'),
    validateWorkerData,
    validate,
    workerController.createWorker
  );

// Routes for specific worker
router
  .route('/:id')
  .get(workerController.getWorker)
  .patch(
    authController.restrictTo('admin', 'manager'),
    validateWorkerData,
    validate,
    workerController.updateWorker
  )
  .delete(
    authController.restrictTo('admin'),
    workerController.deleteWorker
  );

// Get work orders assigned to a worker
router
  .route('/:id/assignments')
  .get(workerController.getWorkerAssignments);

// Update worker's skills
router
  .route('/:id/skills')
  .patch(
    authController.restrictTo('admin', 'manager'),
    body('skills').isArray().withMessage('Skills must be an array'),
    validate,
    workerController.updateWorkerSkills
  );

// Update worker's status
router
  .route('/:id/status')
  .patch(
    authController.restrictTo('admin', 'manager'),
    body('status').isIn(['active', 'inactive', 'on_leave']).withMessage('Invalid status'),
    validate,
    workerController.updateWorkerStatus
  );

module.exports = router;
