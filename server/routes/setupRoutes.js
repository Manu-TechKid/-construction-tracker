const express = require('express');
const setupController = require('../controllers/setupController');
const authController = require('../controllers/authController');
const { restrictTo } = require('../middleware/roleMiddleware');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Work Types routes
router.route('/work-types')
  .get(setupController.getAllWorkTypes)
  .post(restrictTo('admin'), setupController.createWorkType);

router.route('/work-types/:id')
  .put(restrictTo('admin'), setupController.updateWorkType)
  .delete(restrictTo('admin'), setupController.deleteWorkType);

// Work Sub-Types routes
router.route('/work-subtypes')
  .get(setupController.getAllWorkSubTypes)
  .post(restrictTo('admin'), setupController.createWorkSubType);

router.route('/work-subtypes/:id')
  .put(restrictTo('admin'), setupController.updateWorkSubType)
  .delete(restrictTo('admin'), setupController.deleteWorkSubType);

// Dropdown Configurations routes
router.route('/dropdown-configs')
  .get(setupController.getAllDropdownConfigs)
  .post(restrictTo('admin'), setupController.createDropdownConfig);

router.route('/dropdown-configs/:id')
  .put(restrictTo('admin'), setupController.updateDropdownConfig);

// Get dropdown options by category
router.get('/dropdown-options/:category', setupController.getDropdownOptions);

module.exports = router;
