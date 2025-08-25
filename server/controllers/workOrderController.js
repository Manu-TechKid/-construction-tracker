const WorkOrder = require('../models/WorkOrder');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getAllWorkOrders = catchAsync(async (req, res, next) => {
    // Filtering
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    let query = WorkOrder.find(JSON.parse(queryStr));

    // Sorting
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }

    // Field limiting
    if (req.query.fields) {
        const fields = req.query.fields.split(',').join(' ');
        query = query.select(fields);
    } else {
        query = query.select('-__v');
    }

    // Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;
    
    query = query.skip(skip).limit(limit);

    // Execute query with error handling
    try {
        const workOrders = await query.populate('building assignedTo.worker createdBy');

        res.status(200).json({
            status: 'success',
            results: workOrders.length,
            data: {
                workOrders
            }
        });
    } catch (error) {
        console.error('Work orders query error:', error);
        res.status(200).json({
            status: 'success',
            results: 0,
            data: {
                workOrders: []
            }
        });
    }
});

exports.getWorkOrder = catchAsync(async (req, res, next) => {
    const workOrder = await WorkOrder.findById(req.params.id)
        .populate('building assignedTo.worker createdBy');
    
    if (!workOrder) {
        return next(new AppError('No work order found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            workOrder
        }
    });
});

exports.createWorkOrder = catchAsync(async (req, res, next) => {
    // Add the user who created the work order
    if (!req.body.createdBy) req.body.createdBy = req.user.id;
    
    const newWorkOrder = await WorkOrder.create(req.body);
    
    res.status(201).json({
        status: 'success',
        data: {
            workOrder: newWorkOrder
        }
    });
});

exports.updateWorkOrder = catchAsync(async (req, res, next) => {
    const workOrder = await WorkOrder.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
            new: true,
            runValidators: true
        }
    );
    
    if (!workOrder) {
        return next(new AppError('No work order found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            workOrder
        }
    });
});

exports.deleteWorkOrder = catchAsync(async (req, res, next) => {
    const workOrder = await WorkOrder.findByIdAndDelete(req.params.id);
    
    if (!workOrder) {
        return next(new AppError('No work order found with that ID', 404));
    }
    
    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Add a note to a work order
exports.addNote = catchAsync(async (req, res, next) => {
    const workOrder = await WorkOrder.findById(req.params.id);
    
    if (!workOrder) {
        return next(new AppError('No work order found with that ID', 404));
    }
    
    workOrder.notes.push({
        content: req.body.content,
        createdBy: req.user.id
    });
    
    await workOrder.save();
    
    res.status(200).json({
        status: 'success',
        data: {
            workOrder
        }
    });
});

// Report an issue with a work order
exports.reportIssue = catchAsync(async (req, res, next) => {
    const workOrder = await WorkOrder.findById(req.params.id);
    
    if (!workOrder) {
        return next(new AppError('No work order found with that ID', 404));
    }
    
    workOrder.issues.push({
        description: req.body.description,
        reportedBy: req.user.id
    });
    
    await workOrder.save();
    
    res.status(200).json({
        status: 'success',
        data: {
            workOrder
        }
    });
});

// Assign workers to a work order
exports.assignWorkers = catchAsync(async (req, res, next) => {
    const workOrder = await WorkOrder.findById(req.params.id);
    
    if (!workOrder) {
        return next(new AppError('No work order found with that ID', 404));
    }
    
    // Add new assignments
    const newAssignments = Array.isArray(req.body) ? req.body : [req.body];
    workOrder.assignedTo.push(...newAssignments);
    
    await workOrder.save();
    
    res.status(200).json({
        status: 'success',
        data: {
            workOrder
        }
    });
});

// Update work order status
exports.updateStatus = catchAsync(async (req, res, next) => {
    const { status } = req.body;
    
    if (!['pending', 'in_progress', 'completed', 'on_hold'].includes(status)) {
        return next(new AppError('Invalid status value', 400));
    }
    
    const workOrder = await WorkOrder.findByIdAndUpdate(
        req.params.id,
        { 
            status,
            ...(status === 'completed' && { completionDate: Date.now() })
        },
        {
            new: true,
            runValidators: true
        }
    );
    
    if (!workOrder) {
        return next(new AppError('No work order found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            workOrder
        }
    });
});
