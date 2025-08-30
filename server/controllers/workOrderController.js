const WorkOrder = require('../models/WorkOrder');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Building = require('../models/Building');
const User = require('../models/User');

// Helper function to validate work type
const isValidWorkType = (type) => {
  const validTypes = [
    'painting', 'cleaning', 'repairs', 'maintenance', 
    'inspection', 'other', 'plumbing', 'electrical', 
    'hvac', 'flooring', 'roofing', 'carpentry'
  ];
  return validTypes.includes(type.toLowerCase());
};

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
        const workOrders = await query
            .populate('building', 'name address')
            .populate('createdBy', 'name email');

        // Get total count for pagination
        const total = await WorkOrder.countDocuments(JSON.parse(queryStr));

        res.status(200).json({
            status: 'success',
            results: workOrders.length,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            data: {
                workOrders
            }
        });
    } catch (error) {
        console.error('Work orders query error:', error);
        // Return empty results with error info for debugging
        res.status(200).json({
            status: 'success',
            results: 0,
            error: error.message,
            data: {
                workOrders: []
            }
        });
    }
});

exports.getWorkOrder = catchAsync(async (req, res, next) => {
    const workOrder = await WorkOrder.findById(req.params.id)
        .populate({ path: 'building', select: 'name address' })
        .populate({ path: 'createdBy', select: 'name email' });
    
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
  try {
    // 1) Basic validation
    if (!req.body.building) {
      return next(new AppError('Building ID is required', 400));
    }

    // 2) Check if building exists
    const building = await Building.findById(req.body.building);
    if (!building) {
      return next(new AppError('No building found with that ID', 404));
    }

    // 3) Set createdBy if not provided
    if (!req.body.createdBy) {
      req.body.createdBy = req.user.id;
    }

    // 4) Process photos
    if (!req.body.photos) {
      req.body.photos = [];
    } else if (Array.isArray(req.body.photos)) {
      req.body.photos = req.body.photos
        .filter(photo => photo && typeof photo === 'string' && photo.trim() !== '')
        .map(photo => photo.trim());
    } else {
      req.body.photos = [];
    }

    // 5) Process notes
    if (!Array.isArray(req.body.notes)) {
      req.body.notes = [];
    }
    
    req.body.notes = req.body.notes
      .map(note => ({
        content: typeof note === 'string' ? note.trim() : (note.content || '').trim(),
        createdBy: req.user.id,
        createdAt: new Date(),
        isPrivate: !!note.isPrivate
      }))
      .filter(note => note.content);

    // 6) Normalize and validate workType
    if (req.body.workType) {
      req.body.workType = req.body.workType.toLowerCase();
      if (!isValidWorkType(req.body.workType)) {
        return next(new AppError('Invalid work type', 400));
      }
    }

    // 7) Apply pricing based on apartment status
    if (req.body.apartmentStatus && req.body.estimatedCost) {
      const baseCost = parseFloat(req.body.estimatedCost);
      if (!isNaN(baseCost)) {
        const multipliers = {
          occupied: 1.2,
          under_renovation: 1.15,
          reserved: 1.1,
          vacant: 1.0
        };
        
        const multiplier = multipliers[req.body.apartmentStatus] || 1.0;
        req.body.estimatedCost = Math.round(baseCost * multiplier * 100) / 100;
      }
    }

    // 8) Create work order
    const workOrder = await WorkOrder.create(req.body);

    // 9) Populate response data
    const populatedWorkOrder = await WorkOrder.findById(workOrder._id)
      .populate({ path: 'building', select: 'name address' })
      .populate({ path: 'createdBy', select: 'name email' });

    res.status(201).json({
      status: 'success',
      data: {
        workOrder: populatedWorkOrder
      }
    });

  } catch (error) {
    console.error('Work order creation error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return next(new AppError(`Validation Error: ${errors.join(', ')}`, 400));
    }
    
    if (error.code === 11000) {
      return next(new AppError('Duplicate work order detected', 400));
    }
    
    next(error);
  }
});

exports.updateWorkOrder = catchAsync(async (req, res, next) => {
    try {
        // Validate photos array if present
        if (req.body.photos && Array.isArray(req.body.photos)) {
            req.body.photos = req.body.photos.filter(photo => photo && photo.trim() !== '');
        }
        
        const workOrder = await WorkOrder.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        ).populate({ path: 'building', select: 'name address' })
        .populate({ path: 'createdBy', select: 'name email' });
        
        if (!workOrder) {
            return next(new AppError('No work order found with that ID', 404));
        }
        
        res.status(200).json({
            status: 'success',
            data: {
                workOrder
            }
        });
    } catch (error) {
        console.error('Work order update error:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return next(new AppError(`Validation Error: ${errors.join(', ')}`, 400));
        }
        
        return next(new AppError('Failed to update work order', 500));
    }
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

// Get form data for creating work orders
exports.getWorkOrderFormData = catchAsync(async (req, res, next) => {
    const buildings = await Building.find({ status: 'active' }).select('name address');
    const workers = await User.find({ role: { $in: ['worker', 'supervisor'] } }).select('name email role');
    
    res.status(200).json({
        status: 'success',
        data: {
            buildings,
            workers,
            workTypes: [
                'Plumbing',
                'Electrical',
                'HVAC',
                'Painting',
                'Flooring',
                'Roofing',
                'Carpentry',
                'Maintenance',
                'Cleaning',
                'Other'
            ],
            priorities: ['low', 'medium', 'high', 'urgent']
        }
    });
});

// Add a note to work order
exports.addNoteToWorkOrder = catchAsync(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { type, title, description, priority } = req.body;

        const workOrder = await WorkOrder.findById(id);
        if (!workOrder) {
            return next(new AppError('Work order not found', 404));
        }

        const note = {
            type,
            title,
            description,
            priority,
            author: req.user.name || req.user.email,
            timestamp: new Date()
        };

        workOrder.notes.push(note);
        await workOrder.save();

        res.status(201).json({
            status: 'success',
            data: workOrder
        });
    } catch (error) {
        console.error('Error adding note to work order:', error);
        next(new AppError('Server error', 500));
    }
});

// Update a note in work order
exports.updateNoteInWorkOrder = catchAsync(async (req, res, next) => {
    try {
        const { id, noteId } = req.params;
        const { type, title, description, priority } = req.body;

        const workOrder = await WorkOrder.findById(id);
        if (!workOrder) {
            return next(new AppError('Work order not found', 404));
        }

        const note = workOrder.notes.id(noteId);
        if (!note) {
            return next(new AppError('Note not found', 404));
        }

        note.type = type;
        note.title = title;
        note.description = description;
        note.priority = priority;

        await workOrder.save();

        res.json({
            status: 'success',
            data: workOrder
        });
    } catch (error) {
        console.error('Error updating note in work order:', error);
        next(new AppError('Server error', 500));
    }
});

// Delete a note from work order
exports.deleteNoteFromWorkOrder = catchAsync(async (req, res, next) => {
    try {
        const { id, noteId } = req.params;

        const workOrder = await WorkOrder.findById(id);
        if (!workOrder) {
            return next(new AppError('Work order not found', 404));
        }

        workOrder.notes.pull(noteId);
        await workOrder.save();

        res.json({
            status: 'success',
            data: workOrder
        });
    } catch (error) {
        console.error('Error deleting note from work order:', error);
        next(new AppError('Server error', 500));
    }
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

// Add photo metadata to a work order after uploading to Cloudinary
exports.addPhotoToWorkOrder = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { url, thumbnailUrl, publicId, caption, type } = req.body;

  const workOrder = await WorkOrder.findById(id);
  if (!workOrder) return next(new AppError('Work order not found', 404));

  const photo = {
    url,
    caption,
    uploadedBy: req.user && req.user.id,
    uploadedAt: new Date(),
    type: type || 'other',
  };

  // Ensure duplicates aren't added accidentally
  const exists = workOrder.photos.some((p) => p.url === url);
  if (!exists) workOrder.photos.push(photo);
  await workOrder.save();

  res.status(201).json({ status: 'success', data: workOrder });
});

// Remove photo metadata from a work order (optionally also delete in Cloudinary by publicId)
exports.deletePhotoFromWorkOrder = catchAsync(async (req, res, next) => {
  const { id, photoId } = req.params;
  const workOrder = await WorkOrder.findById(id);
  if (!workOrder) return next(new AppError('Work order not found', 404));

  // If we stored publicId in the future, we can also call Cloudinary destroy here
  workOrder.photos.id(photoId)?.remove();
  await workOrder.save();

  res.json({ status: 'success', data: workOrder });
});

// Update work order task checklist
exports.updateTaskChecklist = catchAsync(async (req, res, next) => {
  const { taskId, completed, notes } = req.body;
  
  const workOrder = await WorkOrder.findById(req.params.id);
  
  if (!workOrder) {
    return next(new AppError('No work order found with that ID', 404));
  }
  
  const task = workOrder.taskChecklist.id(taskId);
  if (!task) {
    return next(new AppError('Task not found', 404));
  }
  
  task.completed = completed;
  task.notes = notes || task.notes;
  
  if (completed) {
    task.completedBy = req.user.id;
    task.completedAt = new Date();
  } else {
    task.completedBy = undefined;
    task.completedAt = undefined;
  }
  
  await workOrder.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      workOrder
    }
  });
});

// Add task to checklist
exports.addTaskToChecklist = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;
  
  const workOrder = await WorkOrder.findById(req.params.id);
  
  if (!workOrder) {
    return next(new AppError('No work order found with that ID', 404));
  }
  
  workOrder.taskChecklist.push({
    name,
    description,
    completed: false
  });
  
  await workOrder.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      workOrder
    }
  });
});

// Get worker assignments for a work order
exports.getWorkerAssignments = catchAsync(async (req, res, next) => {
  const workOrder = await WorkOrder.findById(req.params.id)
    .populate({ path: 'assignedTo.worker', select: 'name email phone' });
  
  if (!workOrder) {
    return next(new AppError('No work order found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      assignments: workOrder.assignedTo
    }
  });
});

// Assign workers to work order
exports.assignWorkers = catchAsync(async (req, res, next) => {
  const { workers } = req.body; // Array of { worker, scheduledDate, scheduledTime, hourlyRate, contractAmount }
  
  const workOrder = await WorkOrder.findById(req.params.id);
  
  if (!workOrder) {
    return next(new AppError('No work order found with that ID', 404));
  }
  
  // Clear existing assignments
  workOrder.assignedTo = [];
  
  // Add new assignments
  workers.forEach(assignment => {
    workOrder.assignedTo.push({
      worker: assignment.worker,
      scheduledDate: assignment.scheduledDate,
      scheduledTime: assignment.scheduledTime,
      hourlyRate: assignment.hourlyRate,
      contractAmount: assignment.contractAmount,
      paymentType: assignment.paymentType || 'hourly',
      assignedDate: new Date()
    });
  });
  
  await workOrder.save();
  
  await workOrder.populate({ path: 'assignedTo.worker', select: 'name email phone' });
  
  res.status(200).json({
    status: 'success',
    data: {
      workOrder
    }
  });
});
