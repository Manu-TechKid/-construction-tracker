const Worker = require('../models/Worker');
const Schedule = require('../models/Schedule');
const { reverseGeocode } = require('../services/geocodingService');
const { getDeviceInfo } = require('../utils/deviceInfo');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Check in a worker
// @route   POST /api/workers/:id/check-in
// @access  Private
const checkInWorker = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { latitude, longitude, accuracy, notes, scheduleId, workOrderId } = req.body;

  // Validate location data
  if (!latitude || !longitude) {
    return next(new ErrorResponse('Please provide latitude and longitude', 400));
  }

  // Find worker and populate user data
  let worker = await Worker.findOne({ user: id })
    .populate('user', 'firstName lastName email phone')
    .populate('timeTracking.checkIn.scheduleId', 'title startTime endTime')
    .populate('timeTracking.checkIn.workOrderId', 'workType status');

  if (!worker) {
    return next(new ErrorResponse(`Worker not found with id of ${id}`, 404));
  }

  // Check if already checked in
  if (worker.timeTracking?.status === 'checked-in') {
    return next(new ErrorResponse('Worker is already checked in', 400));
  }

  // Verify schedule if provided
  if (scheduleId) {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return next(new ErrorResponse(`Schedule not found with id of ${scheduleId}`, 404));
    }
    
    // Check if the worker is assigned to this schedule
    if (schedule.worker.toString() !== id) {
      return next(new ErrorResponse('Not authorized to check in for this schedule', 403));
    }
  }

  // Get address from coordinates
  let address;
  try {
    const geoData = await reverseGeocode(latitude, longitude);
    address = geoData.formattedAddress;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // Continue without address if geocoding fails
  }

  // Check in the worker
  await worker.checkIn({
    longitude,
    latitude,
    accuracy,
    address,
    notes,
    scheduleId,
    workOrderId,
    deviceInfo: getDeviceInfo(req)
  });

  // Populate the updated fields
  worker = await Worker.findById(worker._id)
    .populate('user', 'firstName lastName email phone')
    .populate('timeTracking.checkIn.scheduleId', 'title startTime endTime')
    .populate('timeTracking.checkIn.workOrderId', 'workType status');

  res.status(200).json({
    success: true,
    data: worker,
    message: 'Successfully checked in'
  });
});

// @desc    Check out a worker
// @route   POST /api/workers/:id/check-out
// @access  Private
const checkOutWorker = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { latitude, longitude, accuracy, notes } = req.body;

  // Find worker and populate user data
  let worker = await Worker.findOne({ user: id })
    .populate('user', 'firstName lastName email phone')
    .populate('timeTracking.checkIn.scheduleId', 'title startTime endTime')
    .populate('timeTracking.checkIn.workOrderId', 'workType status');

  if (!worker) {
    return next(new ErrorResponse(`Worker not found with id of ${id}`, 404));
  }

  // Check if already checked out
  if (worker.timeTracking?.status !== 'checked-in') {
    return next(new ErrorResponse('Worker is not checked in', 400));
  }

  // Get address from coordinates if provided
  let address;
  if (latitude && longitude) {
    try {
      const geoData = await reverseGeocode(latitude, longitude);
      address = geoData.formattedAddress;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Continue without address if geocoding fails
    }
  }

  // Check out the worker
  await worker.checkOut({
    longitude,
    latitude,
    accuracy,
    address,
    notes,
    deviceInfo: getDeviceInfo(req)
  });

  // Populate the updated fields
  worker = await Worker.findById(worker._id)
    .populate('user', 'firstName lastName email phone')
    .populate('timeTracking.checkIn.scheduleId', 'title startTime endTime')
    .populate('timeTracking.checkIn.workOrderId', 'workType status');

  res.status(200).json({
    success: true,
    data: worker,
    message: 'Successfully checked out',
    duration: worker.timeTracking.duration
  });
});

// @desc    Record worker location
// @route   POST /api/workers/:id/location
// @access  Private
const recordLocation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { latitude, longitude, accuracy, activity, scheduleId, workOrderId } = req.body;

  // Validate location data
  if (!latitude || !longitude) {
    return next(new ErrorResponse('Please provide latitude and longitude', 400));
  }

  // Find worker
  const worker = await Worker.findOne({ user: id });
  if (!worker) {
    return next(new ErrorResponse(`Worker not found with id of ${id}`, 404));
  }

  // Update worker's location
  await worker.addLocation({
    longitude,
    latitude,
    accuracy,
    activity,
    scheduleId,
    workOrderId,
    deviceInfo: getDeviceInfo(req)
  });

  res.status(200).json({
    success: true,
    message: 'Location recorded successfully'
  });
});

// @desc    Get worker's location history
// @route   GET /api/workers/:id/location-history
// @access  Private
const getLocationHistory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { startDate, endDate, limit = 1000 } = req.query;

  // Build date filter
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  // Find worker and project only the needed fields
  const worker = await Worker.findOne(
    { user: id },
    { 
      'locationHistory': { 
        $filter: {
          input: '$locationHistory',
          as: 'location',
          cond: Object.keys(dateFilter).length > 0 
            ? { $and: [
                dateFilter.$gte ? { $gte: ['$$location.timestamp', dateFilter.$gte] } : {},
                dateFilter.$lte ? { $lte: ['$$location.timestamp', dateFilter.$lte] } : {}
              ]}
            : {}
        },
        $slice: parseInt(limit)
      },
      'user': 1
    }
  ).populate('user', 'firstName lastName');

  if (!worker) {
    return next(new ErrorResponse(`Worker not found with id of ${id}`, 404));
  }

  res.status(200).json({
    success: true,
    count: worker.locationHistory.length,
    data: worker.locationHistory
  });
});

// @desc    Get worker's current status
// @route   GET /api/workers/:id/status
// @access  Private
const getWorkerStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const worker = await Worker.findOne({ user: id })
    .populate('user', 'firstName lastName email phone')
    .populate('timeTracking.checkIn.scheduleId', 'title startTime endTime')
    .populate('timeTracking.checkIn.workOrderId', 'workType status')
    .select('timeTracking isOnline lastKnownLocation metadata');

  if (!worker) {
    return next(new ErrorResponse(`Worker not found with id of ${id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: {
      status: worker.timeTracking?.status || 'offline',
      isOnline: worker.isOnline,
      lastActive: worker.metadata.lastActive,
      currentLocation: worker.lastKnownLocation,
      currentSession: worker.timeTracking?.checkIn ? {
        startTime: worker.timeTracking.checkIn.timestamp,
        schedule: worker.timeTracking.checkIn.scheduleId,
        workOrder: worker.timeTracking.checkIn.workOrderId,
        duration: worker.timeTracking.duration,
        currentLocation: worker.lastKnownLocation
      } : null
    }
  });
});

module.exports = {
  checkInWorker,
  checkOutWorker,
  recordLocation,
  getLocationHistory,
  getWorkerStatus
};
