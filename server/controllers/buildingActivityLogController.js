const BuildingActivityLog = require('../models/BuildingActivityLog');
const Building = require('../models/Building');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all building activity logs
exports.getAllActivityLogs = catchAsync(async (req, res, next) => {
  const { building, activityType, status, startDate, endDate } = req.query;
  
  let filter = {};
  
  // Filter by building
  if (building) filter.building = building;
  
  // Filter by activity type
  if (activityType) filter.activityType = activityType;
  
  // Filter by status
  if (status) filter.status = status;
  
  // Filter by date range
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const activityLogs = await BuildingActivityLog.find(filter)
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .populate('assignedWorkers', 'name email')
    .sort({ date: -1, time: 1 });

  res.status(200).json({
    status: 'success',
    results: activityLogs.length,
    data: {
      activityLogs
    }
  });
});

// Get single activity log
exports.getActivityLog = catchAsync(async (req, res, next) => {
  const activityLog = await BuildingActivityLog.findById(req.params.id)
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .populate('assignedWorkers', 'name email');

  if (!activityLog) {
    return next(new AppError('No activity log found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      activityLog
    }
  });
});

// Create new activity log
exports.createActivityLog = catchAsync(async (req, res, next) => {
  const {
    building,
    activityType,
    customActivityName,
    date,
    time,
    duration,
    durationUnit,
    notes,
    status,
    assignedWorkers
  } = req.body;

  // Validate required fields
  if (!building || !activityType || !date) {
    return next(new AppError('Please provide building, activity type, and date', 400));
  }

  // Verify building exists
  const buildingExists = await Building.findById(building);
  if (!buildingExists) {
    return next(new AppError('Building not found', 404));
  }

  // Create activity log
  const newActivityLog = await BuildingActivityLog.create({
    building,
    activityType,
    customActivityName,
    date: new Date(date),
    time: time || '09:00',
    duration: duration || 1,
    durationUnit: durationUnit || 'hours',
    notes,
    status: status || 'scheduled',
    assignedWorkers: assignedWorkers || [],
    createdBy: req.user.id
  });

  // Populate the created log
  const populatedLog = await BuildingActivityLog.findById(newActivityLog._id)
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .populate('assignedWorkers', 'name email');

  res.status(201).json({
    status: 'success',
    data: {
      activityLog: populatedLog
    }
  });
});

// Update activity log
exports.updateActivityLog = catchAsync(async (req, res, next) => {
  const updateData = {
    updatedBy: req.user.id,
    ...req.body
  };

  // Handle date conversion
  if (updateData.date) {
    updateData.date = new Date(updateData.date);
  }

  // Handle completed status
  if (updateData.status === 'completed' && !updateData.completedAt) {
    updateData.completedAt = new Date();
  }

  const activityLog = await BuildingActivityLog.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  )
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .populate('assignedWorkers', 'name email');

  if (!activityLog) {
    return next(new AppError('No activity log found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      activityLog
    }
  });
});

// Delete activity log
exports.deleteActivityLog = catchAsync(async (req, res, next) => {
  const activityLog = await BuildingActivityLog.findByIdAndDelete(req.params.id);

  if (!activityLog) {
    return next(new AppError('No activity log found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get activity summary/stats
exports.getActivityStats = catchAsync(async (req, res, next) => {
  const { building, startDate, endDate } = req.query;
  
  let matchFilter = {};
  
  if (building) matchFilter.building = new mongoose.Types.ObjectId(building);
  if (startDate || endDate) {
    matchFilter.date = {};
    if (startDate) matchFilter.date.$gte = new Date(startDate);
    if (endDate) matchFilter.date.$lte = new Date(endDate);
  }

  const stats = await BuildingActivityLog.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$activityType',
        count: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});
