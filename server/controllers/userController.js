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
    console.log('Creating worker with data:', req.body);
    console.log('User creating worker:', req.user.role, req.user.id);
    
    // Validate required fields first
    if (!req.body.name || !req.body.email) {
        return next(new AppError('Name and email are required', 400));
    }

    if (!req.body.password) {
        return next(new AppError('Password is required', 400));
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(req.body.email)) {
        return next(new AppError('Please provide a valid email address', 400));
    }

    // Check for duplicate email with case-insensitive search
    const existingUser = await User.findOne({ 
        email: { $regex: new RegExp('^' + req.body.email + '$', 'i') } 
    });
    if (existingUser) {
        return next(new AppError('A user with this email already exists', 400));
    }

    // Validate numeric fields
    const hourlyRate = req.body.workerProfile?.hourlyRate || req.body.hourlyRate;
    const contractRate = req.body.workerProfile?.contractRate || req.body.contractRate;
    
    if (hourlyRate && (isNaN(hourlyRate) || hourlyRate < 0)) {
        return next(new AppError('Hourly rate must be a valid positive number', 400));
    }
    
    if (contractRate && (isNaN(contractRate) || contractRate < 0)) {
        return next(new AppError('Contract rate must be a valid positive number', 400));
    }

    const workerData = {
        name: req.body.name.trim(),
        email: req.body.email.toLowerCase().trim(),
        phone: req.body.phone ? req.body.phone.trim() : undefined,
        role: 'worker',
        password: req.body.password,
        workerProfile: {
            skills: req.body.workerProfile?.skills || req.body.skills || [],
            paymentType: req.body.workerProfile?.paymentType || req.body.paymentType || 'hourly',
            hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
            contractRate: contractRate ? parseFloat(contractRate) : 0,
            status: req.body.workerProfile?.status || req.body.status || 'active',
            notes: req.body.workerProfile?.notes || req.body.notes || '',
            createdBy: req.user.id, // Employer who created this worker
            approvalStatus: 'approved' // Auto-approve employer-created workers
        }
    };
    
    try {
        const newWorker = await User.create(workerData);
        
        console.log('Worker created successfully:', newWorker._id);
        
        // Remove password from response
        newWorker.password = undefined;
        
        res.status(201).json({
            status: 'success',
            data: {
                worker: newWorker
            }
        });
    } catch (error) {
        console.error('Database error creating worker:', error);
        
        // Handle specific MongoDB errors
        if (error.code === 11000) {
            return next(new AppError('A user with this email already exists', 400));
        }
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return next(new AppError(`Validation error: ${messages.join(', ')}`, 400));
        }
        
        return next(new AppError('Failed to create worker. Please try again.', 500));
    }
});

// Update user
exports.updateUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    
    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }

    // Check for email uniqueness if email is being updated
    if (req.body.email && req.body.email !== user.email) {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return next(new AppError('A user with this email already exists', 400));
        }
    }
    
    // Update basic fields
    const allowedFields = ['name', 'email', 'phone', 'isActive'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            user[field] = req.body[field];
        }
    });

    // Update password if provided
    if (req.body.password) {
        user.password = req.body.password;
    }
    
    // Update worker profile if user is a worker
    if (user.role === 'worker') {
        // Handle both nested workerProfile and flat structure
        const workerData = req.body.workerProfile || req.body;
        const workerFields = ['skills', 'paymentType', 'hourlyRate', 'contractRate', 'status', 'notes'];
        
        workerFields.forEach(field => {
            if (workerData[field] !== undefined) {
                if (!user.workerProfile) {
                    user.workerProfile = {};
                }
                user.workerProfile[field] = workerData[field];
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
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return next(new AppError('No user found with that ID', 404));
        }

        // Prevent deletion of admin users
        if (user.role === 'admin') {
            return next(new AppError('Cannot delete admin users', 403));
        }

        // Prevent self-deletion
        if (req.user && req.user.id === req.params.id) {
            return next(new AppError('Cannot delete your own account', 403));
        }

        // Check for active work order assignments if user is a worker
        if (user.role === 'worker') {
            const activeAssignments = await WorkOrder.countDocuments({
                'assignedTo.worker': req.params.id,
                status: { $in: ['pending', 'in_progress'] }
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
    } catch (error) {
        console.error('Delete user error:', error);
        return next(new AppError('Failed to delete user', 500));
    }
});

// Get worker assignments
exports.getWorkerAssignments = catchAsync(async (req, res, next) => {
    const workerId = req.params.id;
    
    // Find work orders assigned to this worker
    const workOrders = await WorkOrder.find({
        'assignedTo.worker': workerId
    })
    .populate('building', 'name address city')
    .populate('assignedTo.worker', 'name email')
    .populate('createdBy', 'name email')
    .sort('-scheduledDate');
    
    // Calculate statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow
    
    const stats = {
        total: workOrders.length,
        pending: workOrders.filter(wo => wo.status === 'pending').length,
        inProgress: workOrders.filter(wo => wo.status === 'in_progress').length,
        completed: workOrders.filter(wo => wo.status === 'completed').length,
        completedToday: workOrders.filter(wo => {
            if (wo.status !== 'completed') return false;
            const updatedDate = new Date(wo.updatedAt);
            return updatedDate >= today && updatedDate < tomorrow;
        }).length
    };
    
    res.status(200).json({
        status: 'success',
        results: workOrders.length,
        data: {
            workOrders,
            stats
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
