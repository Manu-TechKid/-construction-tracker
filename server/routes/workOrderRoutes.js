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
  .post(
    authController.restrictTo('admin', 'manager', 'supervisor'),
    workOrderController.createWorkOrder
  );

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

// Add note to work order
router
  .route('/:id/notes')
  .post(workOrderController.addNote);

// Report issue with work order
router
  .route('/:id/issues')
  .post(workOrderController.reportIssue);

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
