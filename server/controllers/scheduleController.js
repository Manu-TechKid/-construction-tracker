const Schedule = require('../models/Schedule');
const Building = require('../models/Building');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendScheduleChangeEmail } = require('../services/emailService');

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

  // Send email notification to assigned workers
  if (schedule.assignedWorkers && schedule.assignedWorkers.length > 0) {
    try {
      await sendScheduleChangeEmail(schedule, schedule.assignedWorkers, 'created');
    } catch (emailError) {
      console.error('Failed to send schedule creation email:', emailError);
      // Don't fail the schedule creation if email fails
    }
  }

  res.status(201).json({
    status: 'success',
    data: {
      schedule
    }
  });
});

// Update schedule
exports.updateSchedule = catchAsync(async (req, res, next) => {
  // Get the original schedule to detect changes
  const originalSchedule = await Schedule.findById(req.params.id);
  if (!originalSchedule) {
    return next(new AppError('No schedule found with that ID', 404));
  }

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

  // Detect changes and send email notification
  const changes = {};
  if (originalSchedule.title !== schedule.title) {
    changes['Title'] = `${originalSchedule.title} → ${schedule.title}`;
  }
  if (originalSchedule.startDate.toString() !== schedule.startDate.toString()) {
    changes['Start Date'] = `${new Date(originalSchedule.startDate).toLocaleDateString()} → ${new Date(schedule.startDate).toLocaleDateString()}`;
  }
  if (originalSchedule.endDate.toString() !== schedule.endDate.toString()) {
    changes['End Date'] = `${new Date(originalSchedule.endDate).toLocaleDateString()} → ${new Date(schedule.endDate).toLocaleDateString()}`;
  }
  if (originalSchedule.status !== schedule.status) {
    changes['Status'] = `${originalSchedule.status} → ${schedule.status}`;
  }

  // Send email notification if there are changes and workers are assigned
  if (Object.keys(changes).length > 0 && schedule.assignedWorkers && schedule.assignedWorkers.length > 0) {
    try {
      await sendScheduleChangeEmail(schedule, schedule.assignedWorkers, 'updated', changes);
    } catch (emailError) {
      console.error('Failed to send schedule update email:', emailError);
      // Don't fail the schedule update if email fails
    }
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

// Get worker's schedule
exports.getWorkerSchedule = catchAsync(async (req, res, next) => {
  const { startDate, endDate, status } = req.query;
  const workerId = req.params.workerId || req.user.id;
  
  // Build query to find schedules where the worker is assigned
  const query = { assignedWorkers: workerId };
  
  if (startDate && endDate) {
    query.startDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  if (status) {
    query.status = status;
  }
  
  const schedules = await Schedule.find(query)
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
