const express = require('express');
const setupController = require('../controllers/setupController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Work Types routes - GET is public, POST/PUT/DELETE require auth
router.get('/work-types', setupController.getAllWorkTypes);
router.post('/work-types', authController.protect, restrictToRoles('admin'), setupController.createWorkType);

router.put('/work-types/:id', authController.protect, restrictToRoles('admin'), setupController.updateWorkType);
router.delete('/work-types/:id', authController.protect, restrictToRoles('admin'), setupController.deleteWorkType);

// Work Sub-Types routes - GET is public, POST/PUT/DELETE require auth
router.get('/work-subtypes', setupController.getAllWorkSubTypes);
router.post('/work-subtypes', authController.protect, restrictToRoles('admin'), setupController.createWorkSubType);
router.put('/work-subtypes/:id', authController.protect, restrictToRoles('admin'), setupController.updateWorkSubType);
router.delete('/work-subtypes/:id', authController.protect, restrictToRoles('admin'), setupController.deleteWorkSubType);

// Dropdown Configurations routes - GET is public, POST/PUT/DELETE require auth
router.get('/dropdown-configs', setupController.getAllDropdownConfigs);
router.post('/dropdown-configs', authController.protect, restrictToRoles('admin'), setupController.createDropdownConfig);
router.put('/dropdown-configs/:id', authController.protect, restrictToRoles('admin'), setupController.updateDropdownConfig);
router.delete('/dropdown-configs/:id', authController.protect, restrictToRoles('admin'), setupController.deleteDropdownConfig);

// Get dropdown options by category - public access
router.get('/dropdown-options/:category', setupController.getDropdownOptions);

// Migration endpoints - temporarily public for initial setup
router.post('/run-migration', setupController.runSetupMigration);
router.get('/migration-status', setupController.getMigrationStatus);

module.exports = router;
