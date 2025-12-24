const TimeSession = require('../models/TimeSession');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const { startOfDay, endOfDay } = require('date-fns');

// @desc    Get payroll report
// @route   GET /api/v1/reports/payroll
// @access  Private/Admin/Manager
const getPayrollReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Please provide a start and end date.' });
  }

  const start = startOfDay(new Date(startDate));
  const end = endOfDay(new Date(endDate));

  const timeSessions = await TimeSession.find({
    shiftStart: {
      $gte: start,
      $lte: end,
    },
    status: 'completed', // Or 'approved' depending on workflow
  }).populate('worker', 'name');

  const report = timeSessions.reduce((acc, session) => {
    if (!session.worker) return acc;

    const workerId = session.worker._id.toString();
    if (!acc[workerId]) {
      acc[workerId] = {
        workerName: session.worker.name,
        totalHours: 0,
        totalPay: 0,
      };
    }

    acc[workerId].totalHours += session.totalPaidHours || 0;
    acc[workerId].totalPay += session.calculatedPay || 0;

    return acc;
  }, {});

  const reportData = Object.values(report);

  res.status(200).json({ data: reportData });
});

module.exports = { getPayrollReport };
