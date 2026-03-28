const express = require('express');
const router = express.Router();
const { getPayrollReport, getHoursControlReport, getDailyScheduleReport } = require('../controllers/reportsController');
const { protect, restrictTo } = require('../controllers/authController');

// All report routes are protected and restricted to admins and managers
router.use(protect, restrictTo('admin', 'manager'));

router.route('/payroll').get(getPayrollReport);
router.route('/hours-control').get(getHoursControlReport);
router.route('/daily-schedule').get(getDailyScheduleReport);

module.exports = router;
