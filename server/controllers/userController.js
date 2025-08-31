const User = require('../models/User');
const WorkOrder = require('../models/WorkOrder');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Get all users with optional role filtering
exports.getAllUsers = catchAsync(async (req, res, next) => {
    const { role, status, approvalStatus } = req.query;
    
    const filter = {};
    if (role) filter.role = role;
    if (status && role === 'worker') filter['workerProfile.status'] = status;
    if (approvalStatus && role === 'worker') filter['workerProfile.approvalStatus'] = approvalStatus;
    
    const users = await User.find(filter)
        .select('-password')
        .populate('workerProfile.createdBy', 'name email')
        .populate('workerProfile.approvedBy', 'name email')
        .sort('-createdAt');
    
    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    });
});

// Get all workers (users with role='worker')
exports.getAllWorkers = catchAsync(async (req, res, next) => {
    const { status, approvalStatus, skills } = req.query;
    
    const filter = { role: 'worker' };
    if (status) filter['workerProfile.status'] = status;
    if (approvalStatus) filter['workerProfile.approvalStatus'] = approvalStatus;
    if (skills) filter['workerProfile.skills'] = { $in: skills.split(',') };
    
    const workers = await User.find(filter)
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

// Get available workers for assignment
exports.getAvailableWorkers = catchAsync(async (req, res, next) => {
    const workers = await User.getAvailableWorkers();
    
    res.status(200).json({
        status: 'success',
        results: workers.length,
        data: {
            workers
        }
    });
});

// Get single user
exports.getUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id)
        .select('-password')
        .populate('workerProfile.createdBy', 'name email')
        .populate('workerProfile.approvedBy', 'name email');
    
    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

// Create worker (by employer)
exports.createWorker = catchAsync(async (req, res, next) => {
    const workerData = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        role: 'worker',
        password: req.body.password || 'TempPassword123!', // Temporary password
        workerProfile: {
            skills: req.body.skills || [],
            paymentType: req.body.paymentType || 'hourly',
            hourlyRate: req.body.hourlyRate,
            contractRate: req.body.contractRate,
            status: req.body.status || 'active',
            notes: req.body.notes,
            createdBy: req.user.id, // Employer who created this worker
            approvalStatus: 'approved' // Auto-approve employer-created workers
        }
    };
    
    const newWorker = await User.create(workerData);
    
    // Remove password from response
    newWorker.password = undefined;
    
    res.status(201).json({
        status: 'success',
        data: {
            worker: newWorker
        }
    });
});

// Update user
exports.updateUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    
    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }
    
    // Update basic fields
    const allowedFields = ['name', 'email', 'phone', 'isActive'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            user[field] = req.body[field];
        }
    });
    
    // Update worker profile if user is a worker
    if (user.role === 'worker' && req.body.workerProfile) {
        const workerFields = ['skills', 'paymentType', 'hourlyRate', 'contractRate', 'status', 'notes'];
        workerFields.forEach(field => {
            if (req.body.workerProfile[field] !== undefined) {
                user.workerProfile[field] = req.body.workerProfile[field];
            }
        });
    }
    
    await user.save();
    user.password = undefined;
    
    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

// Approve/reject worker (for self-registered workers)
exports.updateWorkerApproval = catchAsync(async (req, res, next) => {
    const { approvalStatus } = req.body;
    
    if (!['approved', 'rejected'].includes(approvalStatus)) {
        return next(new AppError('Invalid approval status', 400));
    }
    
    const worker = await User.findById(req.params.id);
    
    if (!worker || worker.role !== 'worker') {
        return next(new AppError('No worker found with that ID', 404));
    }
    
    worker.workerProfile.approvalStatus = approvalStatus;
    worker.workerProfile.approvedBy = req.user.id;
    worker.workerProfile.approvedAt = new Date();
    
    await worker.save();
    worker.password = undefined;
    
    res.status(200).json({
        status: 'success',
        data: {
            worker
        }
    });
});

// Delete user
exports.deleteUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    
    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }
    
    // Check if worker has active assignments
    if (user.role === 'worker') {
        const activeAssignments = await WorkOrder.countDocuments({
            'assignedTo.worker': user._id,
            'assignedTo.status': { $in: ['pending', 'in_progress'] }
        });
        
        if (activeAssignments > 0) {
            return next(new AppError('Cannot delete worker with active assignments', 400));
        }
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Get worker assignments
exports.getWorkerAssignments = catchAsync(async (req, res, next) => {
    const workOrders = await WorkOrder.find({
        'assignedTo.worker': req.params.id
    })
    .populate('building')
    .populate('assignedTo.worker', 'name email')
    .sort('-createdAt');
    
    res.status(200).json({
        status: 'success',
        results: workOrders.length,
        data: {
            workOrders
        }
    });
});

// Update worker skills
exports.updateWorkerSkills = catchAsync(async (req, res, next) => {
    const { skills } = req.body;
    
    if (!Array.isArray(skills)) {
        return next(new AppError('Skills must be an array', 400));
    }
    
    const worker = await User.findById(req.params.id);
    
    if (!worker || worker.role !== 'worker') {
        return next(new AppError('No worker found with that ID', 404));
    }
    
    worker.workerProfile.skills = skills;
    await worker.save();
    worker.password = undefined;
    
    res.status(200).json({
        status: 'success',
        data: {
            worker
        }
    });
});

// Update worker status
exports.updateWorkerStatus = catchAsync(async (req, res, next) => {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'on_leave'].includes(status)) {
        return next(new AppError('Invalid status value', 400));
    }
    
    const worker = await User.findById(req.params.id);
    
    if (!worker || worker.role !== 'worker') {
        return next(new AppError('No worker found with that ID', 404));
    }
    
    worker.workerProfile.status = status;
    await worker.save();
    worker.password = undefined;
    
    res.status(200).json({
        status: 'success',
        data: {
            worker
        }
    });
});

// Get current user
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Update current user
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email', 'phone');
  if (req.user.role === 'worker' && req.body.workerProfile) {
    filteredBody.workerProfile = filterObj(
      req.body.workerProfile,
      'skills',
      'paymentType',
      'hourlyRate',
      'contractRate',
      'notes'
    );
  }

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// Delete current user
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { isActive: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Create user (admin only)
exports.createUser = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  newUser.password = undefined;

  res.status(201).json({
    status: 'success',
    data: {
      user: newUser,
    },
  });
});

// Helper function to filter object
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
