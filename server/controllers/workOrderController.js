const WorkOrder = require('../models/WorkOrder');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Building = require('../models/Building');
const User = require('../models/User');
const APIFeatures = require('../utils/apiFeatures');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { sendWorkOrderAssignedEmail } = require('../services/emailService');

/**
 * Validate work type against allowed types
 * @param {string} type - The work type to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidWorkType = (type) => {
  const validTypes = [
    'painting', 'cleaning', 'repair', 'maintenance', 
    'inspection', 'other', 'plumbing', 'electrical', 
    'hvac', 'flooring', 'roofing', 'carpentry'
  ];
  return validTypes.includes(type.toLowerCase());
};

/**
 * Process work order services data
 * @param {Array} services - Array of service objects
 * @returns {Array} - Processed services array
 */
const processServices = (services = []) => {
  return services.map(service => ({
    type: service.type,
    description: service.description,
    laborCost: parseFloat(service.laborCost) || 0,
    materialCost: parseFloat(service.materialCost) || 0,
    status: service.status || 'pending'
  }));
};

/**
 * Process work order assignments
 * @param {Array} assignedTo - Array of worker assignments
 * @param {Object} user - The user making the assignment
 * @returns {Array} - Processed assignments array
 */
const processAssignments = (assignedTo = [], user) => {
  return assignedTo.map(workerId => ({
    worker: workerId,
    assignedBy: user._id,
    status: 'pending',
    assignedAt: new Date(),
    timeSpent: {
      hours: 0,
      minutes: 0
    },
    materials: []
  }));
};

/**
 * @desc    Get all work orders with filtering, sorting, and pagination
 * @route   GET /api/v1/work-orders
 * @access  Private
 */
exports.getAllWorkOrders = catchAsync(async (req, res, next) => {
  try {
    // 1) Build query
    const features = new APIFeatures(
      WorkOrder.find(),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // 2) Execute query
    const workOrders = await features.query;
    const total = await WorkOrder.countDocuments(features.query.getFilter());
    const { page, limit } = features.queryString;

    // 3) Send response
    res.status(200).json({
      status: 'success',
      results: workOrders.length,
      pagination: {
        page: page * 1 || 1,
        limit: limit * 1 || 10,
        total,
        pages: Math.ceil(total / (limit * 1 || 10))
      },
      data: {
        workOrders
      }
    });
  } catch (error) {
    console.error('Error in getAllWorkOrders:', error);
    next(new AppError('Error retrieving work orders', 500));
  }
});

/**
 * @desc    Get a single work order by ID
 * @route   GET /api/v1/work-orders/:id
 * @access  Private
 */
exports.getWorkOrder = catchAsync(async (req, res, next) => {
  try {
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
  } catch (error) {
    console.error('Error in getWorkOrder:', error);
    next(new AppError('Error retrieving work order', 500));
  }
});

/**
 * @desc    Create a new work order
 * @route   POST /api/v1/work-orders
 * @access  Private
 */
exports.createWorkOrder = catchAsync(async (req, res, next) => {
  try {
    // 1) Parse JSON fields if they are strings (happens with FormData)
    if (typeof req.body.services === 'string') {
      try {
        req.body.services = JSON.parse(req.body.services);
      } catch (e) {
        return next(new AppError('Invalid services format', 400));
      }
    }
    
    if (req.body.assignedTo && typeof req.body.assignedTo === 'string') {
      try {
        req.body.assignedTo = JSON.parse(req.body.assignedTo);
      } catch (e) {
        return next(new AppError('Invalid assignedTo format', 400));
      }
    }
    
    // 2) Validate required fields
    const requiredFields = ['building', 'description', 'services'];
    const missingFields = requiredFields.filter(field => {
      return !req.body[field] || (Array.isArray(req.body[field]) && req.body[field].length === 0);
    });
    
    if (missingFields.length > 0) {
      return next(new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400));
    }
    
    // 3) Validate services array
    if (!Array.isArray(req.body.services) || req.body.services.length === 0) {
      return next(new AppError('At least one service is required', 400));
    }
    
    // 4) Process services with validation
    const processedServices = processServices(req.body.services);
    
    // 5) Process worker assignments
    const workerAssignments = processAssignments(req.body.assignedTo || [], req.user);
    
    // 6) Create work order data with proper field mapping
    const newWorkOrderData = {
      building: req.body.building,
      apartmentNumber: req.body.apartmentNumber,
      block: req.body.block,
      description: req.body.description,
      priority: req.body.priority || 'medium',
      status: req.body.status || 'pending',
      services: processedServices,
      assignedTo: workerAssignments,
      createdBy: req.user._id,
      scheduledDate: req.body.scheduledDate,
      estimatedCompletionDate: req.body.estimatedCompletionDate,
      notes: req.body.notes || [],
      apartmentStatus: req.body.apartmentStatus || 'occupied',
      isEmergency: req.body.isEmergency === 'true' || req.body.isEmergency === true
    };
    
    // 7) Handle file uploads if any
    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(file => 
          uploadToCloudinary(file, 'work-orders')
        );
        const uploadedPhotos = await Promise.all(uploadPromises);
        newWorkOrderData.photos = (req.body.existingPhotos || []).concat(uploadedPhotos);
      } catch (error) {
        console.error('Error uploading files:', error);
        return next(new AppError('Error uploading one or more files', 500));
      }
    } else if (req.body.existingPhotos) {
      newWorkOrderData.photos = req.body.existingPhotos;
    }
    
    // 5) Create work order
    const createdWorkOrder = await WorkOrder.create(newWorkOrderData);
    
    // 6) Send notifications to assigned workers
    try {
      await Promise.all(
        workerAssignments.map(assignment => 
          sendWorkOrderAssignedEmail(assignment.worker, createdWorkOrder, req.user)
        )
      );
    } catch (emailError) {
      console.error('Error sending work order assignment emails:', emailError);
      // Don't fail the request if email sending fails
    }
    
    // 7) Send response
    res.status(201).json({
      status: 'success',
      data: {
        workOrder
      }
    });
    
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

    // 10) Process services and calculate costs
    const updatedServices = processServices(req.body.services);
    
    // 11) Process worker assignments
    const updatedAssignments = req.body.assignedTo && Array.isArray(req.body.assignedTo)
      ? processAssignments(req.body.assignedTo, req.user)
      : [];
    
    // 12) Calculate total estimated cost
    const totalEstimatedCost = updatedServices.reduce((total, service) => {
      return total + (service.laborCost || 0) + (service.materialCost || 0);
    }, 0);
    
    // 13) Create work order data
    const updatedWorkOrderData = {
      building: req.body.building,
      description: req.body.description,
      priority: req.body.priority || 'medium',
      status: 'pending',
      services: updatedServices,
      assignedTo: updatedAssignments,
      estimatedCost: totalEstimatedCost,
      actualCost: 0,
      createdBy: req.user.id,
      updatedBy: req.user.id,
      scheduledDate: req.body.scheduledDate || new Date(),
      requiresInspection: req.body.requiresInspection || false,
      inspectionNotes: req.body.inspectionNotes || '',
      block: req.body.block || '',
      apartmentNumber: req.body.apartmentNumber || '',
      apartmentStatus: req.body.apartmentStatus || 'occupied'
    };

    const updatedWorkOrder = await WorkOrder.create(updatedWorkOrderData);

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

/**
 * @desc    Update a work order
 * @route   PATCH /api/v1/work-orders/:id
 * @access  Private (admin, manager, supervisor, assigned worker)
 */
exports.updateWorkOrder = catchAsync(async (req, res, next) => {
  try {
    // 1) Find work order and check if it exists
    let workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // 2) Parse JSON fields if they are strings (happens with FormData)
    if (req.body.services && typeof req.body.services === 'string') {
      try {
        req.body.services = JSON.parse(req.body.services);
      } catch (e) {
        return next(new AppError('Invalid services format', 400));
      }
    }
    
    if (req.body.assignedTo && typeof req.body.assignedTo === 'string') {
      try {
        req.body.assignedTo = JSON.parse(req.body.assignedTo);
      } catch (e) {
        return next(new AppError('Invalid assignedTo format', 400));
      }
    }
    
    // 3) Check if user has permission to update
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isAssignedWorker = workOrder.assignedTo.some(
      assignment => assignment.worker.toString() === req.user._id.toString()
    );
    
    if (!isAdmin && !isAssignedWorker) {
      return next(new AppError('You do not have permission to update this work order', 403));
    }
    
    // 4) Process updates with proper field mapping
    const updateData = {};
    
    // Map allowed fields that can be updated
    const allowedFields = [
      'title', 'apartmentNumber', 'block', 'description', 'priority', 'status',
      'scheduledDate', 'estimatedCompletionDate', 'notes', 'apartmentStatus',
      'isEmergency', 'building'
    ];
    
    // Copy allowed fields from request body to updateData
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    // Ensure we're not updating with empty objects/arrays
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '' || updateData[key] === null || 
          (Array.isArray(updateData[key]) && updateData[key].length === 0)) {
        delete updateData[key];
      }
    });
    
    // Process services if provided
    if (req.body.services) {
      if (!Array.isArray(req.body.services) || req.body.services.length === 0) {
        return next(new AppError('At least one service is required', 400));
      }
      updateData.services = processServices(req.body.services);
    }
    
    // Process assignments if provided (only for admins/managers)
    if (req.body.assignedTo && (isAdmin || req.user.role === 'supervisor')) {
      updateData.assignedTo = processAssignments(
        req.body.assignedTo, 
        req.user
      );
    }
    
    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(file => 
          uploadToCloudinary(file, 'work-orders')
        );
        const existingPhotos = req.body.existingPhotos 
          ? JSON.parse(req.body.existingPhotos) 
          : workOrder.photos || [];
        const newPhotos = await Promise.all(uploadPromises);
        updateData.photos = [...existingPhotos, ...newPhotos];
      } catch (error) {
        console.error('Error uploading files:', error);
        return next(new AppError('Error uploading one or more files', 500));
      }
    } else if (req.body.existingPhotos) {
      updateData.photos = JSON.parse(req.body.existingPhotos);
    }
    
    // 5) Update work order
    const updatedWorkOrder = await WorkOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('building', 'name address')
     .populate('assignedTo.worker', 'name email phone');
    
    // 6) Check if new workers were assigned and notify them
    if (req.body.assignedTo) {
      const newWorkerIds = req.body.assignedTo.map(id => id.toString());
      const existingWorkerIds = workOrder.assignedTo
        .map(a => a.worker._id.toString());
      
      const newlyAssigned = newWorkerIds.filter(id => 
        !existingWorkerIds.includes(id)
      );
      
      if (newlyAssigned.length > 0 && (isAdmin || req.user.role === 'supervisor')) {
        try {
          await Promise.all(
            newlyAssigned.map(workerId => 
              sendWorkOrderAssignedEmail(workerId, updatedWorkOrder, req.user)
            )
          );
        } catch (emailError) {
          console.error('Error sending assignment emails:', emailError);
          // Don't fail the request if email sending fails
        }
      }
    }
    
    // 6) Send response with updated work order data
    res.status(200).json({
      status: 'success',
      data: {
        workOrder: updatedWorkOrder
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

/**
 * @desc    Delete a work order (soft delete)
 * @route   DELETE /api/v1/work-orders/:id
 * @access  Private
 */
exports.deleteWorkOrder = catchAsync(async (req, res, next) => {
  try {
    // 1) Find the work order
    const workOrder = await WorkOrder.findById(req.params.id);
    
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // 2) Check if user has permission to delete
    if (workOrder.createdBy.toString() !== req.user._id.toString() && 
        !req.user.roles.includes('admin')) {
      return next(
        new AppError('You do not have permission to delete this work order', 403)
      );
    }
    
    // 3) Check if work order is in progress
    if (workOrder.status === 'in_progress') {
      return next(
        new AppError('Cannot delete a work order that is in progress', 400)
      );
    }
    
    // 4) Soft delete the work order
    workOrder.isDeleted = true;
    workOrder.deletedAt = new Date();
    workOrder.deletedBy = req.user._id;
    
    await workOrder.save({ validateBeforeSave: false });
    
    // 5) Send response
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Error in deleteWorkOrder:', error);
    next(new AppError('Error deleting work order', 500));
  }
});

/**
 * @desc    Add a task to work order checklist
 * @route   POST /api/v1/work-orders/:id/tasks
 * @access  Private
 */
exports.addTaskToChecklist = catchAsync(async (req, res, next) => {
  try {
    const { name, description, dueDate } = req.body;
    
    if (!name) {
      return next(new AppError('Task name is required', 400));
    }
    
    // 1) Find the work order
    const workOrder = await WorkOrder.findById(req.params.id);
    
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // 2) Check if user has permission to add tasks
    const isAssigned = workOrder.assignedTo.some(
      assignment => assignment.worker.toString() === req.user._id.toString()
    );
    
    if (!isAssigned && !req.user.roles.includes('admin')) {
      return next(
        new AppError('You are not authorized to add tasks to this work order', 403)
      );
    }
    
    // 3) Create task
    const task = {
      name,
      description: description || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      completed: false,
      createdBy: req.user._id,
      createdAt: new Date()
    };
    
    // 4) Add task to checklist
    workOrder.checklist = workOrder.checklist || [];
    workOrder.checklist.push(task);
    
    // 5) Update work order status if this is the first task
    if (workOrder.checklist.length === 1 && workOrder.status === 'pending') {
      workOrder.status = 'in_progress';
    }
    
    await workOrder.save();
    
    // 6) Send response
    res.status(201).json({
      status: 'success',
      data: {
        task
      }
    });
  } catch (error) {
    console.error('Error in addTaskToChecklist:', error);
    next(new AppError('Error adding task to checklist', 500));
  }
});

/**
 * @desc    Update task status in checklist
 * @route   PATCH /api/v1/work-orders/:id/tasks/:taskId
 * @access  Private
 */
exports.updateTaskStatus = catchAsync(async (req, res, next) => {
  try {
    const { completed, notes } = req.body;
    
    // 1) Find the work order
    const workOrder = await WorkOrder.findById(req.params.id);
    
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // 2) Find the task
    const taskIndex = workOrder.checklist.findIndex(
      task => task._id.toString() === req.params.taskId
    );
    
    if (taskIndex === -1) {
      return next(new AppError('No task found with that ID', 404));
    }
    
    // 3) Update task
    const task = workOrder.checklist[taskIndex];
    
    if (completed !== undefined) {
      task.completed = completed;
      task.completedAt = completed ? new Date() : null;
      task.completedBy = completed ? req.user._id : null;
    }
    
    if (notes !== undefined) {
      task.notes = notes;
    }
    
    // 4) Check if all tasks are completed
    const allTasksCompleted = workOrder.checklist.every(t => t.completed);
    
    if (allTasksCompleted && workOrder.status !== 'completed') {
      workOrder.status = 'pending_review';
    } else if (!allTasksCompleted && workOrder.status === 'pending_review') {
      workOrder.status = 'in_progress';
    }
    
    await workOrder.save();
    
    // 5) Send response
    res.status(200).json({
      status: 'success',
      data: {
        task: workOrder.checklist[taskIndex]
      }
    });
  } catch (error) {
    console.error('Error in updateTaskStatus:', error);
    next(new AppError('Error updating task status', 500));
  }
});

/**
 * @desc    Report an issue with a work order
 * @route   POST /api/v1/work-orders/:id/issues
 * @access  Private (assigned worker, admin, manager, supervisor)
 */
exports.reportIssue = catchAsync(async (req, res, next) => {
  try {
    // 1) Find the work order
    const workOrder = await WorkOrder.findById(req.params.id);
    
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // 2) Check if user has permission to report issues
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isAssignedWorker = workOrder.assignedTo.some(
      assignment => assignment.worker.toString() === req.user._id.toString()
    );
    
    if (!isAdmin && !isAssignedWorker) {
      return next(new AppError('You do not have permission to report issues for this work order', 403));
    }
    
    // 3) Handle file uploads if any
    let photos = [];
    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(file => 
          uploadToCloudinary(file, 'work-order-issues')
        );
        photos = await Promise.all(uploadPromises);
      } catch (error) {
        console.error('Error uploading issue photos:', error);
        return next(new AppError('Error uploading one or more photos', 500));
      }
    }
    
    // 4) Create issue object
    const issue = {
      description: req.body.description,
      reportedBy: req.user._id,
      reportedAt: new Date(),
      photos: photos,
      severity: req.body.severity || 'medium',
      status: 'open'
    };
    
    // 5) Add issue to work order
    if (!workOrder.issues) {
      workOrder.issues = [];
    }
    workOrder.issues.push(issue);
    
    // 6) Update work order status if needed
    if (workOrder.status === 'completed') {
      workOrder.status = 'issue_reported';
    }
    
    await workOrder.save();
    
    // 7) Send response
    res.status(201).json({
      status: 'success',
      data: {
        issue: workOrder.issues[workOrder.issues.length - 1]
      }
    });
  } catch (error) {
    console.error('Error reporting issue:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return next(new AppError(`Validation error: ${messages.join('. ')}`, 400));
    }
    
    next(new AppError('An error occurred while reporting the issue', 500));
  }
});

/**
 * @desc    Get work order statistics for a building
 * @route   GET /api/v1/work-orders/stats/:buildingId
 * @access  Private
 */
exports.getWorkOrderStats = catchAsync(async (req, res, next) => {
  try {
    const { buildingId } = req.params;
    const { startDate, endDate } = req.query;
    
    // 1) Validate building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return next(new AppError('No building found with that ID', 404));
    }
    
    // 2) Set up date range
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    // 3) Get statistics
    const stats = await WorkOrder.getStats(
      buildingId,
      req.user.roles.includes('admin') ? null : req.user._id,
      dateFilter
    );
    
    // 4) Send response
    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Error in getWorkOrderStats:', error);
    next(new AppError('Error retrieving work order statistics', 500));
  }
});

/**
 * @desc    Get worker assignments for a work order
 * @route   GET /api/v1/work-orders/:id/assignments
 * @access  Private
 */
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

/**
 * @desc    Update worker assignment status
 * @route   PATCH /api/v1/work-orders/:id/assignments/:workerId
 * @access  Private (admin, manager, supervisor, assigned worker)
 */
exports.updateAssignmentStatus = catchAsync(async (req, res, next) => {
  try {
    const { id: workOrderId, workerId } = req.params;
    const { status, notes, timeSpent } = req.body;
    
    // 1) Find the work order
    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // 2) Find the assignment
    const assignmentIndex = workOrder.assignedTo.findIndex(
      assignment => assignment.worker.toString() === workerId
    );
    
    if (assignmentIndex === -1) {
      return next(new AppError('Worker is not assigned to this work order', 404));
    }
    
    // 3) Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isAssignedWorker = req.user._id.toString() === workerId;
    
    if (!isAdmin && !isAssignedWorker) {
      return next(new AppError('You do not have permission to update this assignment', 403));
    }
    
    // 4) Update assignment
    const assignment = workOrder.assignedTo[assignmentIndex];
    if (status) assignment.status = status;
    if (notes) assignment.notes = notes;
    if (timeSpent) {
      assignment.timeSpent = {
        hours: timeSpent.hours || 0,
        minutes: timeSpent.minutes || 0
      };
    }
    assignment.updatedAt = new Date();
    
    await workOrder.save();
    
    // 5) Populate and return updated assignment
    await workOrder.populate('assignedTo.worker', 'name email phone');
    
    res.status(200).json({
      status: 'success',
      data: {
        assignment: workOrder.assignedTo[assignmentIndex]
      }
    });
  } catch (error) {
    console.error('Error updating assignment status:', error);
    next(new AppError('Error updating assignment status', 500));
  }
});

/**
 * @desc    Get form data for work order creation/editing
 * @route   GET /api/v1/work-orders/form-data
 * @access  Private (admin, manager, supervisor)
 */
exports.getWorkOrderFormData = catchAsync(async (req, res, next) => {
  try {
    // Get buildings
    const buildings = await Building.find({ isActive: true })
      .select('name address city state zipCode')
      .sort('name');

    // Get workers
    const workers = await User.find({ 
      role: { $in: ['worker', 'supervisor'] },
      isActive: true 
    })
      .select('name email phone role')
      .sort('name');

    // Service types
    const serviceTypes = [
      { value: 'painting', label: 'Painting' },
      { value: 'cleaning', label: 'Cleaning' },
      { value: 'repair', label: 'Repair' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'inspection', label: 'Inspection' },
      { value: 'plumbing', label: 'Plumbing' },
      { value: 'electrical', label: 'Electrical' },
      { value: 'hvac', label: 'HVAC' },
      { value: 'flooring', label: 'Flooring' },
      { value: 'roofing', label: 'Roofing' },
      { value: 'carpentry', label: 'Carpentry' },
      { value: 'other', label: 'Other' }
    ];

    // Priority levels
    const priorityLevels = [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' }
    ];

    // Status options
    const statusOptions = [
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'on_hold', label: 'On Hold' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'pending_review', label: 'Pending Review' },
      { value: 'issue_reported', label: 'Issue Reported' }
    ];

    res.status(200).json({
      status: 'success',
      data: {
        buildings,
        workers,
        serviceTypes,
        priorityLevels,
        statusOptions
      }
    });
  } catch (error) {
    console.error('Error getting work order form data:', error);
    next(new AppError('Error retrieving form data', 500));
  }
});

/**
 * @desc    Add a note to a work order
 * @route   POST /api/v1/work-orders/:id/notes
 * @access  Private (admin, manager, supervisor, assigned worker)
 */
exports.addNoteToWorkOrder = catchAsync(async (req, res, next) => {
  try {
    const { content, isPrivate = false } = req.body;
    
    // Find the work order
    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isAssignedWorker = workOrder.assignedTo.some(
      assignment => assignment.worker.toString() === req.user._id.toString()
    );
    
    if (!isAdmin && !isAssignedWorker) {
      return next(new AppError('You do not have permission to add notes to this work order', 403));
    }
    
    // Create note
    const note = {
      content,
      author: req.user._id,
      isPrivate,
      createdAt: new Date()
    };
    
    // Add note to work order
    if (!workOrder.notes) {
      workOrder.notes = [];
    }
    workOrder.notes.push(note);
    
    await workOrder.save();
    await workOrder.populate('notes.author', 'name email');
    
    res.status(201).json({
      status: 'success',
      data: {
        note: workOrder.notes[workOrder.notes.length - 1]
      }
    });
  } catch (error) {
    console.error('Error adding note to work order:', error);
    next(new AppError('Error adding note to work order', 500));
  }
});

/**
 * @desc    Update a note in a work order
 * @route   PATCH /api/v1/work-orders/:id/notes/:noteId
 * @access  Private (admin, manager, supervisor, note author)
 */
exports.updateNoteInWorkOrder = catchAsync(async (req, res, next) => {
  try {
    const { content, isPrivate } = req.body;
    const { id: workOrderId, noteId } = req.params;
    
    // Find the work order
    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // Find the note
    const noteIndex = workOrder.notes.findIndex(note => note._id.toString() === noteId);
    if (noteIndex === -1) {
      return next(new AppError('Note not found', 404));
    }
    
    const note = workOrder.notes[noteIndex];
    
    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isNoteAuthor = note.author.toString() === req.user._id.toString();
    
    if (!isAdmin && !isNoteAuthor) {
      return next(new AppError('You do not have permission to update this note', 403));
    }
    
    // Update note
    if (content !== undefined) note.content = content;
    if (isPrivate !== undefined) note.isPrivate = isPrivate;
    note.updatedAt = new Date();
    
    await workOrder.save();
    await workOrder.populate('notes.author', 'name email');
    
    res.status(200).json({
      status: 'success',
      data: {
        note: workOrder.notes[noteIndex]
      }
    });
  } catch (error) {
    console.error('Error updating note in work order:', error);
    next(new AppError('Error updating note in work order', 500));
  }
});

/**
 * @desc    Delete a note from a work order
 * @route   DELETE /api/v1/work-orders/:id/notes/:noteId
 * @access  Private (admin, manager, supervisor, note author)
 */
exports.deleteNoteFromWorkOrder = catchAsync(async (req, res, next) => {
  try {
    const { id: workOrderId, noteId } = req.params;
    
    // Find the work order
    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // Find the note
    const noteIndex = workOrder.notes.findIndex(note => note._id.toString() === noteId);
    if (noteIndex === -1) {
      return next(new AppError('Note not found', 404));
    }
    
    const note = workOrder.notes[noteIndex];
    
    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isNoteAuthor = note.author.toString() === req.user._id.toString();
    
    if (!isAdmin && !isNoteAuthor) {
      return next(new AppError('You do not have permission to delete this note', 403));
    }
    
    // Remove note
    workOrder.notes.splice(noteIndex, 1);
    await workOrder.save();
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Error deleting note from work order:', error);
    next(new AppError('Error deleting note from work order', 500));
  }
});

/**
 * @desc    Assign workers to a work order
 * @route   PATCH /api/v1/work-orders/:id/assign
 * @access  Private (admin, manager, supervisor)
 */
exports.assignWorkers = catchAsync(async (req, res, next) => {
  const { workers } = req.body;
  
  // 1) Find the work order
  const workOrder = await WorkOrder.findById(req.params.id);
  if (!workOrder) {
    return next(new AppError('No work order found with that ID', 404));
  }

  // 2) Check if user has permission to assign workers
  if (
    req.user.role !== 'admin' && 
    req.user.role !== 'manager' && 
    req.user.role !== 'supervisor'
  ) {
    return next(
      new AppError('You do not have permission to assign workers', 403)
    );
  }

  // 3) Process new assignments
  const newAssignments = workers.map(workerId => ({
    worker: workerId,
    assignedBy: req.user._id,
    assignedAt: new Date(),
    status: 'pending',
    timeSpent: { hours: 0, minutes: 0 },
    materials: []
  }));

  // 4) Update work order with new assignments
  workOrder.assignedTo = [
    // Keep existing assignments that aren't in the new list
    ...workOrder.assignedTo.filter(
      assignment => !workers.includes(assignment.worker.toString())
    ),
    // Add new assignments
    ...newAssignments
  ];

  // 5) Update status if this is the first assignment
  if (workOrder.status === 'pending' && workOrder.assignedTo.length > 0) {
    workOrder.status = 'assigned';
  }

  // 6) Save the updated work order
  await workOrder.save();

  // 7) Populate the response
  const updatedWorkOrder = await WorkOrder.findById(workOrder._id)
    .populate({
      path: 'assignedTo.worker',
      select: 'name email phone workerProfile.skills'
    });

  // 8) TODO: Send notifications to assigned workers
  // await sendWorkOrderAssignedNotification(updatedWorkOrder);

  res.status(200).json({
    status: 'success',
    data: {
      workOrder: updatedWorkOrder
    }
  });
});
