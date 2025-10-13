const ProjectEstimate = require('../models/ProjectEstimate');
const WorkOrder = require('../models/WorkOrder');
const Building = require('../models/Building');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/project-estimates');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `project-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

exports.uploadProjectPhotos = upload.array('photos', 10);

// @desc    Create new project estimate
// @route   POST /api/v1/project-estimates
// @access  Private
exports.createProjectEstimate = catchAsync(async (req, res, next) => {
  const projectData = {
    ...req.body,
    createdBy: req.user.id
  };

  // Process uploaded photos
  if (req.files && req.files.length > 0) {
    projectData.photos = req.files.map(file => ({
      url: `/uploads/project-estimates/${file.filename}`,
      caption: req.body.photoCaption || '',
      type: req.body.photoType || 'site_visit'
    }));
  }

  const projectEstimate = await ProjectEstimate.create(projectData);

  await projectEstimate.populate([
    { path: 'building', select: 'name address' },
    { path: 'createdBy', select: 'name email' }
  ]);

  res.status(201).json({
    status: 'success',
    data: {
      projectEstimate
    }
  });
});

// @desc    Get all project estimates
// @route   GET /api/v1/project-estimates
// @access  Private
exports.getAllProjectEstimates = catchAsync(async (req, res, next) => {
  const { 
    status, 
    building, 
    targetYear, 
    priority, 
    startDate, 
    endDate,
    page = 1,
    limit = 10
  } = req.query;

  // Build filter object
  const filter = {};
  if (status) filter.status = status;
  if (building) filter.building = building;
  if (targetYear) filter.targetYear = parseInt(targetYear);
  if (priority) filter.priority = priority;

  // Date range filter
  if (startDate || endDate) {
    filter.visitDate = {};
    if (startDate) filter.visitDate.$gte = new Date(startDate);
    if (endDate) filter.visitDate.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [projectEstimates, total] = await Promise.all([
    ProjectEstimate.find(filter)
      .populate([
        { path: 'building', select: 'name address' },
        { path: 'createdBy', select: 'name email' },
        { path: 'approvedBy', select: 'name email' },
        { path: 'workOrderId', select: 'title status' }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    ProjectEstimate.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    results: projectEstimates.length,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: {
      projectEstimates
    }
  });
});

// @desc    Get single project estimate
// @route   GET /api/v1/project-estimates/:id
// @access  Private
exports.getProjectEstimate = catchAsync(async (req, res, next) => {
  const projectEstimate = await ProjectEstimate.findById(req.params.id)
    .populate([
      { path: 'building', select: 'name address' },
      { path: 'createdBy', select: 'name email' },
      { path: 'approvedBy', select: 'name email' },
      { path: 'workOrderId', select: 'title status' }
    ]);

  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      projectEstimate
    }
  });
});

// @desc    Update project estimate
// @route   PATCH /api/v1/project-estimates/:id
// @access  Private
exports.updateProjectEstimate = catchAsync(async (req, res, next) => {
  let projectEstimate = await ProjectEstimate.findById(req.params.id);

  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }

  // Process new uploaded photos
  if (req.files && req.files.length > 0) {
    const newPhotos = req.files.map(file => ({
      url: `/uploads/project-estimates/${file.filename}`,
      caption: req.body.photoCaption || '',
      type: req.body.photoType || 'site_visit'
    }));
    
    // Add to existing photos
    req.body.photos = [...(projectEstimate.photos || []), ...newPhotos];
  }

  projectEstimate = await ProjectEstimate.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).populate([
    { path: 'building', select: 'name address' },
    { path: 'createdBy', select: 'name email' },
    { path: 'approvedBy', select: 'name email' }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      projectEstimate
    }
  });
});

// @desc    Delete project estimate
// @route   DELETE /api/v1/project-estimates/:id
// @access  Private
exports.deleteProjectEstimate = catchAsync(async (req, res, next) => {
  const projectEstimate = await ProjectEstimate.findById(req.params.id);

  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }

  // Don't allow deletion if already converted to work order
  if (projectEstimate.status === 'converted') {
    return next(new AppError('Cannot delete project estimate that has been converted to work order', 400));
  }

  // Delete associated photos from filesystem
  if (projectEstimate.photos && projectEstimate.photos.length > 0) {
    projectEstimate.photos.forEach(photo => {
      const filePath = path.join(__dirname, '..', photo.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }

  await ProjectEstimate.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Approve project estimate
// @route   PATCH /api/v1/project-estimates/:id/approve
// @access  Private (Admin/Manager only)
exports.approveProjectEstimate = catchAsync(async (req, res, next) => {
  const { approved, rejectionReason } = req.body;
  
  const projectEstimate = await ProjectEstimate.findById(req.params.id);

  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }

  if (approved) {
    projectEstimate.status = 'approved';
    projectEstimate.approvedBy = req.user.id;
    projectEstimate.approvedAt = new Date();
  } else {
    projectEstimate.status = 'rejected';
    projectEstimate.rejectionReason = rejectionReason;
  }

  await projectEstimate.save();

  await projectEstimate.populate([
    { path: 'building', select: 'name address' },
    { path: 'createdBy', select: 'name email' },
    { path: 'approvedBy', select: 'name email' }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      projectEstimate
    }
  });
});

// @desc    Convert project estimate to work order
// @route   POST /api/v1/project-estimates/:id/convert
// @access  Private
exports.convertToWorkOrder = catchAsync(async (req, res, next) => {
  const projectEstimate = await ProjectEstimate.findById(req.params.id)
    .populate('building');

  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }

  if (projectEstimate.status !== 'approved') {
    return next(new AppError('Only approved project estimates can be converted to work orders', 400));
  }

  if (projectEstimate.status === 'converted') {
    return next(new AppError('Project estimate has already been converted', 400));
  }

  // Create work order from project estimate
  const workOrderData = {
    title: projectEstimate.title,
    description: projectEstimate.description,
    building: projectEstimate.building._id,
    apartmentNumber: projectEstimate.apartmentNumber,
    estimatedCost: projectEstimate.estimatedCost,
    price: projectEstimate.estimatedPrice,
    scheduledDate: projectEstimate.proposedStartDate || new Date(),
    photos: projectEstimate.photos,
    notes: projectEstimate.notes,
    createdBy: req.user.id,
    status: 'pending'
  };

  const workOrder = await WorkOrder.create(workOrderData);

  // Update project estimate
  projectEstimate.status = 'converted';
  projectEstimate.workOrderId = workOrder._id;
  await projectEstimate.save();

  res.status(201).json({
    status: 'success',
    data: {
      workOrder,
      projectEstimate
    }
  });
});

// @desc    Get project estimates statistics
// @route   GET /api/v1/project-estimates/stats
// @access  Private
exports.getProjectEstimateStats = catchAsync(async (req, res, next) => {
  const { targetYear } = req.query;
  const currentYear = new Date().getFullYear();
  const year = targetYear ? parseInt(targetYear) : currentYear;

  const stats = await ProjectEstimate.aggregate([
    {
      $match: {
        targetYear: year
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEstimatedValue: { $sum: '$estimatedPrice' },
        totalEstimatedCost: { $sum: '$estimatedCost' }
      }
    }
  ]);

  const summary = {
    year,
    totalProjects: 0,
    totalEstimatedValue: 0,
    totalEstimatedCost: 0,
    totalEstimatedProfit: 0,
    byStatus: {}
  };

  stats.forEach(stat => {
    summary.totalProjects += stat.count;
    summary.totalEstimatedValue += stat.totalEstimatedValue;
    summary.totalEstimatedCost += stat.totalEstimatedCost;
    summary.byStatus[stat._id] = {
      count: stat.count,
      value: stat.totalEstimatedValue,
      cost: stat.totalEstimatedCost
    };
  });

  summary.totalEstimatedProfit = summary.totalEstimatedValue - summary.totalEstimatedCost;

  res.status(200).json({
    status: 'success',
    data: {
      stats: summary
    }
  });
});

// @desc    Get pending approvals
// @route   GET /api/v1/project-estimates/pending-approvals
// @access  Private (Admin/Manager only)
exports.getPendingApprovals = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const [projectEstimates, total] = await Promise.all([
    ProjectEstimate.find({ status: { $in: ['submitted', 'pending'] } })
      .populate([
        { path: 'building', select: 'name address' },
        { path: 'createdBy', select: 'name email' }
      ])
      .sort({ submittedAt: 1 }) // Oldest first
      .skip(skip)
      .limit(parseInt(limit)),
    ProjectEstimate.countDocuments({ status: { $in: ['submitted', 'pending'] } })
  ]);

  res.status(200).json({
    status: 'success',
    results: projectEstimates.length,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: {
      projectEstimates
    }
  });
});

// @desc    Convert project estimate to invoice
// @route   POST /api/v1/project-estimates/:id/convert-to-invoice
// @access  Private (Admin/Manager only)
exports.convertToInvoice = catchAsync(async (req, res, next) => {
  const projectEstimate = await ProjectEstimate.findById(req.params.id);

  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }

  if (projectEstimate.status !== 'approved') {
    return next(new AppError('Only approved estimates can be converted to invoices', 400));
  }

  // Create invoice from project estimate
  const Invoice = require('../models/Invoice');
  
  const invoiceData = {
    projectEstimate: projectEstimate._id,
    building: projectEstimate.building,
    apartmentNumber: projectEstimate.apartmentNumber,
    description: projectEstimate.description,
    amount: projectEstimate.estimatedPrice || projectEstimate.estimatedCost,
    total: projectEstimate.estimatedPrice || projectEstimate.estimatedCost,
    status: 'draft',
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    createdBy: req.user.id,
    items: [{
      description: projectEstimate.title,
      quantity: 1,
      unitPrice: projectEstimate.estimatedPrice || projectEstimate.estimatedCost,
      total: projectEstimate.estimatedPrice || projectEstimate.estimatedCost
    }]
  };

  const invoice = await Invoice.create(invoiceData);

  // Update project estimate status
  projectEstimate.status = 'converted_to_invoice';
  projectEstimate.convertedToInvoice = invoice._id;
  await projectEstimate.save();

  res.status(201).json({
    status: 'success',
    message: 'Project estimate converted to invoice successfully',
    data: {
      invoice,
      projectEstimate
    }
  });
});
