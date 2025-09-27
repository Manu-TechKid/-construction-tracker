const express = require('express');
const workerScheduleController = require('../controllers/workerScheduleController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Routes accessible to managers, admins, and workers
router.use(restrictToRoles('admin', 'manager', 'supervisor', 'worker'));

// Main CRUD routes
router
  .route('/')
  .get(workerScheduleController.getAllWorkerSchedules)
  .post(workerScheduleController.createWorkerSchedule);

router
  .route('/:id')
  .get(workerScheduleController.getWorkerSchedule)
  .patch(workerScheduleController.updateWorkerSchedule)
  .delete(workerScheduleController.deleteWorkerSchedule);

// Additional routes for filtering
router.get('/worker/:workerId', workerScheduleController.getWorkerSchedulesByWorker);
router.get('/building/:buildingId', workerScheduleController.getWorkerSchedulesByBuilding);

module.exports = router;
