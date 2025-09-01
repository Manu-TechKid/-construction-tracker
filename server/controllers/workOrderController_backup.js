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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filter object
  let filter = {};
  
  if (req.query.building) filter.building = req.query.building;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.workType) filter.workType = req.query.workType;
  
  // Filter by assigned worker
  if (req.query.assignedTo) {
    filter['assignedTo.worker'] = req.query.assignedTo;
  }

  // Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    filter.$or = [
      { description: searchRegex },
      { workSubType: searchRegex },
      { apartmentNumber: searchRegex },
      { block: searchRegex }
    ];
  }

  try {
    // Get total count for pagination
    const total = await WorkOrder.countDocuments(filter);

    // Get work orders with proper population and date handling
    const workOrders = await WorkOrder.find(filter)
      .populate('building', 'name address')
      .populate('assignedTo.worker', 'name email phone')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .maxTimeMS(30000)
      .lean(); // Use lean for better performance

    // Clean and validate dates in the response
    const cleanedWorkOrders = workOrders.map(wo => ({
      ...wo,
      // Ensure all dates are properly formatted or null
      scheduledDate: wo.scheduledDate ? new Date(wo.scheduledDate).toISOString() : null,
      estimatedCompletionDate: wo.estimatedCompletionDate ? new Date(wo.estimatedCompletionDate).toISOString() : null,
      actualCompletionDate: wo.actualCompletionDate ? new Date(wo.actualCompletionDate).toISOString() : null,
      createdAt: wo.createdAt ? new Date(wo.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: wo.updatedAt ? new Date(wo.updatedAt).toISOString() : new Date().toISOString(),
      // Ensure assignedTo is always an array
      assignedTo: Array.isArray(wo.assignedTo) ? wo.assignedTo : []
    }));

    res.status(200).json({
      status: 'success',
      results: cleanedWorkOrders.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: {
        workOrders: cleanedWorkOrders
      }
    });
  } catch (error) {
    console.error('Error in getAllWorkOrders:', error);
    
    // Return empty result instead of error to prevent UI crashes
    res.status(200).json({
      status: 'success',
      results: 0,
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0
      },
      data: {
        workOrders: []
      }
    });
  }
});

exports.getWorkOrder = catchAsync(async (req, res, next) => {
    const workOrder = await WorkOrder.findById(req.params.id)
        .populate({ 
            path: 'building', 
            select: 'name address city administrator administratorName' 
        })
        .populate({ 
            path: 'assignedTo.worker', 
            select: 'name email phone workerProfile.skills workerProfile.status' 
        })
        .populate({ 
            path: 'createdBy', 
            select: 'name email' 
        })
        .populate({ 
            path: 'updatedBy', 
            select: 'name email' 
        })
        .populate({ 
            path: 'completedBy', 
            select: 'name email' 
        });
    
    if (!workOrder) {
        return next(new AppError('No work order found with that ID', 404));
    }
    
    // Clean and format the response data
    const cleanedWorkOrder = {
        ...workOrder.toObject(),
        // Ensure all dates are properly formatted or null
        scheduledDate: workOrder.scheduledDate ? workOrder.scheduledDate.toISOString() : null,
        estimatedCompletionDate: workOrder.estimatedCompletionDate ? workOrder.estimatedCompletionDate.toISOString() : null,
        actualCompletionDate: workOrder.actualCompletionDate ? workOrder.actualCompletionDate.toISOString() : null,
        createdAt: workOrder.createdAt ? workOrder.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: workOrder.updatedAt ? workOrder.updatedAt.toISOString() : new Date().toISOString(),
        // Ensure assignedTo is always an array
        assignedTo: Array.isArray(workOrder.assignedTo) ? workOrder.assignedTo : [],
        // Ensure photos array exists
        photos: Array.isArray(workOrder.photos) ? workOrder.photos : [],
        // Ensure notes array exists
        notes: Array.isArray(workOrder.notes) ? workOrder.notes : [],
        // Ensure tasks array exists
        tasks: Array.isArray(workOrder.tasks) ? workOrder.tasks : []
    };
    
    res.status(200).json({
        status: 'success',
        data: cleanedWorkOrder
    });
});

exports.createWorkOrder = catchAsync(async (req, res, next) => {
  try {
    // 1) Basic validation
    const requiredFields = ['building', 'description'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return next(new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400));
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

    // 4) Process services array
    if (!Array.isArray(req.body.services) || req.body.services.length === 0) {
      return next(new AppError('At least one service is required', 400));
    }

    // Validate each service
    const validatedServices = [];
    for (const service of req.body.services) {
      if (!service.type) {
        return next(new AppError('Each service must have a type', 400));
      }
      
      validatedServices.push({
        type: service.type,
        description: service.description || '',
        laborCost: parseFloat(service.laborCost) || 0,
        materialCost: parseFloat(service.materialCost) || 0,
        status: 'pending',
        createdAt: new Date()
      });
    }

    // 5) Calculate total estimate
    const totalEstimate = validatedServices.reduce(
      (sum, service) => sum + service.laborCost + service.materialCost, 0
    );

    // 6) Process photos
    if (!req.body.photos) {
      req.body.photos = [];
    } else if (Array.isArray(req.body.photos)) {
      req.body.photos = req.body.photos
        .filter(photo => photo && typeof photo === 'string' && photo.trim() !== '')
        .map(photo => ({
          url: photo.trim(),
          uploadedBy: req.user.id,
          uploadedAt: new Date()
        }));
    } else {
      req.body.photos = [];
    }

    // 7) Process notes
    if (!Array.isArray(req.body.notes)) {
      req.body.notes = [];
    }
    
    req.body.notes = req.body.notes
      .filter(note => note && (typeof note === 'string' ? note.trim() : (note.content || '').trim()))
      .map(note => ({
        content: typeof note === 'string' ? note.trim() : (note.content || '').trim(),
        createdBy: req.user.id,
        createdAt: new Date(),
        isPrivate: !!note.isPrivate
      }));

    // 8) Set default status if not provided
    if (!req.body.status) {
      req.body.status = 'pending';
    }

    // 9) Process assigned workers
    if (req.body.assignedTo && !Array.isArray(req.body.assignedTo)) {
      req.body.assignedTo = [];
    } else if (Array.isArray(req.body.assignedTo)) {
      // Ensure assignedTo has the correct structure
      req.body.assignedTo = req.body.assignedTo
        .filter(workerId => mongoose.Types.ObjectId.isValid(workerId))
        .map(workerId => ({
          worker: workerId,
          assignedBy: req.user.id,
          assignedAt: new Date(),
          status: 'pending'
        }));
    }

    // 10) Create work order with services
    const workOrderData = {
      ...req.body,
      services: validatedServices,
      estimatedCost: totalEstimate,
      actualCost: 0 // Initialize actual cost
    };

    const workOrder = await WorkOrder.create(workOrderData);

    // 11) Populate response data
    const populatedWorkOrder = await WorkOrder.findById(workOrder._id)
      .populate({ 
        path: 'building', 
        select: 'name address city'
      })
      .populate({
        path: 'assignedTo.worker',
        select: 'name email phone'
      });

    res.status(201).json({
      status: 'success',
      data: {
        workOrder: populatedWorkOrder
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return next(new AppError(`Validation error: ${messages.join('. ')}`, 400));
    }
    if (error.code === 11000) {
      return next(new AppError('Duplicate field value entered', 400));
    }
    next(error);
  }
});

exports.updateWorkOrder = catchAsync(async (req, res, next) => {
    try {
        // 1) Find the work order
       const workOrder = await WorkOrder.findById(req.params.id);
        if (!workOrder) {
            return next(new AppError('No work order found with that ID', 404));
        }

        // 2) Check if building exists if being updated
        if (req.body.building) {
          const building = await Building.findById(req.body.building);
          if (!building) {
            return next(new AppError('No building found with that ID', 404));
          }
        }

        // 3) Process updates
        const updateFields = [
            'title', 'description', 'apartmentNumber', 'block', 'apartmentStatus',
            'workType', 'workSubType', 'priority', 'status', 'estimatedCost',
            'actualCost', 'scheduledDate', 'requireInspection', 'inspectionNotes'
        ];

        updateFields.forEach(field => {
            if (req.body[field]) {
                workOrder[field] = req.body[field];
            }
        });

        // 4) Update photos
        if (req.body.photos) {
            if (!Array.isArray(req.body.photos)) {
                req.body.photos = [];
            }
            workOrder.photos = req.body.photos
                .filter(photo => photo && typeof photo === 'string' && photo.trim() !== '')
                .map(photo => ({
                    url: photo.trim(),
                    uploadedBy: req.user.id,
                    uploadedAt: new Date()
                }));
        } else {
            workOrder.photos = [];
        }

        // 5) Handle notes updates
        if (req.body.notes) {
            if (!Array.isArray(req.body.notes)) {
                req.body.notes = [];
            }
            workOrder.notes = req.body.notes
                .filter(note => note && (typeof note === 'string' ? note.trim() : (note.content || '').trim()))
                .map(note => ({
                    content: typeof note === 'string' ? note.trim() : (note.content || '').trim(),
                    createdBy: req.user.id,
                    createdAt: new Date(),
                    isPrivate: !!note.isPrivate
                }));
        }

        // 6) Handle assigned workers updates
        if (req.body.assignedTo) {
            if (!Array.isArray(req.body.assignedTo)) {
                req.body.assignedTo = [];
            }
            workOrder.assignedTo = req.body.assignedTo
                .filter(workerId => mongoose.Types.ObjectId.isValid(workerId))
                .map(workerId => ({
                    worker: workerId,
                    assignedBy: req.user.id,
                    assignedAt: new Date(),
                    status: 'pending'
                }));
        }

        // 7) Set updatedBy
        workOrder.updatedBy = req.user.id;
        workOrder.updatedAt = new Date();

        // 8) Save the updated work order
        await workOrder.save();

        // 9) Populate response data
        const populatedWorkOrder = await WorkOrder.findById(workOrder._id)
            .populate({ 
                path: 'building', 
                select: 'name address city'
            })
            .populate({
                path: 'assignedTo.worker',
                select: 'name email phone'
            })
            .populate({ 
                path: 'updatedBy', 
                select: 'name email'
            });

        res.status(200).json({
            status: 'success',
            data: {
                workOrder: populatedWorkOrder
            }
        });

    } catch (error) {
        console.error('Work order update error:', error);
        next(new AppError('Failed to update work order. Please try again.', 500));
    }
});

exports.deleteWorkOrder = catchAsync(async (req, res, next) => {
    try {
        // 1) Find the work order
        const workOrder = await WorkOrder.findById(req.params.id);
        
        if (!workOrder) {
            return next(new AppError('No work order found with that ID', 404));
        }

        // 2) Check if the work order is already marked as deleted
        if (workOrder.isDeleted) {
            return next(new AppError('This work order has already been deleted', 400));
        }

        // 3) Perform soft delete (mark as deleted instead of removing from database)
        workOrder.isDeleted = true;
        workOrder.deletedAt = new Date();
        workOrder.deletedBy = req.user.id;
        
        // 4) Save the updated work order
        await workOrder.save();

        // 5) Optionally: Clean up related data (e.g., remove from worker assignments)
        // This is a soft delete, so we're just updating the status
        // If you need to clean up related data, add that logic here

        res.status(204).json({
            status: 'success',
            data: null
        });

    } catch (error) {
        console.error('Work order deletion error:', error);
        
        if (error.name === 'CastError') {
            return next(new AppError('Invalid work order ID format', 400));
        }
        
        next(new AppError('Failed to delete work order. Please try again.', 500));
    }
});

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

exports.assignWorkers = catchAsync(async (req, res, next) => {
  const { workers, scheduledDate } = req.body;
  
  if (!workers || !Array.isArray(workers) || workers.length === 0) {
    return next(new AppError('Workers array is required', 400));
  }
  
  const workOrder = await WorkOrder.findById(req.params.id);
  
  if (!workOrder) {
    return next(new AppError('No work order found with that ID', 404));
  }
  
  // Clear existing assignments
  workOrder.assignedTo = [];
  
  // Add new assignments with proper structure matching WorkOrder model
  workers.forEach(assignment => {
    workOrder.assignedTo.push({
      worker: assignment.worker || assignment._id,
      assignedAt: new Date(),
      assignedBy: req.user.id,
      status: assignment.status || 'pending',
      notes: assignment.notes || '',
      completedAt: null
    });
  });
  
  // Set scheduled date if provided
  if (scheduledDate) {
    workOrder.scheduledDate = new Date(scheduledDate);
  }
  
  await workOrder.save();
  
  // Populate worker details for response
  await workOrder.populate('assignedTo.worker', 'name email phone workerProfile.skills');
  await workOrder.populate('building', 'name address');
  
  res.status(200).json({
    status: 'success',
    data: {
      workOrder
    }
  });
});

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

exports.deletePhotoFromWorkOrder = catchAsync(async (req, res, next) => {
  const { id, photoId } = req.params;
  const workOrder = await WorkOrder.findById(id);
  if (!workOrder) return next(new AppError('Work order not found', 404));

  // If we stored publicId in the future, we can also call Cloudinary destroy here
  workOrder.photos.id(photoId)?.remove();
  await workOrder.save();

  res.json({ status: 'success', data: workOrder });
});

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
