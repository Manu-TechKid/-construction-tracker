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

// Convert to work order
router.post('/:id/convert', projectEstimateController.convertToWorkOrder);

module.exports = router;
