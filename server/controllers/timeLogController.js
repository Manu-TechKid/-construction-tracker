const TimeLog = require('../models/TimeLog');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Helper to get the latest time log for a user
const getLatestLog = async (userId) => {
  return await TimeLog.findOne({ user: userId }).sort({ timestamp: -1 });
};

// @desc    Clock in for the authenticated user
// @route   POST /api/v1/timelogs/clock-in
// @access  Private
exports.clockIn = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const latestLog = await getLatestLog(userId);
  if (latestLog && latestLog.type === 'clock-in') {
    return next(new AppError('You are already clocked in.', 400));
  }

  const { location, workOrderId, notes, signature } = req.body;

  const timeLog = await TimeLog.create({
    user: userId,
    type: 'clock-in',
    location,
    workOrderId,
    notes,
    signature,
  });

  res.status(201).json({
    status: 'success',
    data: { timeLog },
  });
});

// @desc    Clock out for the authenticated user
// @route   POST /api/v1/timelogs/clock-out
// @access  Private
exports.clockOut = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const latestLog = await getLatestLog(userId);
  if (!latestLog || latestLog.type === 'clock-out') {
    return next(new AppError('You are not clocked in.', 400));
  }

  const { location, notes, signature } = req.body;

  const timeLog = await TimeLog.create({
    user: userId,
    type: 'clock-out',
    location,
    notes,
    signature,
  });

  res.status(201).json({
    status: 'success',
    data: { timeLog },
  });
});

// @desc    Get the latest clock-in/out status for the authenticated user
// @route   GET /api/v1/timelogs/status
// @access  Private
exports.getUserStatus = catchAsync(async (req, res, next) => {
  const latestLog = await getLatestLog(req.user._id);

  res.status(200).json({
    status: 'success',
    data: {
      status: latestLog ? latestLog.type : 'clock-out',
      latestLog,
    },
  });
});

// @desc    Get all time logs for the authenticated user
// @route   GET /api/v1/timelogs/my-logs
// @access  Private
exports.getMyTimeLogs = catchAsync(async (req, res, next) => {
  const timeLogs = await TimeLog.find({ user: req.user._id }).populate('user', 'name').sort({ timestamp: 1 });

  const pairedLogs = [];
  let clockInLog = null;

  for (const log of timeLogs) {
    if (log.type === 'clock-in') {
      if (clockInLog) {
        // Handle dangling clock-in
        pairedLogs.push({
          _id: clockInLog._id,
          user: clockInLog.user,
          clockIn: clockInLog.timestamp,
          clockOut: null,
          clockInSignature: clockInLog.signature,
          notes: clockInLog.notes,
          duration: null,
        });
      }
      clockInLog = log;
    } else if (log.type === 'clock-out' && clockInLog) {
      pairedLogs.push({
        _id: clockInLog._id,
        user: clockInLog.user,
        clockIn: clockInLog.timestamp,
        clockOut: log.timestamp,
        clockInSignature: clockInLog.signature,
        clockOutSignature: log.signature,
        notes: [clockInLog.notes, log.notes].filter(Boolean).join('; '),
        duration: (new Date(log.timestamp) - new Date(clockInLog.timestamp)) / 1000 / 60 / 60,
      });
      clockInLog = null;
    }
  }

  if (clockInLog) {
    // Handle last dangling clock-in
    pairedLogs.push({
      _id: clockInLog._id,
      user: clockInLog.user,
      clockIn: clockInLog.timestamp,
      clockOut: null,
      clockInSignature: clockInLog.signature,
      notes: clockInLog.notes,
      duration: null,
    });
  }

  // Sort the paired logs by clock-in time, descending
  pairedLogs.sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));

  res.status(200).json({
    status: 'success',
    results: pairedLogs.length,
    data: { timeLogs: pairedLogs },
  });
});

// @desc    Update a time log (for admins/managers)
// @route   PUT /api/v1/timelogs/:id
// @access  Admin, Manager
exports.updateTimeLog = catchAsync(async (req, res, next) => {
  const { timestamp, notes } = req.body;

  const log = await TimeLog.findById(req.params.id);

  if (!log) {
    return next(new AppError('No time log found with that ID', 404));
  }

  if (timestamp) {
    log.timestamp = timestamp;
  }
  if (notes) {
    log.notes = notes;
  }

  await log.save();

  res.status(200).json({
    status: 'success',
    data: {
      timeLog: log,
    },
  });
});

// @desc    Delete a time log (for admins/managers)
// @route   DELETE /api/v1/timelogs/:id
// @access  Admin, Manager
exports.deleteTimeLog = catchAsync(async (req, res, next) => {
  const clockInLog = await TimeLog.findById(req.params.id);

  if (!clockInLog) {
    return next(new AppError('No time log found with that ID', 404));
  }

  // If it's a clock-in log, find and delete the corresponding clock-out log
  if (clockInLog.type === 'clock-in') {
    const clockOutLog = await TimeLog.findOne({
      user: clockInLog.user,
      type: 'clock-out',
      timestamp: { $gt: clockInLog.timestamp },
    }).sort({ timestamp: 1 });

    if (clockOutLog) {
      await TimeLog.findByIdAndDelete(clockOutLog._id);
    }
  }

  // Delete the primary log (the one with the ID passed in)
  await TimeLog.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// @desc    Get all time logs (for admins/managers)
// @route   GET /api/v1/timelogs
// @access  Admin, Manager
exports.getAllTimeLogs = catchAsync(async (req, res, next) => {
  const timeLogs = await TimeLog.find().populate('user', 'name').sort({ user: 1, timestamp: 1 });

  const pairedLogs = [];
  const userLogs = {};

  timeLogs.forEach(log => {
    const userId = log.user._id.toString();
    if (!userLogs[userId]) {
      userLogs[userId] = [];
    }
    userLogs[userId].push(log);
  });

  for (const userId in userLogs) {
    const logs = userLogs[userId];
    let clockInLog = null;

    for (const log of logs) {
      if (log.type === 'clock-in') {
        if (clockInLog) {
          // Handle dangling clock-in
          pairedLogs.push({
            _id: clockInLog._id,
            user: clockInLog.user,
            clockIn: clockInLog.timestamp,
            clockOut: null,
            clockInSignature: clockInLog.signature,
            notes: clockInLog.notes,
            duration: null,
          });
        }
        clockInLog = log;
      } else if (log.type === 'clock-out' && clockInLog) {
        pairedLogs.push({
          _id: clockInLog._id,
          user: clockInLog.user,
          clockIn: clockInLog.timestamp,
          clockOut: log.timestamp,
          clockInSignature: clockInLog.signature,
          clockOutSignature: log.signature,
          notes: [clockInLog.notes, log.notes].filter(Boolean).join('; '),
          duration: (new Date(log.timestamp) - new Date(clockInLog.timestamp)) / 1000 / 60 / 60,
        });
        clockInLog = null;
      }
    }

    if (clockInLog) {
      // Handle last dangling clock-in
      pairedLogs.push({
        _id: clockInLog._id,
        user: clockInLog.user,
        clockIn: clockInLog.timestamp,
        clockOut: null,
        clockInSignature: clockInLog.signature,
        notes: clockInLog.notes,
        duration: null,
      });
    }
  }

  // Sort the paired logs by clock-in time, descending
  pairedLogs.sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));

  res.status(200).json({
    status: 'success',
    results: pairedLogs.length,
    data: { timeLogs: pairedLogs },
  });
});
