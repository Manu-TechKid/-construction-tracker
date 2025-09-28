const TimeSession = require('../models/TimeSession');
const User = require('../models/User');
const WorkOrder = require('../models/WorkOrder');
const Building = require('../models/Building');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const multer = require('multer');
const path = require('path');

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

  // Validate required fields
  if (!workerId || !latitude || !longitude) {
    return next(new AppError('Worker ID, latitude, and longitude are required', 400));
  }

  // Check if worker exists and has worker role
  const worker = await User.findById(workerId);
  if (!worker || worker.role !== 'worker') {
    return next(new AppError('Invalid worker ID', 400));
  }

  // Check if worker is already clocked in
  const activeSession = await TimeSession.findOne({
    worker: workerId,
    status: 'active'
  });

  if (activeSession) {
    return next(new AppError('Worker is already clocked in', 400));
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
    worker: workerId,
    workOrder: workOrderId || null,
    building: buildingId || null,
    clockInTime: new Date(),
    location: {
      clockIn: {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date()
      }
    },
    photos,
    notes,
    status: 'active'
  });

  await timeSession.populate([
    { path: 'worker', select: 'name email' },
    { path: 'workOrder', select: 'title description' },
    { path: 'building', select: 'name address' }
  ]);

  res.status(201).json({
    status: 'success',
    data: {
      timeSession
    }
  });
});

// Clock out worker
exports.clockOut = catchAsync(async (req, res, next) => {
  const { workerId, latitude, longitude, accuracy, notes } = req.body;

  // Find active session
  const activeSession = await TimeSession.findOne({
    worker: workerId,
    status: 'active'
  });

  if (!activeSession) {
    return next(new AppError('No active time session found for this worker', 400));
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

  // Update session with clock out information
  activeSession.clockOutTime = new Date();
  activeSession.status = 'completed';
  activeSession.location.clockOut = {
    latitude,
    longitude,
    accuracy,
    timestamp: new Date()
  };
  
  // Add clock-out photos to existing photos
  activeSession.photos.push(...photos);
  
  if (notes) {
    activeSession.notes = activeSession.notes ? 
      `${activeSession.notes}\n\nClock-out notes: ${notes}` : 
      `Clock-out notes: ${notes}`;
  }

  await activeSession.save();

  await activeSession.populate([
    { path: 'worker', select: 'name email' },
    { path: 'workOrder', select: 'title description' },
    { path: 'building', select: 'name address' }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      timeSession: activeSession
    }
  });
});

// Get worker's current status
exports.getWorkerStatus = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;

  const activeSession = await TimeSession.findOne({
    worker: workerId,
    status: 'active'
  }).populate([
    { path: 'worker', select: 'name email' },
    { path: 'workOrder', select: 'title description' },
    { path: 'building', select: 'name address' }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      isActive: !!activeSession,
      activeSession
    }
  });
});

// Get time sessions with filtering
exports.getTimeSessions = catchAsync(async (req, res, next) => {
  const { workerId, buildingId, status, startDate, endDate, page = 1, limit = 10, isApproved } = req.query;

  // Build filter object
  const filter = {};
  if (workerId) filter.worker = workerId;
  if (buildingId) filter.building = buildingId;
  if (status) filter.status = status;
  if (isApproved !== undefined) filter.isApproved = isApproved === 'true';

  // Date range filter
  if (startDate || endDate) {
    filter.clockInTime = {};
    if (startDate) filter.clockInTime.$gte = new Date(startDate);
    if (endDate) filter.clockInTime.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    TimeSession.find(filter)
      .populate([
        { path: 'worker', select: 'name email' },
        { path: 'workOrder', select: 'title description' },
        { path: 'building', select: 'name address' },
        { path: 'approvedBy', select: 'name email' }
      ])
      .sort({ clockInTime: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    TimeSession.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: {
      sessions
    }
  });
});

// Add progress update
exports.addProgressUpdate = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  const { progress, notes } = req.body;

  const session = await TimeSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Time session not found', 404));
  }

  // Process uploaded photos
  const photos = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      photos.push(`/uploads/time-tracking/${file.filename}`);
    });
  }

  session.progressUpdates.push({
    progress,
    notes,
    photos
  });

  await session.save();

  res.status(200).json({
    status: 'success',
    data: {
      session
    }
  });
});

// Start break
exports.startBreak = catchAsync(async (req, res, next) => {
  const { workerId, reason, latitude, longitude } = req.body;

  const activeSession = await TimeSession.findOne({
    worker: workerId,
    status: 'active'
  });

  if (!activeSession) {
    return next(new AppError('No active time session found', 400));
  }

  // Check if there's already an active break
  const activeBreak = activeSession.breaks.find(b => !b.endTime);
  if (activeBreak) {
    return next(new AppError('Break is already active', 400));
  }

  activeSession.breaks.push({
    startTime: new Date(),
    reason,
    location: {
      latitude,
      longitude
    }
  });

  activeSession.status = 'paused';
  await activeSession.save();

  res.status(200).json({
    status: 'success',
    data: {
      session: activeSession
    }
  });
});

// End break
exports.endBreak = catchAsync(async (req, res, next) => {
  const { workerId } = req.body;

  const activeSession = await TimeSession.findOne({
    worker: workerId,
    status: 'paused'
  });

  if (!activeSession) {
    return next(new AppError('No paused time session found', 400));
  }

  // Find the active break
  const activeBreak = activeSession.breaks.find(b => !b.endTime);
  if (!activeBreak) {
    return next(new AppError('No active break found', 400));
  }

  activeBreak.endTime = new Date();
  activeBreak.duration = Math.round((activeBreak.endTime - activeBreak.startTime) / (1000 * 60)); // Minutes

  // Add break time to total break time
  activeSession.breakTime += activeBreak.duration;
  activeSession.status = 'active';

  await activeSession.save();

  res.status(200).json({
    status: 'success',
    data: {
      session: activeSession
    }
  });
});

// Approve time session (Admin/Manager only)
exports.approveTimeSession = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  const { approved, rejectionReason } = req.body;

  const session = await TimeSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Time session not found', 404));
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
    data: {
      session
    }
  });
});

// Get pending approvals (Admin/Manager only)
exports.getPendingApprovals = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    TimeSession.find({ isApproved: false, status: 'completed' })
      .populate([
        { path: 'worker', select: 'name email' },
        { path: 'workOrder', select: 'title description' },
        { path: 'building', select: 'name address' }
      ])
      .sort({ clockOutTime: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    TimeSession.countDocuments({ isApproved: false, status: 'completed' })
  ]);

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: {
      sessions
    }
  });
});

// Get time tracking statistics
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

  const stats = await TimeSession.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalHours: { $sum: '$totalHours' },
        totalBreakTime: { $sum: '$breakTime' },
        averageHoursPerSession: { $avg: '$totalHours' },
        approvedSessions: {
          $sum: { $cond: ['$isApproved', 1, 0] }
        },
        pendingSessions: {
          $sum: { $cond: ['$isApproved', 0, 1] }
        }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: stats[0] || {
        totalSessions: 0,
        totalHours: 0,
        totalBreakTime: 0,
        averageHoursPerSession: 0,
        approvedSessions: 0,
        pendingSessions: 0
      }
    }
  });
});

// Delete time session (Admin/Manager only)
exports.deleteTimeSession = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;

  const session = await TimeSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Time session not found', 404));
  }

  await TimeSession.findByIdAndDelete(sessionId);

  res.status(204).json({
    status: 'success',
    data: null
  });
});
