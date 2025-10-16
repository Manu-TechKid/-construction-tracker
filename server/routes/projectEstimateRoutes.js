const express = require('express');
const projectEstimateController = require('../controllers/projectEstimateController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Statistics
router.get('/stats', projectEstimateController.getProjectEstimateStats);

// Pending approvals (Admin/Manager only)
router.get('/pending-approvals', 
  restrictToRoles('admin', 'manager'),
  projectEstimateController.getPendingApprovals
);

// CRUD routes
router
  .route('/')
  .get(projectEstimateController.getAllProjectEstimates)
  .post(
    projectEstimateController.uploadProjectPhotos,
    projectEstimateController.createProjectEstimate
  );

router
  .route('/:id')
  .get(projectEstimateController.getProjectEstimate)
  .patch(
    projectEstimateController.uploadProjectPhotos,
    projectEstimateController.updateProjectEstimate
  )
  .delete(
    restrictToRoles('admin', 'manager'),
    projectEstimateController.deleteProjectEstimate
  );

// Admin/Manager only routes
router.use(restrictToRoles('admin', 'manager'));

// Approval management
router.patch('/:id/approve', projectEstimateController.approveProjectEstimate);

// Client interaction routes (no auth restriction needed for client access)
router.get('/:id/client-view', projectEstimateController.getClientView);
router.post('/:id/client-accept', projectEstimateController.clientAccept);
router.post('/:id/client-reject', projectEstimateController.clientReject);
router.patch('/:id/mark-viewed', projectEstimateController.markAsViewed);

// Enhanced estimate management
router.post('/:id/send-to-client', projectEstimateController.sendToClient);
router.post('/:id/line-items', projectEstimateController.addLineItem);
router.put('/:id/line-items/:lineItemId', projectEstimateController.updateLineItem);
router.delete('/:id/line-items/:lineItemId', projectEstimateController.removeLineItem);

// Convert to work order
router.post('/:id/convert', projectEstimateController.convertToWorkOrder);

// Convert to invoice
router.post('/:id/convert-to-invoice', projectEstimateController.convertToInvoice);

// Generate PDF
router.get('/:id/pdf', projectEstimateController.generatePDF);

module.exports = router;
