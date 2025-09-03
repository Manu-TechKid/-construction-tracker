const express = require('express');
const { body, param, query } = require('express-validator');
const workOrderController = require('../controllers/workOrderController');
const authController = require('../controllers/authController');
const { hidePricesFromWorkers } = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { uploadMultiple } = require('../utils/multer');

// Configure upload middleware for work orders
const uploadWorkOrderPhotos = uploadMultiple('work-orders', 'photos', 10);

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);
router.use(hidePricesFromWorkers);

// Validation middleware for creating work orders
const validateCreateWorkOrder = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    
  body('building')
    .optional()
    .isMongoId().withMessage('Invalid building ID format'),
    
  body('apartmentNumber')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Apartment number must be less than 20 characters'),
    
  body('block')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Block must be less than 20 characters'),
    
  body('apartmentStatus')
    .optional()
    .isIn(['vacant', 'occupied', 'under_renovation', 'reserved'])
    .withMessage('Invalid apartment status'),
    
  body('priority')
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
    
  body('status')
    .optional()
    .isIn([
      'pending', 'in_progress', 'on_hold', 'completed', 
      'cancelled', 'pending_review', 'issue_reported'
    ])
    .withMessage('Invalid status'),
    
  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid scheduled date format. Use ISO8601 format (e.g., YYYY-MM-DD)'),
    
  body('estimatedCompletionDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid completion date format. Use ISO8601 format (e.g., YYYY-MM-DD)'),
    
  body('assignedTo')
    .optional()
    .isArray()
    .withMessage('Assigned workers must be an array'),
    
  body('assignedTo.*')
    .isMongoId()
    .withMessage('Invalid worker ID format'),
    
  body('services')
    .isArray({ min: 1 })
    .withMessage('At least one service is required'),
    
  body('services.*.type')
    .notEmpty()
    .withMessage('Service type is required')
    .isString()
    .trim(),
    
  body('services.*.description')
    .notEmpty()
    .withMessage('Service description is required')
    .isString()
    .trim(),
    
  body('services.*.laborCost')
    .default(0)
    .isFloat({ min: 0 })
    .withMessage('Labor cost must be a positive number'),
    
  body('services.*.materialCost')
    .default(0)
    .isFloat({ min: 0 })
    .withMessage('Material cost must be a positive number'),
    
  body('services.*.estimatedHours')
    .default(1)
    .isFloat({ min: 0 })
    .withMessage('Estimated hours must be a positive number'),
    
  body('services.*.status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid service status'),
    
  body('photos')
    .optional()
    .isArray()
    .withMessage('Photos must be an array'),
    
  body('photos.*')
    .isString()
    .trim()
    .withMessage('Invalid photo URL format'),
    
  body('notes')
    .optional()
    .isArray()
    .withMessage('Notes must be an array'),
    
  body('notes.*.content')
    .if(body('notes').exists())
    .notEmpty()
    .withMessage('Note content is required')
    .isString()
    .trim(),
    
  body('notes.*.isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),
    
  validateRequest
];

// Validation for work order updates (more lenient than create)
const validateUpdateWorkOrder = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
    
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
    
  body('status')
    .optional()
    .isIn([
      'pending', 'in_progress', 'on_hold', 'completed', 
      'cancelled', 'pending_review', 'issue_reported'
    ])
    .withMessage('Invalid status'),
    
  body('services')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one service is required'),
    
  validateRequest
];

// Validation for work order tasks
const validateTask = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Task name is required')
    .isLength({ max: 100 })
    .withMessage('Task name must be less than 100 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
    
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format. Use ISO8601 format (e.g., YYYY-MM-DD)'),
    
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'blocked'])
    .withMessage('Invalid task status'),
    
  validateRequest
];

// Work Order Routes
// ================

// Create a new work order
router.post(
  '/',
  uploadWorkOrderPhotos,
  validateCreateWorkOrder,
  workOrderController.createWorkOrder
);

// Get all work orders with filtering and pagination
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

// Get a single work order by ID
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid work order ID'),
    validateRequest
  ],
  workOrderController.getWorkOrder
);

// Update a work order
router.patch(
  '/:id',
  [
    uploadWorkOrderPhotos,
    param('id').isMongoId().withMessage('Invalid work order ID'),
    ...validateUpdateWorkOrder
  ],
  workOrderController.updateWorkOrder
);

// Delete a work order
router.delete(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid work order ID'),
    validateRequest
  ],
  workOrderController.deleteWorkOrder
);

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
  uploadWorkOrderPhotos, // Max 10 photos
  [
    ...validateCreateWorkOrder,
    body('services').isArray({ min: 1 }),
    body('services.*.type').isIn([
      'cleaning', 'maintenance', 'inspection', 'renovation', 'delivery',
      'move_in', 'move_out', 'other'
    ]),
    validateRequest
  ],
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
  uploadMultiple('work-orders', 'photos', 10), // Max 10 photos
  [
    param('id').isMongoId(),
    ...validateCreateWorkOrder
  ],
  validateRequest,
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
// Configure upload middleware for work order issues
const uploadIssuePhotos = uploadMultiple('work-order-issues', 'photos', 5);

router.post(
  '/:id/issues',
  [param('id').isMongoId(), ...validateIssue],
  uploadIssuePhotos, // Max 5 photos for issues
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
