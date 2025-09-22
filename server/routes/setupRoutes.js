const express = require('express');
const setupController = require('../controllers/setupController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Work Types routes
router.route('/work-types')
  .get(setupController.getAllWorkTypes)
  .post(restrictToRoles('admin'), setupController.createWorkType);

router.route('/work-types/:id')
  .put(restrictToRoles('admin'), setupController.updateWorkType)
  .delete(restrictToRoles('admin'), setupController.deleteWorkType);

// Work Sub-Types routes
router.route('/work-subtypes')
  .get(setupController.getAllWorkSubTypes)
  .post(restrictToRoles('admin'), setupController.createWorkSubType);

router.route('/work-subtypes/:id')
  .put(restrictToRoles('admin'), setupController.updateWorkSubType)
  .delete(restrictToRoles('admin'), setupController.deleteWorkSubType);

// Dropdown Configurations routes
router.route('/dropdown-configs')
  .get(setupController.getAllDropdownConfigs)
  .post(restrictToRoles('admin'), setupController.createDropdownConfig);

router.route('/dropdown-configs/:id')
  .put(restrictToRoles('admin'), setupController.updateDropdownConfig);

// Get dropdown options by category
router.get('/dropdown-options/:category', setupController.getDropdownOptions);

module.exports = router;
