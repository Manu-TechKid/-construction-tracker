const User = require('../models/User');
const WorkOrder = require('../models/WorkOrder');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getAllWorkers = catchAsync(async (req, res, next) => {
    const workers = await User.find({ role: 'worker' })
        .select('-password')
        .populate('workerProfile.createdBy', 'name email')
        .populate('workerProfile.approvedBy', 'name email')
        .sort('-createdAt');
    
    res.status(200).json({
        status: 'success',
        results: workers.length,
        data: {
            workers
        }
    });
});

exports.getWorker = catchAsync(async (req, res, next) => {
    const worker = await User.findById(req.params.id)
        .select('-password')
        .populate('workerProfile.createdBy', 'name email')
        .populate('workerProfile.approvedBy', 'name email');
    
    if (!worker || worker.role !== 'worker') {
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
    const workerData = {
        ...req.body,
        role: 'worker',
        workerProfile: {
            ...req.body.workerProfile,
            createdBy: req.user.id,
            approvalStatus: 'approved'
        }
    };
    
    const newWorker = await User.create(workerData);
    
    res.status(201).json({
        status: 'success',
        data: {
            worker: newWorker
        }
    });
});

exports.updateWorker = catchAsync(async (req, res, next) => {
    const { name, email, phone, password, skills, paymentType, hourlyRate, contractRate, notes } = req.body;
    
    // Find the worker
    const worker = await User.findOne({ _id: req.params.id, role: 'worker' });
    
    if (!worker) {
        return next(new AppError('No worker found with that ID', 404));
    }

    // Update basic user info
    if (name) worker.name = name;
    if (email) worker.email = email;
    if (phone) worker.phone = phone;
    if (password) worker.password = password;

    // Initialize workerProfile if it doesn't exist
    if (!worker.workerProfile) {
        worker.workerProfile = {};
    }

    // Update worker profile fields
    if (skills !== undefined) worker.workerProfile.skills = skills;
    if (paymentType) worker.workerProfile.paymentType = paymentType;
    if (hourlyRate !== undefined) worker.workerProfile.hourlyRate = hourlyRate;
    if (contractRate !== undefined) worker.workerProfile.contractRate = contractRate;
    if (notes !== undefined) worker.workerProfile.notes = notes;

    // Save the updated worker
    const updatedWorker = await worker.save({ validateModifiedOnly: true });
    
    // Remove password from response
    updatedWorker.password = undefined;
    
    res.status(200).json({
        status: 'success',
        data: {
            worker: updatedWorker
        }
    });
});

exports.deleteWorker = catchAsync(async (req, res, next) => {
    // Prevent deletion of the current user
    if (req.user.id === req.params.id) {
        return next(new AppError('You cannot delete your own account', 400));
    }
    
    const worker = await User.findOneAndDelete({ 
        _id: req.params.id, 
        role: 'worker' 
    });
    
    if (!worker) {
        return next(new AppError('No worker found with that ID', 404));
    }
    
    // Remove worker from any assigned work orders
    await WorkOrder.updateMany(
        { 'assignedTo.worker': req.params.id },
        { $pull: { assignedTo: { worker: req.params.id } } }
    );
    
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
    
    const worker = await User.findOneAndUpdate(
        { _id: req.params.id, role: 'worker' },
        { 'workerProfile.skills': skills },
        {
            new: true,
            runValidators: true
        }
    ).select('-password');
    
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
    
    const worker = await User.findOneAndUpdate(
        { _id: req.params.id, role: 'worker' },
        { 'workerProfile.status': status },
        {
            new: true,
            runValidators: true
        }
    ).select('-password');
    
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
