const CleaningJob = require('../models/CleaningJob');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all cleaning jobs with filtering
exports.getAllCleaningJobs = catchAsync(async (req, res, next) => {
  const { building, startDate, endDate, worker } = req.query;
  const filter = {};

  if (building) filter.building = building;
  if (worker) filter.worker = worker;
  if (startDate && endDate) {
    filter.serviceDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const cleaningJobs = await CleaningJob.find(filter).sort('-serviceDate');

  res.status(200).json({
    status: 'success',
    results: cleaningJobs.length,
    data: { cleaningJobs },
  });
});

// Create a new cleaning job
exports.createCleaningJob = catchAsync(async (req, res, next) => {
  const newCleaningJob = await CleaningJob.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json({
    status: 'success',
    data: { cleaningJob: newCleaningJob },
  });
});

// Update a cleaning job
exports.updateCleaningJob = catchAsync(async (req, res, next) => {
  const cleaningJob = await CleaningJob.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!cleaningJob) {
    return next(new AppError('No cleaning job found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { cleaningJob },
  });
});

// Delete a cleaning job
exports.deleteCleaningJob = catchAsync(async (req, res, next) => {
  const cleaningJob = await CleaningJob.findByIdAndDelete(req.params.id);

  if (!cleaningJob) {
    return next(new AppError('No cleaning job found with that ID', 404));
  }

  res.status(204).json({ status: 'success', data: null });
});
