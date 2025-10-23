const WorkerSchedule = require('../models/WorkerSchedule');
const Building = require('../models/Building');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// @desc    Get all worker schedules
// @route   GET /api/v1/worker-schedules
// @access  Private
exports.getAllWorkerSchedules = catchAsync(async (req, res, next) => {
  const { workerId, buildingId, startDate, endDate, status } = req.query;
  
  let filter = {};
  
  if (workerId) filter.workerId = workerId;
  if (buildingId) filter.buildingId = buildingId;
  if (status) filter.status = status;
  
  // Date range filter
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  console.log('Getting schedules with filter:', filter);
  
  const schedules = await WorkerSchedule.find(filter)
    .populate('workerId', 'name email role')
    .populate('buildingId', 'name address')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ date: 1, startTime: 1 });
    
  console.log('Found schedules:', schedules.length);
  console.log('Sample schedule:', schedules[0]);

  res.status(200).json({
    status: 'success',
    results: schedules.length,
    data: {
      schedules
    }
  });
});

// @desc    Get single worker schedule
// @route   GET /api/v1/worker-schedules/:id
// @access  Private
exports.getWorkerSchedule = catchAsync(async (req, res, next) => {
  const schedule = await WorkerSchedule.findById(req.params.id)
    .populate('workerId', 'name email role')
    .populate('buildingId', 'name address')
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

// @desc    Create worker schedule
// @route   POST /api/v1/worker-schedules
// @access  Private
exports.createWorkerSchedule = catchAsync(async (req, res, next) => {
  try {
    console.log('=== CREATE WORKER SCHEDULE ===');
    console.log('Request body:', req.body);
    console.log('User making request:', req.user);
  
  const { workerId, buildingId, date, startTime, endTime, task, notes } = req.body;

  // Validate worker exists
  const worker = await User.findById(workerId);
  if (!worker) {
    return next(new AppError('Worker not found', 404));
  }
  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Worker found:', worker.firstName, worker.lastName, 'Role:', worker.role);
  }
  
  // Validate that the user is actually a worker (optional - can be relaxed for managers/admins)
  if (worker.role.toLowerCase() !== 'worker' && !['admin', 'manager', 'supervisor'].includes(req.user.role)) {
    return next(new AppError(`User role is '${worker.role}', not a worker`, 400));
  }

  // Validate building exists
  const building = await Building.findById(buildingId);
  if (!building) {
    return next(new AppError('Building not found', 404));
  }

  // Validate time order
  const startDateTime = new Date(startTime);
  const endDateTime = new Date(endTime);
  
  if (startDateTime >= endDateTime) {
    return next(new AppError('Start time must be before end time', 400));
  }

  // Validate dates are not in the past (optional - can be removed if past scheduling is allowed)
  const now = new Date();
  if (startDateTime < now) {
    console.warn('Schedule being created for past time:', startDateTime);
  }

  // Check for scheduling conflicts - only check for actual time overlaps
  const conflictingSchedule = await WorkerSchedule.findOne({
    workerId,
    date: {
      $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
      $lt: new Date(new Date(date).setHours(23, 59, 59, 999))
    },
    $and: [
      { startTime: { $lt: new Date(endTime) } },
      { endTime: { $gt: new Date(startTime) } }
    ]
  });

  if (conflictingSchedule) {
    console.log('Found conflicting schedule:', conflictingSchedule);
    // Allow override for admins/managers with a warning
    if (['admin', 'manager'].includes(req.user.role)) {
      console.log('Admin/Manager override: allowing conflicting schedule');
    } else {
      return next(new AppError(`Worker already has a conflicting schedule from ${conflictingSchedule.startTime} to ${conflictingSchedule.endTime}`, 400));
    }
  }

  console.log('Creating schedule with data:', {
    workerId,
    buildingId,
    date: new Date(date),
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    task,
    notes: notes || '',
    createdBy: req.user.id
  });

  const schedule = await WorkerSchedule.create({
    workerId,
    buildingId,
    date: new Date(date),
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    task,
    notes: notes || '',
    createdBy: req.user.id
  });

  console.log('Schedule created successfully:', schedule);

  // Populate the created schedule
  await schedule.populate('workerId', 'name email role');
  await schedule.populate('buildingId', 'name address');
  await schedule.populate('createdBy', 'name');

  console.log('Schedule populated:', schedule);

  res.status(201).json({
    status: 'success',
    data: {
      schedule
    }
  });
  
  } catch (error) {
    console.error('Error in createWorkerSchedule:', error);
    return next(error);
  }
});

// @desc    Update worker schedule
// @route   PATCH /api/v1/worker-schedules/:id
// @access  Private
exports.updateWorkerSchedule = catchAsync(async (req, res, next) => {
  const { workerId, buildingId, date, startTime, endTime, task, notes, status } = req.body;

  const schedule = await WorkerSchedule.findById(req.params.id);
  if (!schedule) {
    return next(new AppError('No schedule found with that ID', 404));
  }

  // Check if user can update this schedule
  if (schedule.createdBy.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('You can only update your own schedules', 403));
  }

  // If updating worker, validate they exist and are a worker
  if (workerId && workerId !== schedule.workerId.toString()) {
    const worker = await User.findById(workerId);
    if (!worker) {
      return next(new AppError('Worker not found', 404));
    }
    if (worker.role.toLowerCase() !== 'worker') {
      return next(new AppError(`User role is '${worker.role}', not a worker`, 400));
    }
  }

  // If updating building, validate it exists
  if (buildingId && buildingId !== schedule.buildingId.toString()) {
    const building = await Building.findById(buildingId);
    if (!building) {
      return next(new AppError('Building not found', 404));
    }
  }

  // Check for scheduling conflicts if time/date/worker is being changed
  if (workerId || date || startTime || endTime) {
    const checkWorkerId = workerId || schedule.workerId;
    const checkDate = date || schedule.date;
    const checkStartTime = startTime || schedule.startTime;
    const checkEndTime = endTime || schedule.endTime;

    const conflictingSchedule = await WorkerSchedule.findOne({
      _id: { $ne: req.params.id }, // Exclude current schedule
      workerId: checkWorkerId,
      date: {
        $gte: new Date(new Date(checkDate).setHours(0, 0, 0, 0)),
        $lt: new Date(new Date(checkDate).setHours(23, 59, 59, 999))
      },
      $or: [
        {
          startTime: { $lt: new Date(checkEndTime) },
          endTime: { $gt: new Date(checkStartTime) }
        }
      ]
    });

    if (conflictingSchedule) {
      return next(new AppError('Worker already has a conflicting schedule at this time', 400));
    }
  }

  // Update fields
  if (workerId) schedule.workerId = workerId;
  if (buildingId) schedule.buildingId = buildingId;
  if (date) schedule.date = new Date(date);
  if (startTime) schedule.startTime = new Date(startTime);
  if (endTime) schedule.endTime = new Date(endTime);
  if (task) schedule.task = task;
  if (notes !== undefined) schedule.notes = notes;
  if (status) schedule.status = status;
  
  schedule.updatedBy = req.user.id;

  await schedule.save();

  // Populate the updated schedule
  await schedule.populate('workerId', 'name email role');
  await schedule.populate('buildingId', 'name address');
  await schedule.populate('createdBy', 'name');
  await schedule.populate('updatedBy', 'name');

  res.status(200).json({
    status: 'success',
    data: {
      schedule
    }
  });
});

// @desc    Delete worker schedule
// @route   DELETE /api/v1/worker-schedules/:id
// @access  Private
exports.deleteWorkerSchedule = catchAsync(async (req, res, next) => {
  const schedule = await WorkerSchedule.findById(req.params.id);

  if (!schedule) {
    return next(new AppError('No schedule found with that ID', 404));
  }

  // Check if user can delete this schedule
  if (schedule.createdBy.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('You can only delete your own schedules', 403));
  }

  await WorkerSchedule.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Get worker schedules for a specific worker
// @route   GET /api/v1/worker-schedules/worker/:workerId
// @access  Private
exports.getWorkerSchedulesByWorker = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;
  const { startDate, endDate, status } = req.query;

  // Validate worker exists
  const worker = await User.findById(workerId);
  if (!worker) {
    return next(new AppError('Worker not found', 404));
  }

  let filter = { workerId };
  
  if (status) filter.status = status;
  
  // Date range filter
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const schedules = await WorkerSchedule.find(filter)
    .populate('buildingId', 'name address')
    .populate('createdBy', 'name')
    .sort({ date: 1, startTime: 1 });

  res.status(200).json({
    status: 'success',
    results: schedules.length,
    data: {
      schedules
    }
  });
});

// @desc    Get worker schedules for a specific building
// @route   GET /api/v1/worker-schedules/building/:buildingId
// @access  Private
exports.getWorkerSchedulesByBuilding = catchAsync(async (req, res, next) => {
  const { buildingId } = req.params;
  const { startDate, endDate, status } = req.query;

  // Validate building exists
  const building = await Building.findById(buildingId);
  if (!building) {
    return next(new AppError('Building not found', 404));
  }

  let filter = { buildingId };
  
  if (status) filter.status = status;
  
  // Date range filter
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const schedules = await WorkerSchedule.find(filter)
    .populate('workerId', 'name email role')
    .populate('createdBy', 'name')
    .sort({ date: 1, startTime: 1 });

  res.status(200).json({
    status: 'success',
    results: schedules.length,
    data: {
      schedules
    }
  });
});
