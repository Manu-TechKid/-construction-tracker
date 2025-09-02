const express = require('express');
const { body, param, query } = require('express-validator');
const workOrderController = require('../controllers/workOrderController');
const authController = require('../controllers/authController');
const { hidePricesFromWorkers } = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { uploadMultiple } = require('../utils/multer');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);
router.use(hidePricesFromWorkers);

// Validation middleware
const validateWorkOrder = [
  body('title').optional().trim().isLength({ min: 3, max: 100 }),
  body('description').trim().isLength({ min: 10 }),
  body('building').isMongoId(),
  body('apartmentNumber').optional().trim(),
  body('block').optional().trim(),
  body('apartmentStatus').optional().isIn(['vacant', 'occupied', 'under_renovation', 'reserved']),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn([
    'pending', 'in_progress', 'on_hold', 'completed', 
    'cancelled', 'pending_review', 'issue_reported'
  ]),
  body('scheduledDate').optional().isISO8601(),
  body('estimatedCompletionDate').optional().isISO8601(),
  body('assignedTo').optional().isArray(),
  body('assignedTo.*').optional().isMongoId(),
  body('services').optional().isArray(),
  body('services.*.type').optional().isString().trim(),
  body('services.*.description').optional().isString().trim(),
  body('services.*.laborCost').optional().isFloat({ min: 0 }),
  body('services.*.materialCost').optional().isFloat({ min: 0 }),
  body('services.*.status').optional().isString().trim(),
  body('photos').optional().isArray(),
  body('photos.*').optional().isString().trim(),
  body('notes').optional().isArray(),
  body('notes.*.content').optional().trim(),
  body('notes.*.isPrivate').optional().isBoolean(),
  validateRequest
];

const validateTask = [
  body('name').trim().notEmpty().withMessage('Task name is required'),
  body('description').optional().trim(),
  body('dueDate').optional().isISO8601(),
  validateRequest
];

const validateTaskUpdate = [
  body('completed').optional().isBoolean(),
  body('notes').optional().trim(),
  validateRequest
];

const validateIssue = [
  body('description').trim().notEmpty().withMessage('Issue description is required'),
  validateRequest
];

// ======================
// WORK ORDERS COLLECTION
// ======================

/**
 * @route   GET /api/v1/work-orders
 * @desc    Get all work orders with filtering, sorting, and pagination
 * @access  Private
 */
router.get(
  '/',
  [
    query('status').optional().isIn([
      'pending', 'in_progress', 'on_hold', 'completed', 
      'cancelled', 'pending_review', 'issue_reported'
    ]),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('building').optional().isMongoId(),
    query('assignedTo').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validateRequest
  ],
  workOrderController.getAllWorkOrders
);

/**
 * @route   GET /api/v1/work-orders/stats/:buildingId
 * @desc    Get work order statistics for a building
 * @access  Private
 */
router.get(
  '/stats/:buildingId',
  [
    param('buildingId').isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager', 'supervisor'),
  workOrderController.getWorkOrderStats
);

/**
 * @route   POST /api/v1/work-orders
 * @desc    Create a new work order
 * @access  Private (admin, manager, supervisor)
 */
router.post(
  '/',
  authController.restrictTo('admin', 'manager', 'supervisor'),
  upload.array('photos', 10), // Max 10 photos
  validateWorkOrder,
  workOrderController.createWorkOrder
);

// ======================
// SINGLE WORK ORDER
// ======================

/**
 * @route   GET /api/v1/work-orders/:id
 * @desc    Get a single work order by ID
 * @access  Private
 */
router.get(
  '/:id',
  [param('id').isMongoId(), validateRequest],
  workOrderController.getWorkOrder
);

/**
 * @route   PATCH /api/v1/work-orders/:id
 * @desc    Update a work order
 * @access  Private (admin, manager, supervisor, assigned worker)
 */
router.patch(
  '/:id',
  upload.array('photos', 10), // Max 10 photos
  [
    param('id').isMongoId(),
    ...validateWorkOrder
  ],
  workOrderController.updateWorkOrder
);

/**
 * @route   DELETE /api/v1/work-orders/:id
 * @desc    Delete a work order (soft delete)
 * @access  Private (admin, manager)
 */
router.delete(
  '/:id',
  [param('id').isMongoId(), validateRequest],
  authController.restrictTo('admin', 'manager'),
  workOrderController.deleteWorkOrder
);

// ======================
// TASKS
// ======================

/**
 * @route   POST /api/v1/work-orders/:id/tasks
 * @desc    Add a task to work order checklist
 * @access  Private (admin, manager, supervisor, assigned worker)
 */
router.post(
  '/:id/tasks',
  [param('id').isMongoId(), ...validateTask],
  authController.restrictTo('admin', 'manager', 'supervisor', 'worker'),
  workOrderController.addTaskToChecklist
);

/**
 * @route   PATCH /api/v1/work-orders/:id/tasks/:taskId
 * @desc    Update task status in checklist
 * @access  Private (admin, manager, supervisor, assigned worker)
 */
router.patch(
  '/:id/tasks/:taskId',
  [
    param('id').isMongoId(),
    param('taskId').isMongoId(),
    ...validateTaskUpdate
  ],
  workOrderController.updateTaskStatus
);

// ======================
// ISSUES
// ======================

/**
 * @route   POST /api/v1/work-orders/:id/issues
 * @desc    Report an issue with a work order
 * @access  Private (assigned worker, admin, manager, supervisor)
 */
router.post(
  '/:id/issues',
  [param('id').isMongoId(), ...validateIssue],
  upload.array('photos', 5), // Max 5 photos for issues
  workOrderController.reportIssue
);

// ======================
// ASSIGNMENTS
// ======================

/**
 * @route   GET /api/v1/work-orders/:id/assignments
 * @desc    Get worker assignments for a work order
 * @access  Private
 */
router.get(
  '/:id/assignments',
  [param('id').isMongoId(), validateRequest],
  workOrderController.getWorkerAssignments
);

/**
 * @route   PATCH /api/v1/work-orders/:id/assignments/:workerId
 * @desc    Update worker assignment status
 * @access  Private (admin, manager, supervisor, assigned worker)
 */
router.patch(
  '/:id/assignments/:workerId',
  [
    param('id').isMongoId(),
    param('workerId').isMongoId(),
    body('status').isIn(['pending', 'in_progress', 'completed', 'on_hold', 'rejected']),
    body('notes').optional().trim(),
    body('timeSpent.hours').optional().isInt({ min: 0 }),
    body('timeSpent.minutes').optional().isInt({ min: 0, max: 59 }),
    validateRequest
  ],
  workOrderController.updateAssignmentStatus
);

// ======================
// WORKER ASSIGNMENTS
// ======================

/**
 * @route   PATCH /api/v1/work-orders/:id/assign
 * @desc    Assign workers to a work order
 * @access  Private (admin, manager, supervisor)
 */
router.patch(
  '/:id/assign',
  [
    param('id').isMongoId(),
    body('workers').isArray().withMessage('Workers must be an array'),
    body('workers.*').isMongoId().withMessage('Invalid worker ID'),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager', 'supervisor'),
  workOrderController.assignWorkers
);

// ======================
// WORK ORDER FORM DATA
// ======================

/**
 * @route   GET /api/v1/work-orders/form-data
 * @desc    Get form data for work order creation/editing
 * @access  Private (admin, manager, supervisor)
 */
router.get(
  '/form-data',
  authController.restrictTo('admin', 'manager', 'supervisor'),
  workOrderController.getWorkOrderFormData
);

// ======================
// NOTES
// ======================

/**
 * @route   POST /api/v1/work-orders/:id/notes
 * @desc    Add a note to a work order
 * @access  Private (admin, manager, supervisor, assigned worker)
 */
router.post(
  '/:id/notes',
  [
    param('id').isMongoId(),
    body('content').trim().notEmpty(),
    body('isPrivate').optional().isBoolean(),
    validateRequest
  ],
  workOrderController.addNoteToWorkOrder
);

/**
 * @route   PATCH /api/v1/work-orders/:id/notes/:noteId
 * @desc    Update a note in a work order
 * @access  Private (admin, manager, supervisor, note author)
 */
router.patch(
  '/:id/notes/:noteId',
  [
    param('id').isMongoId(),
    param('noteId').isMongoId(),
    body('content').trim().notEmpty(),
    body('isPrivate').optional().isBoolean(),
    validateRequest
  ],
  workOrderController.updateNoteInWorkOrder
);

/**
 * @route   DELETE /api/v1/work-orders/:id/notes/:noteId
 * @desc    Delete a note from a work order
 * @access  Private (admin, manager, supervisor, note author)
 */
router.delete(
  '/:id/notes/:noteId',
  [
    param('id').isMongoId(),
    param('noteId').isMongoId(),
    validateRequest
  ],
  workOrderController.deleteNoteFromWorkOrder
);

// ======================
// EXPORT ROUTER
// ======================

module.exports = router;
