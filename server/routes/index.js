const express = require('express');

// Import route files
const authRoutes = require('./authRoutes');
const buildingRoutes = require('./buildingRoutes');
const workOrderRoutes = require('./workOrderRoutes');
const userRoutes = require('./userRoutes');
const reminderRoutes = require('./reminderRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const noteRoutes = require('./noteRoutes');
const setupRoutes = require('./setupRoutes');
const workerScheduleRoutes = require('./workerScheduleRoutes');
const uploadRoutes = require('./uploadRoutes');
const photoRoutes = require('./photoRoutes');
const timeTrackingRoutes = require('./timeTrackingRoutes');
const searchRoutes = require('./searchRoutes');
const projectEstimateRoutes = require('./projectEstimateRoutes');
const migrationRoutes = require('./migrationRoutes');

// Import controllers for direct routes
const setupController = require('../controllers/setupController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/buildings', buildingRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/users', userRoutes);
router.use('/reminders', reminderRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/notes', noteRoutes);
router.use('/setup', setupRoutes);
router.use('/worker-schedules', workerScheduleRoutes);
router.use('/uploads', uploadRoutes);
router.use('/photos', photoRoutes);
router.use('/time-tracking', timeTrackingRoutes);
router.use('/search', searchRoutes);
router.use('/project-estimates', projectEstimateRoutes);
router.use('/migrations', migrationRoutes);

// Direct routes for compatibility (frontend expects these at root level)

// Work Types routes - direct access
router.get('/work-types', setupController.getAllWorkTypes);
router.post('/work-types', authController.protect, restrictToRoles('admin'), setupController.createWorkType);
router.put('/work-types/:id', authController.protect, restrictToRoles('admin'), setupController.updateWorkType);
router.delete('/work-types/:id', authController.protect, restrictToRoles('admin'), setupController.deleteWorkType);

// Work Sub-Types routes - direct access
router.get('/work-subtypes', setupController.getAllWorkSubTypes);
router.post('/work-subtypes', authController.protect, restrictToRoles('admin'), setupController.createWorkSubType);
router.put('/work-subtypes/:id', authController.protect, restrictToRoles('admin'), setupController.updateWorkSubType);
router.delete('/work-subtypes/:id', authController.protect, restrictToRoles('admin'), setupController.deleteWorkSubType);

// Dropdown routes - direct access
router.get('/dropdown-configs', setupController.getAllDropdownConfigs);
router.post('/dropdown-configs', authController.protect, restrictToRoles('admin'), setupController.createDropdownConfig);
router.put('/dropdown-configs/:id', authController.protect, restrictToRoles('admin'), setupController.updateDropdownConfig);
router.delete('/dropdown-configs/:id', authController.protect, restrictToRoles('admin'), setupController.deleteDropdownConfig);
router.get('/dropdown-options/:category', setupController.getDropdownOptions);

// Workers routes - direct access (workers are users with worker role)

router.get('/workers', userController.getAllWorkers);
router.get('/workers/available', userController.getAvailableWorkers);
router.post('/workers', authController.protect, authController.restrictTo('admin', 'manager'), userController.createWorker);
router.get('/workers/:id', userController.getUser);
router.patch('/workers/:id', authController.protect, authController.restrictTo('admin', 'manager'), userController.updateUser);
router.patch('/workers/:id/approval', authController.protect, authController.restrictTo('admin', 'manager'), userController.updateWorkerApproval);
router.patch('/workers/:id/skills', authController.protect, authController.restrictTo('admin', 'manager', 'supervisor'), userController.updateWorkerSkills);
router.patch('/workers/:id/status', authController.protect, authController.restrictTo('admin', 'manager'), userController.updateWorkerStatus);
router.get('/workers/:id/assignments', authController.protect, userController.getWorkerAssignments);
router.delete('/workers/:id', authController.protect, authController.restrictTo('admin', 'manager'), userController.deleteUser);

module.exports = router;
