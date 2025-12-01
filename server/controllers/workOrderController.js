const WorkOrder = require('../models/WorkOrder');
const Building = require('../models/Building');
const User = require('../models/User');
const WorkType = require('../models/WorkType');
const WorkSubType = require('../models/WorkSubType');

// @desc    Create a new work order
// @route   POST /api/v1/work-orders
// @access  Private
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createWorkOrder = catchAsync(async (req, res, next) => {
  const { title, description, building, scheduledDate } = req.body;

  if (!title || !description || !building || !scheduledDate) {
    return next(new AppError('Please provide all required fields: title, description, building, and scheduledDate.', 400));
  }

  const buildingExists = await Building.findById(building);
  if (!buildingExists) {
    return next(new AppError('Building not found.', 404));
  }

  const workOrderData = { ...req.body, createdBy: req.user._id };

  if (req.body.assignedTo && Array.isArray(req.body.assignedTo)) {
    workOrderData.assignedTo = req.body.assignedTo.map(workerId => ({ worker: workerId }));
  }

  const workOrder = await WorkOrder.create(workOrderData);

  res.status(201).json({ success: true, data: workOrder });
});

// @desc    Get all work orders
// @route   GET /api/v1/work-orders
// @access  Private
exports.getAllWorkOrders = catchAsync(async (req, res, next) => {
  const { status, billingStatus, buildingId, workerId, startDate, endDate } = req.query;
    
  const filter = {};
  if (status) filter.status = status;
  if (billingStatus) filter.billingStatus = billingStatus;
  if (buildingId) filter.building = buildingId;
  if (workerId) filter['assignedTo.worker'] = workerId;
    
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const workOrders = await WorkOrder.find(filter)
    .populate('building', 'name address')
    .populate('workType', 'name code color')
    .populate('workSubType', 'name code price estimatedDuration estimatedCost')
    .populate('assignedTo.worker', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
      
  res.status(200).json({ 
    success: true, 
    count: workOrders.length, 
    data: { workOrders } 
  });
});

// @desc    Get a single work order by ID
// @route   GET /api/v1/work-orders/:id
// @access  Private
exports.getWorkOrderById = catchAsync(async (req, res, next) => {
  const workOrder = await WorkOrder.findById(req.params.id)
    .populate('building', 'name address')
    .populate('workType', 'name code color')
    .populate('workSubType', 'name code price estimatedDuration estimatedCost')
    .populate('assignedTo.worker', 'name email')
    .populate('createdBy', 'name email');

  if (!workOrder) {
    return next(new AppError('Work order not found', 404));
  }

  res.status(200).json({ success: true, data: workOrder });
});

// @desc    Update a work order
// @route   PATCH /api/v1/work-orders/:id
// @access  Private
exports.updateWorkOrder = catchAsync(async (req, res, next) => {
  let workOrder = await WorkOrder.findById(req.params.id);

  if (!workOrder) {
    return next(new AppError('Work order not found', 404));
  }

  const updateData = { ...req.body, updatedBy: req.user._id };

  if (updateData.assignedTo && Array.isArray(updateData.assignedTo)) {
    updateData.assignedTo = updateData.assignedTo.map(workerId => ({ worker: workerId }));
  }

  workOrder = await WorkOrder.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: workOrder });
});

// @desc    Delete a work order
// @route   DELETE /api/v1/work-orders/:id
// @access  Private
exports.deleteWorkOrder = catchAsync(async (req, res, next) => {
  const workOrder = await WorkOrder.findById(req.params.id);

  if (!workOrder) {
    return next(new AppError('Work order not found', 404));
  }

  // Perform a soft delete
  workOrder.deleted = true;
  workOrder.deletedAt = new Date();
  await workOrder.save();

  res.status(204).json({ success: true, data: null });
});
