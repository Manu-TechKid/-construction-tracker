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

  const { Invoice } = require('../models/Invoice');

  const invoice = await Invoice.create({
    projectEstimate: projectEstimate._id,
    building: projectEstimate.building,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    notes: projectEstimate.notes,
    createdBy: req.user._id,
    lineItems: [{
      serviceCategory: 'other',
      serviceSubcategory: 'estimate_conversion',
      description: projectEstimate.title || projectEstimate.description || 'Converted Project Estimate',
      quantity: 1,
      unitType: 'fixed',
      unitPrice: projectEstimate.estimatedPrice || projectEstimate.estimatedCost || 0,
      totalPrice: projectEstimate.estimatedPrice || projectEstimate.estimatedCost || 0,
      taxable: true,
      taxRate: 0
    }],
    subtotal: projectEstimate.estimatedPrice || projectEstimate.estimatedCost || 0,
    totalDiscount: 0,
    tax: 0,
    total: projectEstimate.estimatedPrice || projectEstimate.estimatedCost || 0,
    status: 'draft'
  });

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

// @desc    Get client view of project estimate
// @route   GET /api/v1/project-estimates/:id/client-view
// @access  Public (for client access)
exports.getClientView = catchAsync(async (req, res, next) => {
  const projectEstimate = await ProjectEstimate.findById(req.params.id)
    .populate('building', 'name address')
    .populate('createdBy', 'name email');

  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }

  // Mark as viewed if not already
  if (!projectEstimate.clientInteraction.clientViewed) {
    projectEstimate.clientInteraction.clientViewed = true;
    projectEstimate.clientInteraction.viewedAt = new Date();
    projectEstimate.clientInteraction.ipAddress = req.ip;
    await projectEstimate.save();
  }

  res.status(200).json({
    status: 'success',
    data: {
      projectEstimate
    }
  });
});

// @desc    Client accept project estimate
// @route   POST /api/v1/project-estimates/:id/client-accept
// @access  Public (for client access)
exports.clientAccept = catchAsync(async (req, res, next) => {
  const { acceptedBy, signature } = req.body;
  
  const projectEstimate = await ProjectEstimate.findById(req.params.id);
  
  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }
  
  if (projectEstimate.status !== 'pending') {
    return next(new AppError('Only pending estimates can be accepted', 400));
  }
  
  await projectEstimate.acceptByClient({
    acceptedBy,
    signature,
    ipAddress: req.ip
  });
  
  res.status(200).json({
    status: 'success',
    message: 'Project estimate accepted successfully',
    data: {
      projectEstimate
    }
  });
});

// @desc    Client reject project estimate
// @route   POST /api/v1/project-estimates/:id/client-reject
// @access  Public (for client access)
exports.clientReject = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  
  const projectEstimate = await ProjectEstimate.findById(req.params.id);
  
  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }
  
  if (projectEstimate.status !== 'pending') {
    return next(new AppError('Only pending estimates can be rejected', 400));
  }
  
  await projectEstimate.rejectByClient({
    reason,
    ipAddress: req.ip
  });
  
  res.status(200).json({
    status: 'success',
    message: 'Project estimate rejected',
    data: {
      projectEstimate
    }
  });
});

// @desc    Mark estimate as viewed
// @route   PATCH /api/v1/project-estimates/:id/mark-viewed
// @access  Public (for client access)
exports.markAsViewed = catchAsync(async (req, res, next) => {
  const projectEstimate = await ProjectEstimate.findById(req.params.id);
  
  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }
  
  await projectEstimate.markAsViewed(req.ip);
  
  res.status(200).json({
    status: 'success',
    message: 'Estimate marked as viewed',
    data: {
      projectEstimate
    }
  });
});

// @desc    Send estimate to client
// @route   POST /api/v1/project-estimates/:id/send-to-client
// @access  Private (Admin/Manager only)
exports.sendToClient = catchAsync(async (req, res, next) => {
  const { clientEmail } = req.body;
  
  if (!clientEmail) {
    return next(new AppError('Client email is required', 400));
  }
  
  const projectEstimate = await ProjectEstimate.findById(req.params.id)
    .populate('building', 'name address');
  
  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }
  
  await projectEstimate.sendToClient(clientEmail, req.user.id);
  
  res.status(200).json({
    status: 'success',
    message: 'Estimate sent to client successfully',
    data: {
      projectEstimate
    }
  });
});

// @desc    Add line item to estimate
// @route   POST /api/v1/project-estimates/:id/line-items
// @access  Private (Admin/Manager only)
exports.addLineItem = catchAsync(async (req, res, next) => {
  const projectEstimate = await ProjectEstimate.findById(req.params.id);
  
  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }
  
  projectEstimate.addLineItem(req.body);
  await projectEstimate.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Line item added successfully',
    data: {
      projectEstimate
    }
  });
});

// @desc    Update line item in estimate
// @route   PUT /api/v1/project-estimates/:id/line-items/:lineItemId
// @access  Private (Admin/Manager only)
exports.updateLineItem = catchAsync(async (req, res, next) => {
  const projectEstimate = await ProjectEstimate.findById(req.params.id);
  
  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }
  
  const lineItem = projectEstimate.lineItems.id(req.params.lineItemId);
  
  if (!lineItem) {
    return next(new AppError('Line item not found', 404));
  }
  
  Object.keys(req.body).forEach(key => {
    lineItem[key] = req.body[key];
  });
  
  projectEstimate.calculateTotals();
  await projectEstimate.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Line item updated successfully',
    data: {
      projectEstimate
    }
  });
});

// @desc    Remove line item from estimate
// @route   DELETE /api/v1/project-estimates/:id/line-items/:lineItemId
// @access  Private (Admin/Manager only)
exports.removeLineItem = catchAsync(async (req, res, next) => {
  const projectEstimate = await ProjectEstimate.findById(req.params.id);
  
  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }
  
  const lineItem = projectEstimate.lineItems.id(req.params.lineItemId);
  
  if (!lineItem) {
    return next(new AppError('Line item not found', 404));
  }
  
  lineItem.deleteOne();
  projectEstimate.calculateTotals();
  await projectEstimate.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Line item removed successfully',
    data: {
      projectEstimate
    }
  });
});

// @desc    Generate PDF for project estimate
// @route   GET /api/v1/project-estimates/:id/pdf
// @access  Private
exports.generatePDF = catchAsync(async (req, res, next) => {
  const projectEstimate = await ProjectEstimate.findById(req.params.id)
    .populate('building', 'name address city state zipCode')
    .populate('createdBy', 'name email');

  if (!projectEstimate) {
    return next(new AppError('Project estimate not found', 404));
  }

  try {
    const pdf = require('html-pdf');

    // Create HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Project Estimate - ${projectEstimate.title}</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #2c3e50;
              padding-bottom: 30px;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .logo-container {
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
              background: white;
              padding: 15px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .company-logo {
              width: 80px;
              height: 80px;
              margin-right: 15px;
              border-radius: 8px;
              object-fit: contain;
            }
            .company-text {
              text-align: left;
            }
            .company-name {
              font-size: 36px;
              font-weight: bold;
              color: #2c3e50;
              margin: 0;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            }
            .company-tagline {
              font-size: 16px;
              color: #7f8c8d;
              margin: 5px 0 15px 0;
              font-style: italic;
            }
            .company-info {
              text-align: center;
              margin-bottom: 40px;
              color: #666;
            }
            .estimate-details {
              background-color: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section h3 {
              color: #2c3e50;
              border-bottom: 2px solid #3498db;
              padding-bottom: 5px;
              margin-bottom: 15px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .info-item {
              margin-bottom: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #555;
              display: block;
            }
            .info-value {
              margin-top: 3px;
            }
            .financial-summary {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              border-left: 4px solid #28a745;
              margin: 20px 0;
            }
            .financial-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
            }
            .financial-row:last-child {
              margin-bottom: 0;
            }
            .total-row {
              font-weight: bold;
              font-size: 18px;
              color: #28a745;
              border-top: 2px solid #28a745;
              padding-top: 10px;
              margin-top: 15px;
            }
            .description {
              background-color: #fff3cd;
              padding: 15px;
              border-radius: 6px;
              border-left: 4px solid #ffc107;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 12px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-draft { background-color: #e9ecef; color: #495057; }
            .status-submitted { background-color: #d4edda; color: #155724; }
            .status-approved { background-color: #d1ecf1; color: #0c5460; }
            .status-rejected { background-color: #f8d7da; color: #721c24; }
            .status-client_accepted { background-color: #d4edda; color: #155724; }
            .status-client_rejected { background-color: #f8d7da; color: #721c24; }
            .status-converted_to_invoice { background-color: #e2e3e5; color: #383d41; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-container">
              <img src="https://res.cloudinary.com/dtaqusjav/image/upload/v1729888694/DSJ_logo_kqvkqk.png" alt="DSJ Construction Services" class="company-logo">
              <div class="company-text">
                <div class="company-name">DSJ</div>
                <div class="company-tagline">Construction Services</div>
              </div>
            </div>
            <h2 style="color: #2c3e50; margin: 20px 0 0 0; font-size: 24px;">Project Estimate</h2>
          </div>

          <div class="company-info">
            <p><strong>DSJ Construction Services</strong></p>
            <p>Professional Construction & Renovation Services</p>
            <p>Phone: (555) 123-4567 | Email: info@dsjconstruction.com</p>
          </div>

          <div class="estimate-details">
            <div class="section">
              <h3>Project Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Estimate Number:</span>
                  <div class="info-value">${projectEstimate._id}</div>
                </div>
                <div class="info-item">
                  <span class="info-label">Status:</span>
                  <div class="info-value">
                    <span class="status-badge status-${projectEstimate.status}">${projectEstimate.status.replace('_', ' ').toUpperCase()}</span>
                  </div>
                </div>
                <div class="info-item">
                  <span class="info-label">Project Title:</span>
                  <div class="info-value">${projectEstimate.title}</div>
                </div>
                <div class="info-item">
                  <span class="info-label">Building:</span>
                  <div class="info-value">${projectEstimate.building?.name || 'N/A'}</div>
                </div>
                ${projectEstimate.apartmentNumber ? `
                  <div class="info-item">
                    <span class="info-label">Apartment:</span>
                    <div class="info-value">${projectEstimate.apartmentNumber}</div>
                  </div>
                ` : ''}
                <div class="info-item">
                  <span class="info-label">Created By:</span>
                  <div class="info-value">${projectEstimate.createdBy?.name || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>Project Description</h3>
              <div class="description">
                ${projectEstimate.description || 'No description provided'}
              </div>
            </div>

            <div class="section">
              <h3>Financial Summary</h3>
              <div class="financial-summary">
                <div class="financial-row">
                  <span>Estimated Cost:</span>
                  <span>$${projectEstimate.estimatedCost?.toLocaleString() || '0.00'}</span>
                </div>
                <div class="financial-row">
                  <span>Estimated Price:</span>
                  <span>$${projectEstimate.estimatedPrice?.toLocaleString() || '0.00'}</span>
                </div>
                <div class="financial-row total-row">
                  <span>Total Amount:</span>
                  <span>$${projectEstimate.estimatedPrice?.toLocaleString() || '0.00'}</span>
                </div>
              </div>
            </div>

            ${projectEstimate.notes ? `
              <div class="section">
                <h3>Additional Notes</h3>
                <div class="description">
                  ${projectEstimate.notes}
                </div>
              </div>
            ` : ''}

            <div class="section">
              <h3>Project Timeline</h3>
              <div class="info-grid">
                ${projectEstimate.estimatedDuration ? `
                  <div class="info-item">
                    <span class="info-label">Estimated Duration:</span>
                    <div class="info-value">${projectEstimate.estimatedDuration} days</div>
                  </div>
                ` : ''}
                ${projectEstimate.proposedStartDate ? `
                  <div class="info-item">
                    <span class="info-label">Proposed Start Date:</span>
                    <div class="info-value">${new Date(projectEstimate.proposedStartDate).toLocaleDateString()}</div>
                  </div>
                ` : ''}
                ${projectEstimate.targetYear ? `
                  <div class="info-item">
                    <span class="info-label">Target Year:</span>
                    <div class="info-value">${projectEstimate.targetYear}</div>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="footer">
            <p>This estimate is valid for 30 days from the date of issue.</p>
            <p>For questions or concerns, please contact DSJ Construction Services.</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `;

    // PDF generation options
    const options = {
      format: 'A4',
      orientation: 'portrait',
      border: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      type: 'pdf',
      timeout: 60000,
      renderDelay: 3000,
      phantomArgs: ['--load-images=yes', '--local-to-remote-url-access=yes', '--web-security=no'],
      childProcessOptions: {
        env: {
          OPENSSL_CONF: '/dev/null',
        },
      }
    };

    // Generate PDF using html-pdf
    const pdfBuffer = await new Promise((resolve, reject) => {
      pdf.create(htmlContent, options).toBuffer((err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer);
        }
      });
    });

    // Set response headers and send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="estimate-${projectEstimate._id}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    return next(new AppError('Failed to generate PDF', 500));
  }
});
