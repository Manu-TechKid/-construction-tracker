const CleaningJob = require('../models/CleaningJob');
const mongoose = require('mongoose');
const Building = require('../models/Building');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all cleaning jobs with filtering
exports.getAllCleaningJobs = catchAsync(async (req, res, next) => {
  const { building, buildingId, startDate, endDate, worker } = req.query;
  const filter = {};

  const normalizedBuilding = (building || buildingId);
  if (normalizedBuilding && normalizedBuilding !== 'all' && normalizedBuilding !== 'null' && normalizedBuilding !== 'undefined') {
    if (!mongoose.Types.ObjectId.isValid(normalizedBuilding)) {
      return next(new AppError('Invalid building id.', 400));
    }
    filter.building = normalizedBuilding;
  }

  if (worker && worker !== 'null' && worker !== 'undefined') filter.worker = worker;

  const dateRange = {};
  const startDateObj = (startDate && startDate !== 'null' && startDate !== 'undefined') ? new Date(startDate) : null;
  const endDateObj = (endDate && endDate !== 'null' && endDate !== 'undefined') ? new Date(endDate) : null;
  if (startDateObj instanceof Date && !Number.isNaN(startDateObj.getTime())) dateRange.$gte = startDateObj;
  if (endDateObj instanceof Date && !Number.isNaN(endDateObj.getTime())) dateRange.$lte = endDateObj;
  if (Object.keys(dateRange).length > 0) filter.serviceDate = dateRange;

  const rawCleaningJobs = await CleaningJob.find(filter)
    .sort({ serviceDate: -1, createdAt: -1 })
    .lean();

  const buildingIds = rawCleaningJobs
    .map(j => j.building)
    .map(v => (v === undefined || v === null ? null : String(v)))
    .filter(v => v && mongoose.Types.ObjectId.isValid(v));

  const buildings = buildingIds.length > 0
    ? await Building.find({ _id: { $in: buildingIds } }).select('name').lean()
    : [];
  const buildingById = new Map(buildings.map(b => [String(b._id), b]));

  const cleaningJobs = rawCleaningJobs.map((job) => {
    const buildingValue = job.building;
    const buildingIdStr = (buildingValue === undefined || buildingValue === null) ? null : String(buildingValue);

    if (buildingIdStr && mongoose.Types.ObjectId.isValid(buildingIdStr)) {
      const b = buildingById.get(buildingIdStr);
      return {
        ...job,
        building: b ? { _id: b._id, name: b.name } : { _id: buildingIdStr, name: '' },
      };
    }

    if (typeof buildingValue === 'string' && buildingValue.trim() !== '') {
      return {
        ...job,
        building: { name: buildingValue },
      };
    }

    return {
      ...job,
      building: null,
    };
  });

  res.status(200).json({
    status: 'success',
    results: cleaningJobs.length,
    data: { cleaningJobs },
  });
});

// Create a new cleaning job
exports.createCleaningJob = catchAsync(async (req, res, next) => {
  const payload = { ...req.body };
  if (payload.buildingId && !payload.building) payload.building = payload.buildingId;

  if (payload.building === 'all') payload.building = undefined;

  if (!payload.building) {
    return next(new AppError('Building is required.', 400));
  }

  if (payload.building && !mongoose.Types.ObjectId.isValid(payload.building)) {
    return next(new AppError('Invalid building id.', 400));
  }

  const newCleaningJob = await CleaningJob.create({ ...payload, createdBy: req.user.id });

  await newCleaningJob.populate({ path: 'building', select: 'name' });
  res.status(201).json({
    status: 'success',
    data: { cleaningJob: newCleaningJob },
  });
});

// Update a cleaning job
exports.updateCleaningJob = catchAsync(async (req, res, next) => {
  const payload = { ...req.body };
  if (payload.buildingId && !payload.building) payload.building = payload.buildingId;

  if (payload.building === 'all') payload.building = undefined;

  if (payload.building && !mongoose.Types.ObjectId.isValid(payload.building)) {
    return next(new AppError('Invalid building id.', 400));
  }

  const cleaningJob = await CleaningJob.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!cleaningJob) {
    return next(new AppError('No cleaning job found with that ID', 404));
  }

  await cleaningJob.populate({ path: 'building', select: 'name' });

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
