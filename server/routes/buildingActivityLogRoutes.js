const express = require('express');
const buildingActivityLogController = require('../controllers/buildingActivityLogController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router
  .route('/')
  .get(buildingActivityLogController.getAllActivityLogs)
  .post(
    authController.restrictTo('admin', 'manager', 'supervisor'),
    buildingActivityLogController.createActivityLog
  );

router
  .route('/stats')
  .get(buildingActivityLogController.getActivityStats);

router
  .route('/:id')
  .get(buildingActivityLogController.getActivityLog)
  .patch(
    authController.restrictTo('admin', 'manager', 'supervisor'),
    buildingActivityLogController.updateActivityLog
  )
  .delete(
    authController.restrictTo('admin', 'manager'),
    buildingActivityLogController.deleteActivityLog
  );

module.exports = router;
