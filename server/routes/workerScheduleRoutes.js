const express = require('express');
const workerScheduleController = require('../controllers/workerScheduleController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Temporarily allow all authenticated users for debugging
// router.use(restrictToRoles('admin', 'manager', 'supervisor', 'worker'));

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Worker schedules API is working',
    user: req.user ? {
      id: req.user.id,
      role: req.user.role,
      name: req.user.firstName + ' ' + req.user.lastName
    } : null
  });
});

// Simple test create endpoint
router.post('/test-create', async (req, res) => {
  try {
    console.log('=== TEST CREATE ENDPOINT ===');
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    const WorkerSchedule = require('../models/WorkerSchedule');
    
    const schedule = await WorkerSchedule.create({
      workerId: req.body.workerId,
      buildingId: req.body.buildingId,
      date: new Date(req.body.date),
      startTime: new Date(req.body.startTime),
      endTime: new Date(req.body.endTime),
      task: req.body.task || 'Test task',
      notes: req.body.notes || '',
      createdBy: req.user.id
    });
    
    console.log('Schedule created:', schedule);
    
    res.status(201).json({
      status: 'success',
      data: { schedule }
    });
  } catch (error) {
    console.error('Test create error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
});

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
