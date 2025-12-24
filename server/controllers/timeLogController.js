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
  const timeLogs = await TimeLog.find({ user: req.user._id }).sort('-timestamp');

  res.status(200).json({
    status: 'success',
    results: timeLogs.length,
    data: { timeLogs },
  });
});

// @desc    Get all time logs (for admins/managers)
// @route   GET /api/v1/timelogs
// @access  Admin, Manager
// @desc    Delete a time log (for admins/managers)
// @route   DELETE /api/v1/timelogs/:id
// @access  Admin, Manager
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

exports.deleteTimeLog = catchAsync(async (req, res, next) => {
  const log = await TimeLog.findById(req.params.id);

  if (!log) {
    return next(new AppError('No time log found with that ID', 404));
  }

  await log.remove();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getAllTimeLogs = catchAsync(async (req, res, next) => {
  const timeLogs = await TimeLog.find().populate('user', 'name').sort('-timestamp');

  res.status(200).json({
    status: 'success',
    results: timeLogs.length,
    data: { timeLogs },
  });
});
