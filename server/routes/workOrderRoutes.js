const express = require('express');
const { body, param, query } = require('express-validator');
const workOrderController = require('../controllers/workOrderController');
const authController = require('../controllers/authController');
const { hidePricesFromWorkers } = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');

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
  body('workType').isIn(['painting', 'cleaning', 'repairs', 'maintenance', 'inspection', 'other', 'plumbing', 'electrical', 'hvac', 'flooring', 'roofing', 'carpentry']),
  body('workSubType').trim(),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['pending', 'in_progress', 'on_hold', 'completed', 'cancelled']),
  body('estimatedCost').optional().isFloat({ min: 0 }),
  body('actualCost').optional().isFloat({ min: 0 }),
  body('scheduledDate').optional().isISO8601(),
  body('estimatedCompletionDate').optional().isISO8601(),
  body('requiresInspection').optional().isBoolean(),
  body('inspectionNotes').optional().trim(),
  body('assignedTo').optional().isArray(),
  body('assignedTo.*').optional().isMongoId(),
  body('photos').optional().isArray(),
  body('photos.*').optional().isString().trim(),
  body('notes').optional().isArray(),
  body('notes.*.content').optional().trim(),
  body('notes.*.isPrivate').optional().isBoolean(),
  validateRequest
];

// Route for getting form data (buildings, workers, etc.)
router.get(
  '/new',
  authController.restrictTo('admin', 'manager', 'supervisor'),
  workOrderController.getWorkOrderFormData
);

// Get all work orders with filtering and pagination
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['pending', 'in_progress', 'on_hold', 'completed', 'cancelled']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('building').optional().isMongoId(),
    query('assignedTo').optional().isMongoId(),
    query('search').optional().trim(),
    validateRequest
  ],
  workOrderController.getAllWorkOrders
);

// Create new work order
router.post(
  '/',
  authController.restrictTo('admin', 'manager', 'supervisor'),
  validateWorkOrder,
  workOrderController.createWorkOrder
);

// Get single work order
router.get(
  '/:id',
  [
    param('id').isMongoId(),
    validateRequest
  ],
  workOrderController.getWorkOrder
);

// Update work order
router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    ...validateWorkOrder.filter(middleware => middleware !== body('building').isMongoId()),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager', 'supervisor'),
  workOrderController.updateWorkOrder
);

// Delete work order
router.delete(
  '/:id',
  [
    param('id').isMongoId(),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager'),
  workOrderController.deleteWorkOrder
);

// Assign workers to work order
router.patch(
  '/:id/assign',
  [
    param('id').isMongoId(),
    body('workers').isArray().notEmpty(),
    body('workers.*').isMongoId(),
    body('scheduledDate').optional().isISO8601(),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager', 'supervisor'),
  workOrderController.assignWorkers
);

// Update work order status
router.patch(
  '/:id/status',
  [
    param('id').isMongoId(),
    body('status').isIn(['pending', 'in_progress', 'on_hold', 'completed', 'cancelled']),
    body('completedBy').optional().isMongoId(),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager', 'supervisor'),
  workOrderController.updateStatus
);

// Notes endpoints
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

router.delete(
  '/:id/notes/:noteId',
  [
    param('id').isMongoId(),
    param('noteId').isMongoId(),
    validateRequest
  ],
  workOrderController.deleteNoteFromWorkOrder
);

// Issues endpoint
router.post(
  '/:id/issues',
  [
    param('id').isMongoId(),
    body('description').trim().notEmpty(),
    validateRequest
  ],
  workOrderController.reportIssue
);

// Photos endpoints
router.post(
  '/:id/photos',
  [
    param('id').isMongoId(),
    body('url').isURL(),
    body('thumbnailUrl').optional().isURL(),
    body('publicId').optional().isString(),
    body('caption').optional().trim(),
    body('type').optional().isIn(['before', 'after', 'other']),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager', 'supervisor'),
  workOrderController.addPhotoToWorkOrder
);

router.delete(
  '/:id/photos/:photoId',
  [
    param('id').isMongoId(),
    param('photoId').isMongoId(),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager'),
  workOrderController.deletePhotoFromWorkOrder
);

// Task checklist endpoints
router.post(
  '/:id/tasks',
  [
    param('id').isMongoId(),
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager', 'supervisor'),
  workOrderController.addTaskToChecklist
);

router.patch(
  '/:id/tasks/:taskId',
  [
    param('id').isMongoId(),
    param('taskId').isMongoId(),
    body('completed').optional().isBoolean(),
    body('notes').optional().trim(),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager', 'supervisor'),
  workOrderController.updateTaskChecklist
);

// Get worker assignments for a work order
router.get(
  '/:id/assignments',
  [
    param('id').isMongoId(),
    validateRequest
  ],
  workOrderController.getWorkerAssignments
);

// Service endpoints
router.post(
  '/:id/services',
  [
    param('id').isMongoId(),
    body('type').isIn([
      'painting', 'cleaning', 'repair', 'plumbing', 
      'electrical', 'hvac', 'flooring', 'roofing', 'carpentry', 'other'
    ]),
    body('description').trim().notEmpty(),
    body('laborCost').optional().isFloat({ min: 0 }),
    body('materialCost').optional().isFloat({ min: 0 }),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager', 'supervisor'),
  workOrderController.addServiceToWorkOrder
);

router.patch(
  '/:id/services/:serviceId',
  [
    param('id').isMongoId(),
    param('serviceId').isMongoId(),
    body('type').optional().isIn([
      'painting', 'cleaning', 'repair', 'plumbing', 
      'electrical', 'hvac', 'flooring', 'roofing', 'carpentry', 'other'
    ]),
    body('description').optional().trim().notEmpty(),
    body('laborCost').optional().isFloat({ min: 0 }),
    body('materialCost').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager', 'supervisor'),
  workOrderController.updateServiceInWorkOrder
);

router.delete(
  '/:id/services/:serviceId',
  [
    param('id').isMongoId(),
    param('serviceId').isMongoId(),
    validateRequest
  ],
  authController.restrictTo('admin', 'manager'),
  workOrderController.deleteServiceFromWorkOrder
);

// Service notes endpoints
router.post(
  '/:id/services/:serviceId/notes',
  [
    param('id').isMongoId(),
    param('serviceId').isMongoId(),
    body('content').trim().notEmpty(),
    body('isPrivate').optional().isBoolean(),
    validateRequest
  ],
  workOrderController.addNoteToService
);

router.patch(
  '/:id/services/:serviceId/notes/:noteId',
  [
    param('id').isMongoId(),
    param('serviceId').isMongoId(),
    param('noteId').isMongoId(),
    body('content').trim().notEmpty(),
    body('isPrivate').optional().isBoolean(),
    validateRequest
  ],
  workOrderController.updateNoteInService
);

router.delete(
  '/:id/services/:serviceId/notes/:noteId',
  [
    param('id').isMongoId(),
    param('serviceId').isMongoId(),
    param('noteId').isMongoId(),
    validateRequest
  ],
  workOrderController.deleteNoteFromService
);

// Service status update
router.patch(
  '/:id/services/:serviceId/status',
  [
    param('id').isMongoId(),
    param('serviceId').isMongoId(),
    body('status').isIn(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']),
    body('notes').optional().trim(),
    validateRequest
  ],
  workOrderController.updateServiceStatus
);

module.exports = router;
