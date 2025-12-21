const express = require('express');
const { clockIn, clockOut, getUserStatus, getMyTimeLogs, getAllTimeLogs } = require('../controllers/timeLogController');
const { protect, restrictTo } = require('../controllers/authController');

const router = express.Router();

// All routes below are protected
router.use(protect);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/status', getUserStatus);
router.get('/my-logs', getMyTimeLogs);

// Admin/Manager routes
router.use(restrictTo('admin', 'manager'));

router.get('/', getAllTimeLogs);

module.exports = router;
