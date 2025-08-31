const Schedule = require('../models/Schedule');
const WorkOrder = require('../models/WorkOrder');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

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

// Create a new schedule item
exports.createScheduleItem = catchAsync(async (req, res, next) => {
  const { workOrder, worker, date, startTime, endTime, notes, location } = req.body;
  
  // 1) Check if work order exists and is active
  const workOrderDoc = await WorkOrder.findOne({ 
    _id: workOrder,
    isDeleted: { $ne: true } 
  });
  
  if (!workOrderDoc) {
    return next(new AppError('No work order found with that ID', 404));
  }
  
  // 2) Check for schedule conflicts
  const conflict = await Schedule.findOne({
    worker,
    date: new Date(date),
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  });
  
  if (conflict) {
    return next(new AppError('Worker is already scheduled during this time', 400));
  }
  
  // 3) Create schedule item
  const scheduleItem = await Schedule.create({
    workOrder,
    worker,
    date: new Date(date),
    startTime,
    endTime,
    notes,
    location: {
      type: 'Point',
      coordinates: [location.longitude, location.latitude],
      address: location.address
    },
    status: 'scheduled'
  });
  
  // 4) Populate the response
  await scheduleItem.populate('workOrder', 'title description priority');
  await scheduleItem.populate('worker', 'name email phone');
  
  res.status(201).json({
    status: 'success',
    data: {
      scheduleItem
    }
  });
});

// Get schedule items for a date range
exports.getSchedule = catchAsync(async (req, res, next) => {
  const { startDate, endDate, worker, status } = req.query;
  
  // 1) Build query
  const query = {};
  
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  if (worker) {
    query.worker = worker;
  }
  
  if (status) {
    query.status = status;
  }
  
  // 2) Execute query
  const schedule = await Schedule.find(query)
    .populate('workOrder', 'title description priority')
    .populate('worker', 'name email phone')
    .sort({ date: 1, startTime: 1 });
  
  res.status(200).json({
    status: 'success',
    results: schedule.length,
    data: {
      schedule
    }
  });
});

// Update a schedule item
exports.updateScheduleItem = catchAsync(async (req, res, next) => {
  const { date, startTime, endTime, notes, status } = req.body;
  
  // 1) Find schedule item
  const scheduleItem = await Schedule.findById(req.params.id);
  
  if (!scheduleItem) {
    return next(new AppError('No schedule item found with that ID', 404));
  }
  
  // 2) Check for schedule conflicts if time is being updated
  if (startTime || endTime) {
    const conflict = await Schedule.findOne({
      _id: { $ne: req.params.id },
      worker: scheduleItem.worker,
      date: date ? new Date(date) : scheduleItem.date,
      $or: [
        {
          startTime: { $lt: endTime || scheduleItem.endTime },
          endTime: { $gt: startTime || scheduleItem.startTime }
        }
      ]
    });
    
    if (conflict) {
      return next(new AppError('Worker is already scheduled during this time', 400));
    }
  }
  
  // 3) Update schedule item
  const updatedItem = await Schedule.findByIdAndUpdate(
    req.params.id,
    {
      date: date ? new Date(date) : scheduleItem.date,
      startTime: startTime || scheduleItem.startTime,
      endTime: endTime || scheduleItem.endTime,
      notes: notes !== undefined ? notes : scheduleItem.notes,
      status: status || scheduleItem.status
    },
    {
      new: true,
      runValidators: true
    }
  )
  .populate('workOrder', 'title description priority')
  .populate('worker', 'name email phone');
  
  res.status(200).json({
    status: 'success',
    data: {
      scheduleItem: updatedItem
    }
  });
});

// Delete a schedule item
exports.deleteScheduleItem = catchAsync(async (req, res, next) => {
  const scheduleItem = await Schedule.findByIdAndDelete(req.params.id);
  
  if (!scheduleItem) {
    return next(new AppError('No schedule item found with that ID', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Check in a worker for a schedule item
exports.checkInWorker = catchAsync(async (req, res, next) => {
  const { location, notes } = req.body;
  
  // 1) Find schedule item
  const scheduleItem = await Schedule.findById(req.params.id)
    .populate('workOrder', 'title description priority')
    .populate('worker', 'name email phone');
  
  if (!scheduleItem) {
    return next(new AppError('No schedule item found with that ID', 404));
  }
  
  // 2) Check if worker is authorized
  if (scheduleItem.worker._id.toString() !== req.user.id && 
      !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('You are not authorized to check in for this task', 403));
  }
  
  // 3) Perform check-in
  await scheduleItem.checkInWorker(location, notes);
  
  res.status(200).json({
    status: 'success',
    data: {
      scheduleItem
    }
  });
});

// Check out a worker from a schedule item
exports.checkOutWorker = catchAsync(async (req, res, next) => {
  const { location, notes } = req.body;
  
  // 1) Find schedule item
  const scheduleItem = await Schedule.findById(req.params.id)
    .populate('workOrder', 'title description priority')
    .populate('worker', 'name email phone');
  
  if (!scheduleItem) {
    return next(new AppError('No schedule item found with that ID', 404));
  }
  
  // 2) Check if worker is authorized
  if (scheduleItem.worker._id.toString() !== req.user.id && 
      !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('You are not authorized to check out for this task', 403));
  }
  
  // 3) Perform check-out
  await scheduleItem.checkOutWorker(location, notes);
  
  res.status(200).json({
    status: 'success',
    data: {
      scheduleItem
    }
  });
});

// Get worker's schedule
exports.getWorkerSchedule = catchAsync(async (req, res, next) => {
  const { startDate, endDate, status } = req.query;
  const workerId = req.params.workerId || req.user.id;
  
  // 1) Build query
  const query = { worker: workerId };
  
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  if (status) {
    query.status = status;
  }
  
  // 2) Execute query
  const schedule = await Schedule.find(query)
    .populate('workOrder', 'title description priority')
    .sort({ date: 1, startTime: 1 });
  
  res.status(200).json({
    status: 'success',
    results: schedule.length,
    data: {
      schedule
    }
  });
});

// Get work order schedule
exports.getWorkOrderSchedule = catchAsync(async (req, res, next) => {
  const schedule = await Schedule.find({ workOrder: req.params.workOrderId })
    .populate('worker', 'name email phone')
    .sort({ date: 1, startTime: 1 });
  
  res.status(200).json({
    status: 'success',
    results: schedule.length,
    data: {
      schedule
    }
  });
});

module.exports = {
  getAllSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getBuildingSchedules,
  createScheduleItem,
  getSchedule,
  updateScheduleItem,
  deleteScheduleItem,
  checkInWorker,
  checkOutWorker,
  getWorkerSchedule,
  getWorkOrderSchedule
};
