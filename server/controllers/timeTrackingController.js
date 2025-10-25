const TimeSession = require('../models/TimeSession');
const WorkLog = require('../models/WorkLog');
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
  const { workerId, buildingId, workOrderId, latitude, longitude, accuracy, notes, apartmentNumber, workType } = req.body;

  console.log('Clock-in request:', { 
    workerId, 
    buildingId, 
    buildingIdType: typeof buildingId,
    workOrderId, 
    latitude, 
    longitude, 
    accuracy, 
    notes, 
    apartmentNumber, 
    workType,
    user: req.user?.id 
  });

  // Use authenticated user's ID if workerId not provided
  const actualWorkerId = workerId || req.user.id;

  // Validate and clean buildingId
  let cleanBuildingId = null;
  if (buildingId) {
    if (typeof buildingId === 'string' && buildingId !== '[object Object]' && buildingId !== 'undefined' && buildingId !== 'null') {
      cleanBuildingId = buildingId;
    } else if (typeof buildingId === 'object' && buildingId._id) {
      cleanBuildingId = buildingId._id;
    }
    console.log('Building ID cleaned:', { original: buildingId, cleaned: cleanBuildingId });
  }

  // Validate required fields - make location optional for now
  if (!actualWorkerId) {
    console.log('Missing required fields:', { actualWorkerId });
    return next(new AppError('Worker ID is required', 400));
  }

  // Set default location if not provided
  const defaultLat = latitude || 0;
  const defaultLng = longitude || 0;

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

  // Simplified location validation - skip geofencing for now
  let locationValidation = { 
    valid: true, 
    message: 'Location validation skipped',
    distance: 0
  };

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

  // Get worker's hourly rate from the already fetched worker
  const hourlyRate = worker?.workerProfile?.hourlyRate || 0;

  // Create new time session with safe location data
  console.log('Creating time session with data:', {
    worker: actualWorkerId,
    workOrder: workOrderId || null,
    building: cleanBuildingId || null,
    hourlyRate: hourlyRate,
    apartmentNumber: apartmentNumber || null,
    workType: workType || 'General'
  });

  let timeSession;
  try {
    timeSession = await TimeSession.create({
      worker: actualWorkerId,
      workOrder: workOrderId || null,
      building: cleanBuildingId || null,
      clockInTime: new Date(),
      hourlyRate: hourlyRate,
      apartmentNumber: apartmentNumber || null,
      workType: workType || 'General',
      location: {
        clockIn: {
          latitude: defaultLat ? parseFloat(defaultLat) : 0,
          longitude: defaultLng ? parseFloat(defaultLng) : 0,
          accuracy: accuracy ? parseFloat(accuracy) : null,
          timestamp: new Date(),
          geofenceValidated: locationValidation.valid || false,
          geofenceMessage: locationValidation.message || 'Location not validated',
          geofenceDistance: locationValidation.distance || 0
        }
      },
      photos: photos || [],
      notes: notes || '',
      status: 'active'
    });
    console.log('Time session created successfully:', timeSession._id);
  } catch (createError) {
    console.error('Error creating time session:', createError);
    return next(new AppError(`Failed to create time session: ${createError.message}`, 500));
  }

  // Populate worker details with error handling
  try {
    await timeSession.populate('worker', 'name email');
    if (workOrderId) {
      await timeSession.populate('workOrder', 'title description');
    }
    if (cleanBuildingId) {
      await timeSession.populate('building', 'name address');
    }
  } catch (populateError) {
    console.log('Population error (non-critical):', populateError.message);
    // Continue without population if it fails
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
    .populate('worker', 'name email workerProfile')
    .populate('workOrder', 'title description apartmentNumber')
    .populate('building', 'name address')
    .populate('approvedBy', 'name email')
    .populate('correctedBy', 'name email')
    .sort('-clockInTime');

  // Ensure sessions have hourly rates and calculated pay
  for (const session of sessions) {
    let needsUpdate = false;
    
    // Set hourly rate from worker profile if not set
    if ((!session.hourlyRate || session.hourlyRate === 0) && session.worker?.workerProfile?.hourlyRate) {
      session.hourlyRate = session.worker.workerProfile.hourlyRate;
      needsUpdate = true;
    }
    
    // Recalculate pay if needed
    if (session.totalHours > 0 && session.hourlyRate > 0 && (!session.calculatedPay || session.calculatedPay === 0)) {
      session.calculatedPay = Math.round(session.totalHours * session.hourlyRate * 100) / 100;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await session.save();
    }
  }

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    data: { sessions }
  });
});

// Get pending approvals
exports.getPendingApprovals = catchAsync(async (req, res, next) => {
  const sessions = await TimeSession.find({ isApproved: false, status: 'completed' })
    .populate('worker', 'name email workerProfile')
    .populate('workOrder', 'title description apartmentNumber')
    .populate('building', 'name address')
    .populate('approvedBy', 'name email')
    .populate('correctedBy', 'name email')
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

  // Get all sessions for general stats
  const allSessionsFilter = {};
  if (workerId) allSessionsFilter.worker = workerId;
  if (buildingId) allSessionsFilter.building = buildingId;
  if (startDate || endDate) {
    allSessionsFilter.clockInTime = {};
    if (startDate) allSessionsFilter.clockInTime.$gte = new Date(startDate);
    if (endDate) allSessionsFilter.clockInTime.$lte = new Date(endDate);
  }

  // Get active sessions
  const activeSessions = await TimeSession.countDocuments({
    ...allSessionsFilter,
    status: 'active'
  });

  // Get today's sessions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySessions = await TimeSession.find({
    ...allSessionsFilter,
    clockInTime: { $gte: today, $lt: tomorrow }
  });

  const totalHoursToday = todaySessions.reduce((sum, session) => {
    return sum + (session.correctedHours || session.totalHours || 0);
  }, 0);

  // Get pending approvals
  const pendingApprovals = await TimeSession.countDocuments({
    ...allSessionsFilter,
    status: 'completed',
    isApproved: false
  });

  // Get unique workers clocked in today
  const workersActive = await TimeSession.distinct('worker', {
    ...allSessionsFilter,
    status: 'active'
  });

  const stats = {
    activeSessions,
    totalHoursToday: Math.round(totalHoursToday * 100) / 100,
    pendingApprovals,
    workersActive: workersActive.length
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

// Admin: Correct worker hours
exports.correctHours = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  const { correctedHours, correctionReason, hourlyRate } = req.body;

  // Validate admin permissions
  if (!['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('Only admins and managers can correct hours', 403));
  }

  // Validate input
  if (!correctedHours || correctedHours < 0 || correctedHours > 24) {
    return next(new AppError('Corrected hours must be between 0 and 24', 400));
  }

  if (!correctionReason || correctionReason.trim().length < 5) {
    return next(new AppError('Correction reason must be at least 5 characters', 400));
  }

  const session = await TimeSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Time session not found', 404));
  }

  // Store original hours if not already stored
  if (!session.originalHours) {
    session.originalHours = session.totalHours;
  }

  // Apply corrections
  session.correctedHours = parseFloat(correctedHours);
  session.correctionReason = correctionReason.trim();
  session.correctedBy = req.user.id;
  session.correctedAt = new Date();
  
  // Update hourly rate if provided
  if (hourlyRate && hourlyRate > 0) {
    session.hourlyRate = parseFloat(hourlyRate);
  }

  await session.save();

  // Populate for response
  await session.populate([
    { path: 'worker', select: 'name email' },
    { path: 'correctedBy', select: 'name email' },
    { path: 'building', select: 'name' }
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Hours corrected successfully',
    data: {
      session
    }
  });
});

// Admin: Set hourly rates for multiple workers
exports.setHourlyRates = catchAsync(async (req, res, next) => {
  const { workerRates } = req.body; // Array of { workerId, hourlyRate }

  // Validate admin permissions
  if (!['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('Only admins and managers can set hourly rates', 403));
  }

  if (!Array.isArray(workerRates) || workerRates.length === 0) {
    return next(new AppError('Worker rates array is required', 400));
  }

  const results = [];
  
  for (const { workerId, hourlyRate } of workerRates) {
    if (!workerId || !hourlyRate || hourlyRate < 0) {
      results.push({ workerId, status: 'error', message: 'Invalid worker ID or hourly rate' });
      continue;
    }

    try {
      // Update worker's profile with default hourly rate
      const worker = await User.findById(workerId);
      if (!worker || worker.role !== 'worker') {
        results.push({ workerId, status: 'error', message: 'Worker not found' });
        continue;
      }

      // Update worker profile
      if (!worker.workerProfile) {
        worker.workerProfile = {};
      }
      worker.workerProfile.hourlyRate = parseFloat(hourlyRate);
      await worker.save();

      // Update all sessions for this worker that don't have an hourly rate set
      const sessionsToUpdate = await TimeSession.find({ 
        worker: workerId, 
        status: { $in: ['active', 'completed'] },
        $or: [
          { hourlyRate: { $exists: false } },
          { hourlyRate: 0 },
          { hourlyRate: null }
        ]
      });

      // Update each session individually to calculate payment
      for (const session of sessionsToUpdate) {
        session.hourlyRate = parseFloat(hourlyRate);
        if (session.totalHours > 0) {
          session.calculatedPay = session.totalHours * parseFloat(hourlyRate);
        }
        await session.save();
      }

      results.push({ workerId, status: 'success', hourlyRate: parseFloat(hourlyRate) });
    } catch (error) {
      results.push({ workerId, status: 'error', message: error.message });
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Hourly rates updated',
    data: { results }
  });
});

// Get payment report for workers
exports.getPaymentReport = catchAsync(async (req, res, next) => {
  const { startDate, endDate, workerId } = req.query;

  // Validate admin permissions
  if (!['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('Only admins and managers can view payment reports', 403));
  }

  // Build query
  const query = {
    status: 'completed',
    isApproved: true,
    clockOutTime: { $exists: true }
  };

  if (startDate) {
    query.clockInTime = { $gte: new Date(startDate) };
  }
  if (endDate) {
    query.clockOutTime = { ...query.clockOutTime, $lte: new Date(endDate) };
  }
  if (workerId) {
    query.worker = workerId;
  }

  const paymentData = await TimeSession.aggregate([
    { $match: query },
    {
      $lookup: {
        from: 'users',
        localField: 'worker',
        foreignField: '_id',
        as: 'workerInfo'
      }
    },
    {
      $lookup: {
        from: 'buildings',
        localField: 'building',
        foreignField: '_id',
        as: 'buildingInfo'
      }
    },
    {
      $unwind: '$workerInfo'
    },
    {
      $addFields: {
        effectiveHours: { $ifNull: ['$correctedHours', '$totalHours'] },
        buildingName: { $arrayElemAt: ['$buildingInfo.name', 0] }
      }
    },
    {
      $group: {
        _id: '$worker',
        workerName: { $first: '$workerInfo.name' },
        workerEmail: { $first: '$workerInfo.email' },
        totalHours: { $sum: '$effectiveHours' },
        totalPay: { $sum: '$calculatedPay' },
        sessionsCount: { $sum: 1 },
        avgHourlyRate: { $avg: '$hourlyRate' },
        sessions: {
          $push: {
            sessionId: '$_id',
            date: '$clockInTime',
            building: '$buildingName',
            apartment: '$apartmentNumber',
            workType: '$workType',
            hours: '$effectiveHours',
            hourlyRate: '$hourlyRate',
            pay: '$calculatedPay',
            wasCorrected: { $ne: ['$correctedHours', null] },
            correctionReason: '$correctionReason'
          }
        }
      }
    },
    { $sort: { workerName: 1 } }
  ]);

  const totalPayroll = paymentData.reduce((sum, worker) => sum + (worker.totalPay || 0), 0);
  const totalHours = paymentData.reduce((sum, worker) => sum + (worker.totalHours || 0), 0);

  res.status(200).json({
    status: 'success',
    data: {
      paymentData,
      summary: {
        totalWorkers: paymentData.length,
        totalHours: Math.round(totalHours * 100) / 100,
        totalPayroll: Math.round(totalPayroll * 100) / 100,
        avgHourlyRate: totalHours > 0 ? Math.round((totalPayroll / totalHours) * 100) / 100 : 0
      },
      period: {
        startDate: startDate || 'All time',
        endDate: endDate || 'All time'
      }
    }
  });
});
