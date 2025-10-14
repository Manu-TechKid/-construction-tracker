const express = require('express');
const timeTrackingController = require('../controllers/timeTrackingController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Clock in/out routes - accessible to all authenticated users
router.post('/clock-in', 
  timeTrackingController.uploadTimePhotos,
  timeTrackingController.clockIn
);

router.post('/clock-out',
  timeTrackingController.uploadTimePhotos,
  timeTrackingController.clockOut
);

// Worker status - accessible to all authenticated users
router.get('/status/:workerId', timeTrackingController.getWorkerStatus);

// Break management - accessible to all authenticated users
router.post('/break/start', timeTrackingController.startBreak);
router.post('/break/end', timeTrackingController.endBreak);

// Progress updates - accessible to all authenticated users
router.post('/sessions/:sessionId/progress',
  timeTrackingController.uploadTimePhotos,
  timeTrackingController.addProgressUpdate
);

// Time sessions - accessible to all authenticated users
router.get('/sessions', timeTrackingController.getTimeSessions);

// Statistics - accessible to all authenticated users
router.get('/stats', timeTrackingController.getTimeStats);

// Admin/Manager only routes
router.use(restrictToRoles('admin', 'manager'));

// Approval management
router.get('/pending-approvals', timeTrackingController.getPendingApprovals);
router.patch('/sessions/:sessionId/approve', timeTrackingController.approveTimeSession);
router.delete('/sessions/:sessionId', timeTrackingController.deleteTimeSession);

// Weekly hours tracking
router.get('/weekly-hours', timeTrackingController.getWeeklyHours);

module.exports = router;
