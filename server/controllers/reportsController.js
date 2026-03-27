const TimeSession = require('../models/TimeSession');
const User = require('../models/User');
const Building = require('../models/Building');
const asyncHandler = require('express-async-handler');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, format, parseISO } = require('date-fns');

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

// @desc    Get hours control report (daily/weekly timesheet)
// @route   GET /api/v1/reports/hours-control
// @access  Private/Admin/Manager
const getHoursControlReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, view } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Please provide a start and end date.' });
  }

  const start = startOfDay(new Date(startDate));
  const end = endOfDay(new Date(endDate));

  // Get all time sessions within the date range with populated references
  const timeSessions = await TimeSession.find({
    shiftStart: {
      $gte: start,
      $lte: end,
    },
    status: { $in: ['completed', 'approved'] },
  })
    .populate('worker', 'name firstName lastName')
    .populate('building', 'name address')
    .sort({ shiftStart: 1 });

  // Format data for daily timesheet view
  const dailyEntries = timeSessions.map(session => {
    const shiftStart = session.shiftStart || session.clockInTime;
    const shiftEnd = session.shiftEnd || session.clockOutTime;
    
    return {
      date: shiftStart ? format(new Date(shiftStart), 'yyyy-MM-dd') : null,
      dateFormatted: shiftStart ? format(new Date(shiftStart), 'MM/dd/yyyy') : null,
      workerName: session.worker ? 
        (session.worker.name || `${session.worker.firstName || ''} ${session.worker.lastName || ''}`.trim()) : 
        'Unknown',
      workerId: session.worker?._id?.toString(),
      client: session.building?.name || 'Unknown',
      buildingId: session.building?._id?.toString(),
      entranceHour: shiftStart ? format(new Date(shiftStart), 'hh:mm a') : null,
      leavingHour: shiftEnd ? format(new Date(shiftEnd), 'hh:mm a') : null,
      activity: session.workDescription || session.workType || 'General Work',
      hours: session.totalHours || 0,
      paidHours: session.totalPaidHours || 0,
      status: session.status,
      notes: session.notes || '',
    };
  });

  // Group by worker for weekly view
  const weeklyData = dailyEntries.reduce((acc, entry) => {
    if (!acc[entry.workerId]) {
      acc[entry.workerId] = {
        workerName: entry.workerName,
        workerId: entry.workerId,
        days: {},
        totalHours: 0,
      };
    }
    
    const dayOfWeek = entry.date ? format(parseISO(entry.date), 'EEEE') : 'Unknown';
    if (!acc[entry.workerId].days[dayOfWeek]) {
      acc[entry.workerId].days[dayOfWeek] = [];
    }
    
    acc[entry.workerId].days[dayOfWeek].push({
      date: entry.date,
      client: entry.client,
      activity: entry.activity,
      entranceHour: entry.entranceHour,
      leavingHour: entry.leavingHour,
      hours: entry.hours,
    });
    
    acc[entry.workerId].totalHours += entry.hours;
    
    return acc;
  }, {});

  const reportData = {
    daily: dailyEntries,
    weekly: Object.values(weeklyData),
    summary: {
      totalSessions: timeSessions.length,
      totalHours: dailyEntries.reduce((sum, entry) => sum + entry.hours, 0),
      dateRange: {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      },
    },
  };

  res.status(200).json({ data: reportData });
});

module.exports = { getPayrollReport, getHoursControlReport };
