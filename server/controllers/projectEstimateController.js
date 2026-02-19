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

  if (req.user?.role === 'notes_only') {
    if (!req.user.assignedBuilding) {
      return next(new AppError('Assigned building is required for this account.', 403));
    }
    if (String(projectData.building) !== String(req.user.assignedBuilding)) {
      return next(new AppError('You can only create estimates for your assigned building.', 403));
    }
  }

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

  if (req.user?.role === 'notes_only') {
    if (!req.user.assignedBuilding) {
      return next(new AppError('Assigned building is required for this account.', 403));
    }
    filter.building = req.user.assignedBuilding;
  }
  if (status) filter.status = status;
  if (building && req.user?.role !== 'notes_only') filter.building = building;
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

  if (req.user?.role === 'notes_only') {
    if (!req.user.assignedBuilding) {
      return next(new AppError('Assigned building is required for this account.', 403));
    }
    if (projectEstimate && String(projectEstimate.building?._id || projectEstimate.building) !== String(req.user.assignedBuilding)) {
      return next(new AppError('You can only view estimates for your assigned building.', 403));
    }
  }

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

  if (req.user?.role === 'notes_only') {
    if (!req.user.assignedBuilding) {
      return next(new AppError('Assigned building is required for this account.', 403));
    }

    if (String(projectEstimate.building) !== String(req.user.assignedBuilding)) {
      return next(new AppError('You can only edit estimates for your assigned building.', 403));
    }

    if (req.body.building && String(req.body.building) !== String(req.user.assignedBuilding)) {
      return next(new AppError('You can only set estimates to your assigned building.', 403));
    }
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

  const match = { targetYear: year };
  if (req.user?.role === 'notes_only') {
    if (!req.user.assignedBuilding) {
      return next(new AppError('Assigned building is required for this account.', 403));
    }
    match.building = req.user.assignedBuilding;
  }

  const stats = await ProjectEstimate.aggregate([
    {
      $match: {
        ...match
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

  const { Invoice, InvoiceCounter } = require('../models/Invoice');

  // Generate invoice number using the counter (same logic as createInvoice)
  let invoiceNumber = null;
  try {
    const currentYear = new Date().getFullYear();
    const counter = await InvoiceCounter.findOneAndUpdate(
      { year: currentYear },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );
    invoiceNumber = `${currentYear}-${String(counter.count).padStart(4, '0')}`;
    console.log('Generated invoice number for estimate conversion:', invoiceNumber);
  } catch (err) {
    console.error('Error generating invoice number:', err);
    // Fall back to letting the pre-save hook generate it
  }

  const invoice = await Invoice.create({
    projectEstimate: projectEstimate._id,
    building: projectEstimate.building,
    invoiceNumber,
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

    // Create CLEAN PROFESSIONAL HTML content for the PDF (matching image 3 style)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Project Estimate - ${projectEstimate.title}</title>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              color: #333;
              background-color: #fff;
              padding: 30px;
            }
            .estimate-container {
              max-width: 850px;
              margin: 0 auto;
            }
            
            /* HEADER: Company Info LEFT + Logo RIGHT */
            .header {
              display: table;
              width: 100%;
              margin-bottom: 30px;
            }
            .header-left {
              display: table-cell;
              width: 70%;
              vertical-align: top;
            }
            .header-right {
              display: table-cell;
              width: 30%;
              text-align: right;
              vertical-align: top;
            }
            .company-name {
              font-size: 11px;
              font-weight: 600;
              color: #333;
              margin-bottom: 4px;
            }
            .company-info {
              font-size: 9px;
              color: #666;
              line-height: 1.5;
            }
            .logo-img {
              width: 80px;
              height: 80px;
              object-fit: contain;
            }
            
            /* ESTIMATE TITLE */
            .estimate-title {
              font-size: 18px;
              font-weight: 600;
              color: #333;
              margin-bottom: 20px;
            }
            
            /* ESTIMATE INFO SECTION */
            .info-section {
              padding-bottom: 15px;
              margin-bottom: 20px;
              border-bottom: 2px solid #1976d2;
            }
            .info-row {
              display: table;
              width: 100%;
              margin-bottom: 8px;
            }
            .info-label {
              display: table-cell;
              font-size: 9px;
              color: #666;
              width: 150px;
            }
            .info-value {
              display: table-cell;
              font-size: 10px;
              font-weight: 600;
              color: #333;
            }
            .status-badge {
              display: inline-block;
              padding: 3px 10px;
              border-radius: 3px;
              font-size: 9px;
              font-weight: 600;
              text-transform: uppercase;
              background-color: #ff9800;
              color: #ffffff;
            }
            .status-approved {
              background-color: #4caf50;
            }
            
            /* DESCRIPTION BOX */
            .description-box {
              background-color: #FFF9E6;
              border: 1px solid #FFE082;
              padding: 12px;
              border-radius: 4px;
              margin: 15px 0;
            }
            .description-title {
              font-size: 10px;
              font-weight: 600;
              color: #1976d2;
              margin-bottom: 8px;
            }
            .description-text {
              font-size: 9px;
              color: #666;
              line-height: 1.6;
            }
            
            /* FINANCIAL TABLE */
            .financial-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              border: 1px solid #e0e0e0;
            }
            .financial-table thead {
              background-color: #2C3E50;
            }
            .financial-table th {
              color: #ffffff;
              font-size: 10px;
              font-weight: 600;
              padding: 12px 10px;
              text-align: left;
            }
            .financial-table th:last-child {
              text-align: right;
            }
            .financial-table td {
              font-size: 9px;
              padding: 12px 10px;
              border-bottom: 1px solid #e0e0e0;
            }
            .financial-table td:last-child {
              text-align: right;
            }
            .financial-table tbody tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            
            /* TOTALS */
            .totals-section {
              width: 250px;
              margin-left: auto;
              margin-top: 20px;
              background-color: #E8F5E9;
              padding: 15px;
              border-radius: 4px;
            }
            .totals-row {
              display: table;
              width: 100%;
              margin-bottom: 8px;
            }
            .totals-label {
              display: table-cell;
              font-size: 10px;
              color: #666;
            }
            .totals-value {
              display: table-cell;
              font-size: 10px;
              color: #333;
              text-align: right;
            }
            .totals-final {
              border-top: 2px solid #2C3E50;
              padding-top: 10px;
              margin-top: 5px;
            }
            .totals-final .totals-label,
            .totals-final .totals-value {
              font-size: 12px;
              font-weight: 600;
            }
            .totals-final .totals-value {
              color: #2e7d32;
            }
            
            /* NOTES BOX */
            .notes-box {
              background-color: #FFF9E6;
              border: 1px solid #FFE082;
              padding: 12px;
              border-radius: 4px;
              margin: 20px 0;
            }
            .notes-title {
              font-size: 10px;
              font-weight: 600;
              color: #1976d2;
              margin-bottom: 8px;
            }
            .notes-text {
              font-size: 9px;
              color: #666;
              line-height: 1.6;
            }
            
            /* TIMELINE */
            .timeline-section {
              margin: 20px 0;
            }
            .timeline-title {
              font-size: 10px;
              font-weight: 600;
              color: #1976d2;
              margin-bottom: 10px;
            }
            .timeline-grid {
              display: table;
              width: 100%;
            }
            .timeline-item {
              display: table-row;
            }
            .timeline-label {
              display: table-cell;
              font-size: 9px;
              color: #666;
              padding: 4px 0;
              width: 150px;
            }
            .timeline-value {
              display: table-cell;
              font-size: 10px;
              font-weight: 600;
              color: #333;
              padding: 4px 0;
            }
            
            /* TERMS BOX */
            .terms-box {
              background-color: #f5f5f5;
              padding: 12px;
              border-radius: 4px;
              margin: 20px 0;
            }
            .terms-title {
              font-size: 9px;
              font-weight: 600;
              color: #333;
              margin-bottom: 8px;
            }
            .terms-text {
              font-size: 8px;
              color: #666;
              line-height: 1.6;
            }
            
            /* FOOTER */
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
            }
            .footer-text {
              font-size: 8px;
              color: #999;
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          <div class="estimate-container">
            
            <!-- HEADER: Company Info LEFT + Logo RIGHT -->
            <div class="header">
              <div class="header-left">
                <div class="company-name">DSJ Construction & Services LLC</div>
                <div class="company-info">
                  651 Pullman Pl<br>
                  McLean, VA 22102<br>
                  Phone: (555) 123-4567<br>
                  Email: info@dsjconstruction.com
                </div>
              </div>
              <div class="header-right">
                <img src="https://res.cloudinary.com/dwqxiigpd/image/upload/v1756186310/dsj-logo_mb3npa.jpg" 
                     alt="DSJ Logo" 
                     class="logo-img"
                     onerror="this.style.display='none';" />
              </div>
            </div>
            
            <!-- ESTIMATE TITLE -->
            <div class="estimate-title">PROJECT ESTIMATE</div>
            
            <!-- ESTIMATE INFO -->
            <div class="info-section">
              <div class="info-row">
                <div class="info-label">Estimate Number:</div>
                <div class="info-value">${projectEstimate._id.toString().substring(0, 12).toUpperCase()}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Status:</div>
                <div class="info-value">
                  <span class="status-badge ${projectEstimate.status === 'approved' ? 'status-approved' : ''}">
                    ${projectEstimate.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">Created Date:</div>
                <div class="info-value">${new Date(projectEstimate.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Project Title:</div>
                <div class="info-value">${projectEstimate.title}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Building:</div>
                <div class="info-value">${projectEstimate.building?.name || 'N/A'}</div>
              </div>
              ${projectEstimate.building?.address ? `
                <div class="info-row">
                  <div class="info-label">Address:</div>
                  <div class="info-value" style="font-size:9px;font-weight:normal;">${projectEstimate.building.address}</div>
                </div>
              ` : ''}
              ${projectEstimate.apartmentNumber ? `
                <div class="info-row">
                  <div class="info-label">Apartment:</div>
                  <div class="info-value">${projectEstimate.apartmentNumber}</div>
                </div>
              ` : ''}
              ${projectEstimate.createdBy ? `
                <div class="info-row">
                  <div class="info-label">Created By:</div>
                  <div class="info-value">${projectEstimate.createdBy.name || projectEstimate.createdBy.email || 'N/A'}</div>
                </div>
              ` : ''}
            </div>
            
            <!-- PROJECT DESCRIPTION -->
            ${projectEstimate.description ? `
              <div class="description-box">
                <div class="description-title">Project Description</div>
                <div class="description-text">${projectEstimate.description}</div>
              </div>
            ` : ''}
            
            <!-- LINE ITEMS / SERVICES TABLE -->
            ${projectEstimate.lineItems && projectEstimate.lineItems.length > 0 ? `
              <div class="description-title" style="margin-top:20px;">Estimate Line Items</div>
              <table class="financial-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>PRODUCT/SERVICE</th>
                    <th>DESCRIPTION</th>
                    <th style="text-align:right;">QTY</th>
                    <th style="text-align:right;">RATE</th>
                    <th style="text-align:right;">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  ${projectEstimate.lineItems.map(item => `
                    <tr>
                      <td>${item.serviceDate ? new Date(item.serviceDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''}</td>
                      <td>${item.productService || ''}</td>
                      <td>${item.description || ''}</td>
                      <td style="text-align:right;">${item.qty || 1}</td>
                      <td style="text-align:right;">$${(item.rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style="text-align:right;">$${(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <!-- FINANCIAL SUMMARY (when no line items) -->
              <div class="description-title" style="margin-top:20px;">Financial Summary</div>
              <table class="financial-table">
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>DESCRIPTION</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Estimated Cost</td>
                    <td>Project materials and labor cost</td>
                    <td>$${projectEstimate.estimatedCost?.toLocaleString() || '0.00'}</td>
                  </tr>
                  ${projectEstimate.estimatedPrice && projectEstimate.estimatedPrice !== projectEstimate.estimatedCost ? `
                    <tr>
                      <td>Estimated Price</td>
                      <td>Client quoted price</td>
                      <td>$${projectEstimate.estimatedPrice.toLocaleString()}</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            `}
            
            <!-- TOTALS -->
            <div class="totals-section">
              <div class="totals-row">
                <div class="totals-label">Estimated Cost:</div>
                <div class="totals-value">$${projectEstimate.estimatedCost?.toLocaleString() || '0.00'}</div>
              </div>
              ${projectEstimate.estimatedPrice && projectEstimate.estimatedPrice !== projectEstimate.estimatedCost ? `
                <div class="totals-row">
                  <div class="totals-label">Estimated Price:</div>
                  <div class="totals-value">$${projectEstimate.estimatedPrice.toLocaleString()}</div>
                </div>
              ` : ''}
              <div class="totals-row totals-final">
                <div class="totals-label">Total Amount:</div>
                <div class="totals-value">$${(projectEstimate.estimatedPrice || projectEstimate.estimatedCost || 0).toLocaleString()}</div>
              </div>
            </div>
            
            <!-- ADDITIONAL NOTES -->
            ${projectEstimate.notes ? `
              <div class="notes-box">
                <div class="notes-title">Additional Notes</div>
                <div class="notes-text">${projectEstimate.notes}</div>
              </div>
            ` : ''}
            
            <!-- PROJECT TIMELINE -->
            ${projectEstimate.estimatedDuration || projectEstimate.targetYear ? `
              <div class="timeline-section">
                <div class="timeline-title">Project Timeline</div>
                <div class="timeline-grid">
                  ${projectEstimate.estimatedDuration ? `
                    <div class="timeline-item">
                      <div class="timeline-label">Estimated Duration:</div>
                      <div class="timeline-value">${projectEstimate.estimatedDuration}</div>
                    </div>
                  ` : ''}
                  ${projectEstimate.targetYear ? `
                    <div class="timeline-item">
                      <div class="timeline-label">Target Year:</div>
                      <div class="timeline-value">${projectEstimate.targetYear}</div>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}
            
            <!-- TERMS & CONDITIONS -->
            <div class="terms-box">
              <div class="terms-title">Terms & Conditions:</div>
              <div class="terms-text">
                This estimate is valid for 30 days from the date of issue. Actual costs may vary based on site conditions and material availability. A 50% deposit is required to begin work. Final payment is due upon project completion. All work will be performed in accordance with local building codes and regulations.
              </div>
            </div>
            
            <!-- FOOTER -->
            <div class="footer">
              <div class="footer-text">This estimate is valid for 30 days from the date of issue</div>
              <div class="footer-text">For questions or concerns, please contact DSJ Construction & Services LLC at info@dsjconstruction.com</div>
              <div class="footer-text" style="margin-top:10px;">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            
          </div>
        </body>
      </html>
    `;

    // PDF generation options with enhanced speed
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
      timeout: 30000, // Reduced timeout for faster generation
      renderDelay: 1000, // Reduced delay for faster generation
      phantomArgs: [
        '--load-images=yes', 
        '--local-to-remote-url-access=yes', 
        '--web-security=no',
        '--ignore-ssl-errors=yes',
        '--ssl-protocol=any'
      ],
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
