const express = require('express');
const workLogController = require('../controllers/workLogController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Worker routes - accessible to all authenticated users
router.post('/', 
  workLogController.uploadWorkLogPhotos,
  workLogController.createWorkLog
);

router.get('/worker/:workerId?', workLogController.getWorkerWorkLogs);

router.patch('/:id',
  workLogController.uploadWorkLogPhotos,
  workLogController.updateWorkLog
);

router.delete('/:id', workLogController.deleteWorkLog);

// Admin/Manager only routes
router.use(restrictToRoles('admin', 'manager'));

router.get('/', workLogController.getAllWorkLogs);
router.get('/stats', workLogController.getWorkLogStats);
router.patch('/:id/feedback', workLogController.addAdminFeedback);

module.exports = router;
