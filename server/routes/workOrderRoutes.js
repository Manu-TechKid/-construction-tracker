const express = require('express');
const workOrderController = require('../controllers/workOrderController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Routes for work orders
router
  .route('/')
  .get(workOrderController.getAllWorkOrders)
  .post(workOrderController.createWorkOrder);

// Routes for specific work order
router
  .route('/:id')
  .get(workOrderController.getWorkOrder)
  .patch(
    authController.restrictTo('admin', 'manager', 'supervisor'),
    workOrderController.updateWorkOrder
  )
  .delete(
    authController.restrictTo('admin', 'manager'),
    workOrderController.deleteWorkOrder
  );

router.patch('/:id/assign', authController.protect, workOrderController.assignWorkers);
router.patch('/:id/status', authController.protect, workOrderController.updateStatus);
router.post('/:id/issues', authController.protect, workOrderController.reportIssue);
router.post('/:id/notes', authController.protect, workOrderController.addNoteToWorkOrder);
router.patch('/:id/notes/:noteId', authController.protect, workOrderController.updateNoteInWorkOrder);
router.delete('/:id/notes/:noteId', authController.protect, workOrderController.deleteNoteFromWorkOrder);

// Assign workers to work order
router
  .route('/:id/assign')
  .post(
    authController.restrictTo('admin', 'manager', 'supervisor'),
    workOrderController.assignWorkers
  );

// Update work order status
router
  .route('/:id/status')
  .patch(
    authController.restrictTo('admin', 'manager', 'supervisor'),
    workOrderController.updateStatus
  );

module.exports = router;
