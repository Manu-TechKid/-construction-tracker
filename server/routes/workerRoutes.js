const express = require('express');
const workerController = require('../controllers/workerController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Routes for workers
router
  .route('/')
  .get(workerController.getAllWorkers)
  .post(workerController.createWorker);

// Routes for specific worker
router
  .route('/:id')
  .get(workerController.getWorker)
  .patch(
    authController.restrictTo('admin', 'manager'),
    workerController.updateWorker
  )
  .delete(
    authController.restrictTo('admin'),
    workerController.deleteWorker
  );

// Get work orders assigned to a worker
router
  .route('/:id/assignments')
  .get(workerController.getWorkerAssignments);

// Update worker's skills
router
  .route('/:id/skills')
  .patch(
    authController.restrictTo('admin', 'manager'),
    workerController.updateWorkerSkills
  );

// Update worker's status
router
  .route('/:id/status')
  .patch(
    authController.restrictTo('admin', 'manager'),
    workerController.updateWorkerStatus
  );

module.exports = router;
