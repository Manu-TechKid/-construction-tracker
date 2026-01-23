const express = require('express');
const { clockIn, clockOut, getUserStatus, getMyTimeLogs, getAllTimeLogs, deleteTimeLog, updateTimeLog, updateMyTimeLog, deleteMyTimeLog } = require('../controllers/timeLogController');
const { protect, restrictTo } = require('../controllers/authController');

const router = express.Router();

// All routes below are protected
router.use(protect);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/status', getUserStatus);
router.get('/my-logs', getMyTimeLogs);

router.put('/my-logs/:id', updateMyTimeLog);
router.delete('/my-logs/:id', deleteMyTimeLog);

// Admin/Manager routes
router.use(restrictTo('admin', 'manager'));

router.get('/', getAllTimeLogs);
router.delete('/:id', deleteTimeLog);
router.put('/:id', updateTimeLog);

module.exports = router;
