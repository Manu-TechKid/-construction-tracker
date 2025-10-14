const TimeSession = require('../models/TimeSession');
const User = require('../models/User');
const WorkOrder = require('../models/WorkOrder');
const Building = require('../models/Building');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const multer = require('multer');
const path = require('path');
const { validateLocation } = require('../utils/geofencing');

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/time-tracking/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'time-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed', 400), false);
    }
  }
});

// Middleware for photo upload
exports.uploadTimePhotos = upload.array('photos', 5);

// Clock in worker
exports.clockIn = catchAsync(async (req, res, next) => {
  const { workerId, workOrderId, buildingId, latitude, longitude, accuracy, notes } = req.body;

  console.log('Clock-in request:', { workerId, latitude, longitude, accuracy, notes });

  // Use authenticated user's ID if workerId not provided
  const actualWorkerId = workerId || req.user.id;

  // Validate required fields
  if (!actualWorkerId || !latitude || !longitude) {
    console.log('Missing required fields:', { actualWorkerId, latitude, longitude });
    return next(new AppError('Worker ID, latitude, and longitude are required', 400));
  }

  // Check if worker exists and has worker role (or is the authenticated user)
  const worker = await User.findById(actualWorkerId);
  if (!worker) {
    return next(new AppError('Worker not found', 400));
  }

  // Allow if user is clocking themselves in, or if they have worker role
  if (actualWorkerId !== req.user.id && worker.role !== 'worker') {
    return next(new AppError('Invalid worker ID', 400));
  }

  // Check if worker is already clocked in
  const activeSession = await TimeSession.findOne({
    worker: actualWorkerId,
    status: 'active'
  });

  if (activeSession) {
    return next(new AppError('Worker is already clocked in', 400));
  }

  // Geofencing validation - Check if worker is at the correct location
  let locationValidation = { valid: true, message: 'Location not validated' };
  
  if (buildingId) {
    const building = await Building.findById(buildingId);
    if (building && building.location && building.location.coordinates.latitude && building.location.coordinates.longitude) {
      const userLocation = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : 0
      };
      
      const targetLocation = {
        latitude: building.location.coordinates.latitude,
        longitude: building.location.coordinates.longitude
      };
      
      locationValidation = validateLocation(
        userLocation, 
        targetLocation, 
        building.location.geofenceRadius
      );
      
      if (!locationValidation.valid) {
        return next(new AppError(`Geofencing validation failed: ${locationValidation.message}`, 400));
      }
    }
  }

  // Process uploaded photos
  const photos = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      photos.push({
        url: `/uploads/time-tracking/${file.filename}`,
        type: 'clock-in',
        description: 'Clock-in photo'
      });
    });
  }

  // Create new time session
  const timeSession = await TimeSession.create({
    worker: actualWorkerId,
    workOrder: workOrderId || null,
    building: buildingId || null,
    clockInTime: new Date(),
    location: {
      clockIn: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        timestamp: new Date(),
        geofenceValidated: locationValidation.valid,
        geofenceMessage: locationValidation.message,
        geofenceDistance: locationValidation.distance
      }
    },
    photos,
    notes: notes || '',
    status: 'active'
  });

  // Populate worker details
  await timeSession.populate('worker', 'name email');
  if (workOrderId) {
    await timeSession.populate('workOrder', 'title description');
  }
  if (buildingId) {
    await timeSession.populate('building', 'name address');
  }

  res.status(201).json({
    status: 'success',
    message: 'Successfully clocked in',
    data: {
      timeSession
    }
  });
});

// Clock out worker
exports.clockOut = catchAsync(async (req, res, next) => {
  const { workerId, latitude, longitude, accuracy, notes } = req.body;

  console.log('Clock-out request:', { workerId, latitude, longitude, accuracy, notes });

  // Use authenticated user's ID if workerId not provided
  const actualWorkerId = workerId || req.user.id;

  // Validate required fields
  if (!actualWorkerId || !latitude || !longitude) {
    console.log('Missing required fields:', { actualWorkerId, latitude, longitude });
    return next(new AppError('Worker ID, latitude, and longitude are required', 400));
  }

  // Find active session
  const activeSession = await TimeSession.findOne({
    worker: actualWorkerId,
    status: 'active'
  });

  if (!activeSession) {
    return next(new AppError('No active session found. Please clock in first.', 400));
  }

  // Process uploaded photos
  const photos = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      photos.push({
        url: `/uploads/time-tracking/${file.filename}`,
        type: 'clock-out',
        description: 'Clock-out photo'
      });
    });
  }

  // Geofencing validation - Check if worker is at the correct location
  let locationValidation = { valid: true, message: 'Location not validated' };
  
  if (activeSession.building) {
    const building = await Building.findById(activeSession.building);
    if (building && building.location && building.location.coordinates.latitude && building.location.coordinates.longitude) {
      const userLocation = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : 0
      };
      
      const targetLocation = {
        latitude: building.location.coordinates.latitude,
        longitude: building.location.coordinates.longitude
      };
      
      locationValidation = validateLocation(
        userLocation, 
        targetLocation, 
        building.location.geofenceRadius
      );
      
      // We log but don't prevent clock-out if outside geofence
      console.log('Geofence validation result:', locationValidation);
    }
  }

  // Update session with clock out information
  activeSession.clockOutTime = new Date();
  activeSession.location.clockOut = {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    accuracy: accuracy ? parseFloat(accuracy) : null,
    timestamp: new Date(),
    geofenceValidated: locationValidation.valid,
    geofenceMessage: locationValidation.message,
    geofenceDistance: locationValidation.distance
  };
  activeSession.status = 'completed';
  activeSession.photos.push(...photos);
  if (notes) {
    activeSession.notes = activeSession.notes ? `${activeSession.notes}\n\nClock-out notes: ${notes}` : notes;
  }

  await activeSession.save();

  // Populate worker details
  await activeSession.populate('worker', 'name email');
  if (activeSession.workOrder) {
    await activeSession.populate('workOrder', 'title description');
  }
  if (activeSession.building) {
    await activeSession.populate('building', 'name address');
  }

  res.status(200).json({
    status: 'success',
    message: 'Successfully clocked out',
    data: {
      timeSession: activeSession
    }
  });
});

// Get worker status
exports.getWorkerStatus = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;
  
  // Use authenticated user's ID if workerId not provided or if accessing own status
  const actualWorkerId = workerId || req.user.id;
  
  // Find active session for the worker
  const activeSession = await TimeSession.findOne({
    worker: actualWorkerId,
    status: 'active'
  }).populate([
    { path: 'worker', select: 'name email' },
    { path: 'workOrder', select: 'title description' },
    { path: 'building', select: 'name address' }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      activeSession,
      isActive: !!activeSession
    }
  });
});

// Start break
exports.startBreak = catchAsync(async (req, res, next) => {
  const { workerId, reason, latitude, longitude } = req.body;
  const actualWorkerId = workerId || req.user.id;

  // Find active session
  const activeSession = await TimeSession.findOne({
    worker: actualWorkerId,
    status: 'active'
  });

  if (!activeSession) {
    return next(new AppError('No active session found', 400));
  }

  // Check if already on break
  const activeBreak = activeSession.breaks.find(b => !b.endTime);
  if (activeBreak) {
    return next(new AppError('Already on break', 400));
  }

  // Add new break
  activeSession.breaks.push({
    startTime: new Date(),
    reason: reason || 'Break',
    location: latitude && longitude ? { latitude, longitude } : undefined
  });

  await activeSession.save();

  res.status(200).json({
    status: 'success',
    message: 'Break started',
    data: { activeSession }
  });
});

// End break
exports.endBreak = catchAsync(async (req, res, next) => {
  const { workerId } = req.body;
  const actualWorkerId = workerId || req.user.id;

  // Find active session
  const activeSession = await TimeSession.findOne({
    worker: actualWorkerId,
    status: 'active'
  });

  if (!activeSession) {
    return next(new AppError('No active session found', 400));
  }

  // Find active break
  const activeBreak = activeSession.breaks.find(b => !b.endTime);
  if (!activeBreak) {
    return next(new AppError('No active break found', 400));
  }

  // End the break
  activeBreak.endTime = new Date();
  activeBreak.duration = Math.round((activeBreak.endTime - activeBreak.startTime) / (1000 * 60)); // minutes

  // Update total break time
  activeSession.breakTime = activeSession.breaks.reduce((total, b) => total + (b.duration || 0), 0);

  await activeSession.save();

  res.status(200).json({
    status: 'success',
    message: 'Break ended',
    data: { activeSession }
  });
});

// Add progress update
exports.addProgressUpdate = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  const { progress, notes } = req.body;

  const session = await TimeSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404));
  }

  // Process uploaded photos
  const photos = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      photos.push(`/uploads/time-tracking/${file.filename}`);
    });
  }

  // Add progress update
  session.progressUpdates.push({
    progress: progress || 0,
    notes: notes || '',
    photos
  });

  await session.save();

  res.status(200).json({
    status: 'success',
    message: 'Progress updated',
    data: { session }
  });
});

// Get time sessions
exports.getTimeSessions = catchAsync(async (req, res, next) => {
  const { workerId, buildingId, startDate, endDate, status } = req.query;

  const filter = {};
  if (workerId) filter.worker = workerId;
  if (buildingId) filter.building = buildingId;
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.clockInTime = {};
    if (startDate) filter.clockInTime.$gte = new Date(startDate);
    if (endDate) filter.clockInTime.$lte = new Date(endDate);
  }

  const sessions = await TimeSession.find(filter)
    .populate('worker', 'name email')
    .populate('workOrder', 'title description')
    .populate('building', 'name address')
    .sort('-clockInTime');

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    data: { sessions }
  });
});

// Get pending approvals
exports.getPendingApprovals = catchAsync(async (req, res, next) => {
  const sessions = await TimeSession.find({ isApproved: false, status: 'completed' })
    .populate('worker', 'name email')
    .populate('workOrder', 'title description')
    .populate('building', 'name address')
    .sort('-clockOutTime');

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    data: { sessions }
  });
});

// Approve time session
exports.approveTimeSession = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  const { approved, rejectionReason } = req.body;

  const session = await TimeSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404));
  }

  session.isApproved = approved;
  session.approvedBy = req.user.id;
  session.approvedAt = new Date();
  if (!approved && rejectionReason) {
    session.rejectionReason = rejectionReason;
  }

  await session.save();

  res.status(200).json({
    status: 'success',
    message: approved ? 'Session approved' : 'Session rejected',
    data: { session }
  });
});

// Get time statistics
exports.getTimeStats = catchAsync(async (req, res, next) => {
  const { workerId, buildingId, startDate, endDate } = req.query;

  const filter = { status: 'completed' };
  if (workerId) filter.worker = workerId;
  if (buildingId) filter.building = buildingId;
  if (startDate || endDate) {
    filter.clockInTime = {};
    if (startDate) filter.clockInTime.$gte = new Date(startDate);
    if (endDate) filter.clockInTime.$lte = new Date(endDate);
  }

  const sessions = await TimeSession.find(filter);
  
  const stats = {
    totalSessions: sessions.length,
    totalHours: sessions.reduce((sum, s) => sum + (s.totalHours || 0), 0),
    totalBreakTime: sessions.reduce((sum, s) => sum + (s.breakTime || 0), 0),
    averageHours: sessions.length > 0 ? sessions.reduce((sum, s) => sum + (s.totalHours || 0), 0) / sessions.length : 0
  };

  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

// Delete time session
exports.deleteTimeSession = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;

  const session = await TimeSession.findByIdAndDelete(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Get weekly hours for workers
// @route   GET /api/v1/time-tracking/weekly-hours
// @access  Private (Admin/Manager)
exports.getWeeklyHours = catchAsync(async (req, res, next) => {
  const { startDate, endDate, workerId } = req.query;
  
  // Default to current week if no dates provided
  const now = new Date();
  const weekStart = startDate ? new Date(startDate) : new Date(now.setDate(now.getDate() - now.getDay()));
  const weekEnd = endDate ? new Date(endDate) : new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  
  // Set time to start and end of day
  weekStart.setHours(0, 0, 0, 0);
  weekEnd.setHours(23, 59, 59, 999);

  let matchQuery = {
    clockIn: { $gte: weekStart, $lte: weekEnd },
    clockOut: { $exists: true, $ne: null }
  };

  if (workerId) {
    matchQuery.worker = workerId;
  }

  const weeklyHours = await TimeSession.aggregate([
    { $match: matchQuery },
    {
      $addFields: {
        hoursWorked: {
          $divide: [
            { $subtract: ['$clockOut', '$clockIn'] },
            1000 * 60 * 60 // Convert milliseconds to hours
          ]
        },
        dayOfWeek: { $dayOfWeek: '$clockIn' },
        dateString: { $dateToString: { format: '%Y-%m-%d', date: '$clockIn' } }
      }
    },
    {
      $group: {
        _id: {
          worker: '$worker',
          date: '$dateString'
        },
        dailyHours: { $sum: '$hoursWorked' },
        sessions: { $push: {
          clockIn: '$clockIn',
          clockOut: '$clockOut',
          hoursWorked: '$hoursWorked',
          workOrder: '$workOrder',
          building: '$building'
        }}
      }
    },
    {
      $group: {
        _id: '$_id.worker',
        totalWeeklyHours: { $sum: '$dailyHours' },
        dailyBreakdown: { $push: {
          date: '$_id.date',
          hours: '$dailyHours',
          sessions: '$sessions'
        }}
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'workerInfo'
      }
    },
    {
      $unwind: '$workerInfo'
    },
    {
      $project: {
        worker: {
          _id: '$workerInfo._id',
          name: '$workerInfo.name',
          email: '$workerInfo.email'
        },
        totalWeeklyHours: { $round: ['$totalWeeklyHours', 2] },
        dailyBreakdown: {
          $map: {
            input: '$dailyBreakdown',
            as: 'day',
            in: {
              date: '$$day.date',
              hours: { $round: ['$$day.hours', 2] },
              sessions: '$$day.sessions'
            }
          }
        }
      }
    },
    { $sort: { 'worker.name': 1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      weeklyHours,
      period: {
        startDate: weekStart,
        endDate: weekEnd
      }
    }
  });
});
