const Worker = require('../models/Worker');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getAllWorkers = catchAsync(async (req, res, next) => {
    const workers = await Worker.find();
    
    res.status(200).json({
        status: 'success',
        results: workers.length,
        data: {
            workers
        }
    });
});

exports.getWorker = catchAsync(async (req, res, next) => {
    const worker = await Worker.findById(req.params.id);
    
    if (!worker) {
        return next(new AppError('No worker found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            worker
        }
    });
});

exports.createWorker = catchAsync(async (req, res, next) => {
    const newWorker = await Worker.create(req.body);
    
    res.status(201).json({
        status: 'success',
        data: {
            worker: newWorker
        }
    });
});

exports.updateWorker = catchAsync(async (req, res, next) => {
    const worker = await Worker.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
            new: true,
            runValidators: true
        }
    );
    
    if (!worker) {
        return next(new AppError('No worker found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            worker
        }
    });
});

exports.deleteWorker = catchAsync(async (req, res, next) => {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    
    if (!worker) {
        return next(new AppError('No worker found with that ID', 404));
    }
    
    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Get all work orders assigned to a worker
exports.getWorkerAssignments = catchAsync(async (req, res, next) => {
    const workOrders = await WorkOrder.find({
        'assignedTo.worker': req.params.id,
        status: { $ne: 'completed' }
    })
    .populate('building')
    .sort('-createdAt');
    
    res.status(200).json({
        status: 'success',
        results: workOrders.length,
        data: {
            workOrders
        }
    });
});

// Update worker's skills
exports.updateWorkerSkills = catchAsync(async (req, res, next) => {
    const { skills } = req.body;
    
    if (!Array.isArray(skills)) {
        return next(new AppError('Skills must be an array', 400));
    }
    
    const worker = await Worker.findByIdAndUpdate(
        req.params.id,
        { skills },
        {
            new: true,
            runValidators: true
        }
    );
    
    if (!worker) {
        return next(new AppError('No worker found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            worker
        }
    });
});

// Update worker's status
exports.updateWorkerStatus = catchAsync(async (req, res, next) => {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'on_leave'].includes(status)) {
        return next(new AppError('Invalid status value', 400));
    }
    
    const worker = await Worker.findByIdAndUpdate(
        req.params.id,
        { status },
        {
            new: true,
            runValidators: true
        }
    );
    
    if (!worker) {
        return next(new AppError('No worker found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            worker
        }
    });
});
