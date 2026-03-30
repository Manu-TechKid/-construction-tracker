const express = require('express');
const workerScheduleController = require('../controllers/workerScheduleController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const logActivity = require('../middleware/activityLogger');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Routes accessible to managers, admins, supervisors, and workers
router.use(restrictToRoles('admin', 'manager', 'supervisor', 'worker'));


// Main CRUD routes
router
  .route('/')
  .get(workerScheduleController.getAllWorkerSchedules)
  .post(logActivity('WorkerSchedule', 'create'), workerScheduleController.createWorkerSchedule);

router
  .route('/:id')
  .get(workerScheduleController.getWorkerSchedule)
  .patch(logActivity('WorkerSchedule', 'update'), workerScheduleController.updateWorkerSchedule)
  .delete(logActivity('WorkerSchedule', 'delete'), workerScheduleController.deleteWorkerSchedule);

// Additional routes for filtering
router.get('/worker/:workerId', workerScheduleController.getWorkerSchedulesByWorker);
router.get('/building/:buildingId', workerScheduleController.getWorkerSchedulesByBuilding);

module.exports = router;
