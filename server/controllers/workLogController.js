const WorkLog = require('../models/WorkLog');
const TimeSession = require('../models/TimeSession');
const User = require('../models/User');
const Building = require('../models/Building');
const WorkOrder = require('../models/WorkOrder');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const multer = require('multer');
const path = require('path');

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/work-logs/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'worklog-' + uniqueSuffix + path.extname(file.originalname));
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
exports.uploadWorkLogPhotos = upload.array('photos', 10);

// Create work log
exports.createWorkLog = catchAsync(async (req, res, next) => {
  const { timeSessionId, workCompleted, issues, materialsUsed, buildingId, workOrderId } = req.body;
  
  // Use authenticated user as worker
  const workerId = req.user.id;
  
  // Validate time session exists and belongs to worker
  const timeSession = await TimeSession.findById(timeSessionId);
  if (!timeSession) {
    return next(new AppError('Time session not found', 404));
  }
  
  if (timeSession.worker.toString() !== workerId) {
    return next(new AppError('You can only create work logs for your own time sessions', 403));
  }
  
  // Check if work log already exists for this session
  const existingLog = await WorkLog.findOne({ timeSession: timeSessionId });
  if (existingLog) {
    return next(new AppError('Work log already exists for this time session', 400));
  }
  
  // Process uploaded photos
  const photos = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      photos.push({
        url: `/uploads/work-logs/${file.filename}`,
        description: 'Work progress photo',
        timestamp: new Date()
      });
    });
  }
  
  // Parse materials used if it's a string
  let parsedMaterials = [];
  if (materialsUsed) {
    try {
      parsedMaterials = typeof materialsUsed === 'string' ? JSON.parse(materialsUsed) : materialsUsed;
    } catch (error) {
      console.warn('Error parsing materials:', error);
    }
  }
  
  const workLog = await WorkLog.create({
    worker: workerId,
    timeSession: timeSessionId,
    building: buildingId || timeSession.building,
    workOrder: workOrderId || timeSession.workOrder,
    date: new Date(),
    workCompleted,
    issues: issues || '',
    materialsUsed: parsedMaterials,
    photos
  });
  
  // Populate for response
  await workLog.populate([
    { path: 'worker', select: 'name email' },
    { path: 'building', select: 'name address' },
    { path: 'workOrder', select: 'title description' }
  ]);
  
  res.status(201).json({
    status: 'success',
    data: { workLog }
  });
});

// Get work logs for worker
exports.getWorkerWorkLogs = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;
  const { startDate, endDate, buildingId, status } = req.query;
  
  // Workers can only see their own logs, admins/managers can see any
  const actualWorkerId = workerId || req.user.id;
  if (actualWorkerId !== req.user.id && !['admin', 'manager', 'supervisor'].includes(req.user.role)) {
    return next(new AppError('You can only view your own work logs', 403));
  }
  
  const filter = { worker: actualWorkerId };
  
  if (buildingId) filter.building = buildingId;
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  
  const workLogs = await WorkLog.find(filter)
    .populate('worker', 'name email')
    .populate('building', 'name address')
    .populate('workOrder', 'title description')
    .populate('timeSession', 'clockInTime clockOutTime totalHours')
    .populate('adminFeedbackBy', 'name')
    .sort('-date');
  
  res.status(200).json({
    status: 'success',
    results: workLogs.length,
    data: { workLogs }
  });
});

// Get all work logs (admin/manager)
exports.getAllWorkLogs = catchAsync(async (req, res, next) => {
  const { startDate, endDate, buildingId, workerId, status } = req.query;
  
  // Only admin/manager can view all logs
  if (!['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('Access denied', 403));
  }
  
  const filter = {};
  
  if (workerId) filter.worker = workerId;
  if (buildingId) filter.building = buildingId;
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  
  const workLogs = await WorkLog.find(filter)
    .populate('worker', 'name email')
    .populate('building', 'name address')
    .populate('workOrder', 'title description')
    .populate('timeSession', 'clockInTime clockOutTime totalHours')
    .populate('adminFeedbackBy', 'name')
    .sort('-date');
  
  res.status(200).json({
    status: 'success',
    results: workLogs.length,
    data: { workLogs }
  });
});

// Update work log
exports.updateWorkLog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { workCompleted, issues, materialsUsed } = req.body;
  
  const workLog = await WorkLog.findById(id);
  if (!workLog) {
    return next(new AppError('Work log not found', 404));
  }
  
  // Workers can only update their own logs, and only if not reviewed
  if (workLog.worker.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('You can only update your own work logs', 403));
  }
  
  if (workLog.status === 'approved' && !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('Cannot update approved work logs', 400));
  }
  
  // Process uploaded photos
  const newPhotos = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      newPhotos.push({
        url: `/uploads/work-logs/${file.filename}`,
        description: 'Work progress photo',
        timestamp: new Date()
      });
    });
  }
  
  // Parse materials used if it's a string
  let parsedMaterials = workLog.materialsUsed;
  if (materialsUsed) {
    try {
      parsedMaterials = typeof materialsUsed === 'string' ? JSON.parse(materialsUsed) : materialsUsed;
    } catch (error) {
      console.warn('Error parsing materials:', error);
    }
  }
  
  // Update fields
  if (workCompleted !== undefined) workLog.workCompleted = workCompleted;
  if (issues !== undefined) workLog.issues = issues;
  if (parsedMaterials) workLog.materialsUsed = parsedMaterials;
  if (newPhotos.length > 0) workLog.photos.push(...newPhotos);
  
  // Reset status if worker updates after review
  if (workLog.status === 'reviewed' && workLog.worker.toString() === req.user.id) {
    workLog.status = 'pending';
  }
  
  await workLog.save();
  
  // Populate for response
  await workLog.populate([
    { path: 'worker', select: 'name email' },
    { path: 'building', select: 'name address' },
    { path: 'workOrder', select: 'title description' },
    { path: 'adminFeedbackBy', select: 'name' }
  ]);
  
  res.status(200).json({
    status: 'success',
    data: { workLog }
  });
});

// Add admin feedback
exports.addAdminFeedback = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { feedback, status } = req.body;
  
  // Only admin/manager can add feedback
  if (!['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('Access denied', 403));
  }
  
  const workLog = await WorkLog.findById(id);
  if (!workLog) {
    return next(new AppError('Work log not found', 404));
  }
  
  workLog.adminFeedback = feedback;
  workLog.adminFeedbackBy = req.user.id;
  workLog.adminFeedbackAt = new Date();
  if (status) workLog.status = status;
  
  await workLog.save();
  
  // Populate for response
  await workLog.populate([
    { path: 'worker', select: 'name email' },
    { path: 'building', select: 'name address' },
    { path: 'workOrder', select: 'title description' },
    { path: 'adminFeedbackBy', select: 'name' }
  ]);
  
  res.status(200).json({
    status: 'success',
    data: { workLog }
  });
});

// Delete work log
exports.deleteWorkLog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const workLog = await WorkLog.findById(id);
  if (!workLog) {
    return next(new AppError('Work log not found', 404));
  }
  
  // Workers can only delete their own logs if not approved
  if (workLog.worker.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('You can only delete your own work logs', 403));
  }
  
  if (workLog.status === 'approved' && !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('Cannot delete approved work logs', 400));
  }
  
  await WorkLog.findByIdAndDelete(id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get work log statistics
exports.getWorkLogStats = catchAsync(async (req, res, next) => {
  const { workerId, buildingId, startDate, endDate } = req.query;
  
  // Build filter
  const filter = {};
  if (workerId) filter.worker = workerId;
  if (buildingId) filter.building = buildingId;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  
  const stats = await WorkLog.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalLogs: { $sum: 1 },
        pendingLogs: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        reviewedLogs: { $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] } },
        approvedLogs: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        needsRevisionLogs: { $sum: { $cond: [{ $eq: ['$status', 'needs_revision'] }, 1, 0] } }
      }
    }
  ]);
  
  const result = stats[0] || {
    totalLogs: 0,
    pendingLogs: 0,
    reviewedLogs: 0,
    approvedLogs: 0,
    needsRevisionLogs: 0
  };
  
  res.status(200).json({
    status: 'success',
    data: { stats: result }
  });
});
