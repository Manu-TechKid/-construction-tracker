const Schedule = require('../models/Schedule');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all schedules
exports.getAllSchedules = catchAsync(async (req, res, next) => {
  const { building, status, startDate, endDate } = req.query;
  
  let filter = {};
  
  if (building) filter.building = building;
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.startDate = {};
    if (startDate) filter.startDate.$gte = new Date(startDate);
    if (endDate) filter.startDate.$lte = new Date(endDate);
  }

  const schedules = await Schedule.find(filter)
    .populate('building', 'name address')
    .populate('assignedWorkers', 'name email')
    .populate('createdBy', 'name')
    .sort({ startDate: 1 });

  res.status(200).json({
    status: 'success',
    results: schedules.length,
    data: {
      schedules
    }
  });
});

// Get single schedule
exports.getSchedule = catchAsync(async (req, res, next) => {
  const schedule = await Schedule.findById(req.params.id)
    .populate('building', 'name address')
    .populate('assignedWorkers', 'name email')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');

  if (!schedule) {
    return next(new AppError('No schedule found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      schedule
    }
  });
});

// Create schedule
exports.createSchedule = catchAsync(async (req, res, next) => {
  const scheduleData = {
    ...req.body,
    createdBy: req.user.id
  };

  const schedule = await Schedule.create(scheduleData);
  
  await schedule.populate([
    { path: 'building', select: 'name address' },
    { path: 'assignedWorkers', select: 'name email' },
    { path: 'createdBy', select: 'name' }
  ]);

  res.status(201).json({
    status: 'success',
    data: {
      schedule
    }
  });
});

// Update schedule
exports.updateSchedule = catchAsync(async (req, res, next) => {
  const updateData = {
    ...req.body,
    updatedBy: req.user.id
  };

  const schedule = await Schedule.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate([
    { path: 'building', select: 'name address' },
    { path: 'assignedWorkers', select: 'name email' },
    { path: 'createdBy', select: 'name' },
    { path: 'updatedBy', select: 'name' }
  ]);

  if (!schedule) {
    return next(new AppError('No schedule found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      schedule
    }
  });
});

// Delete schedule
exports.deleteSchedule = catchAsync(async (req, res, next) => {
  const schedule = await Schedule.findByIdAndDelete(req.params.id);

  if (!schedule) {
    return next(new AppError('No schedule found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get schedules for a specific building
exports.getBuildingSchedules = catchAsync(async (req, res, next) => {
  const { buildingId } = req.params;
  const { month, year } = req.query;

  let filter = { building: buildingId };

  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    filter.startDate = { $gte: startDate, $lte: endDate };
  }

  const schedules = await Schedule.find(filter)
    .populate('assignedWorkers', 'name email')
    .sort({ startDate: 1 });

  res.status(200).json({
    status: 'success',
    results: schedules.length,
    data: {
      schedules
    }
  });
});
