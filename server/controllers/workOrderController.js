// Improved error handling for work order controller
const WorkOrder = require('../models/WorkOrder');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Building = require('../models/Building');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { sendWorkOrderAssignedEmail } = require('../services/emailService');

/**
 * @desc    Create a new work order
 * @route   POST /api/v1/work-orders
 * @access  Private/Admin/Manager
 */
exports.createWorkOrder = catchAsync(async (req, res, next) => {
  try {
    console.log('=== CREATE WORK ORDER START ===');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Request user:', req.user ? { id: req.user._id, role: req.user.role } : 'No user');
    
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      console.log('User authentication failed');
      return next(new AppError('User not authenticated. Please log in.', 401));
    }
    
    console.log('User authenticated, proceeding with work order creation');
    // Extract data from request body with defaults
    const {
      title,
      description = '',
      building,
      apartmentNumber = '',
      block = '',
      apartmentStatus = 'occupied',
      priority = 'medium',
      status = 'pending',
      scheduledDate,
      estimatedCompletionDate,
      estimatedCost = 0,
      assignedTo = [],
      services = [],
      notes = []
    } = req.body;

    // Parse JSON strings for arrays
    let parsedAssignedTo = [];
    let parsedServices = [];
    
    try {
      parsedAssignedTo = assignedTo ? (typeof assignedTo === 'string' ? JSON.parse(assignedTo) : assignedTo) : [];
      parsedServices = services ? (typeof services === 'string' ? JSON.parse(services) : services) : [];
    } catch (parseError) {
      console.log('Error parsing JSON arrays:', parseError);
      parsedAssignedTo = [];
      parsedServices = [];
    }
    
    // Handle photo uploads
    let uploadedPhotos = [];
    if (req.files && req.files.photos) {
      try {
        const photos = Array.isArray(req.files.photos) ? req.files.photos : [req.files.photos];
        for (const photo of photos) {
          const result = await uploadToCloudinary(photo.tempFilePath);
          uploadedPhotos.push({
            url: result.secure_url,
            publicId: result.public_id,
            uploadedBy: req.user._id,
            uploadedAt: new Date()
          });
        }
      } catch (uploadError) {
        console.log('Photo upload error:', uploadError);
        // Continue without photos if upload fails
      }
    }

    // Set default scheduledDate if not provided - handle date parsing more safely
    let workOrderScheduledDate;
    try {
      workOrderScheduledDate = scheduledDate ? new Date(scheduledDate) : new Date();
      // Validate the parsed date
      if (isNaN(workOrderScheduledDate.getTime())) {
        console.error('Invalid scheduledDate provided:', scheduledDate);
        workOrderScheduledDate = new Date(); // Fallback to current date
      }
    } catch (dateError) {
      console.error('Error parsing scheduledDate:', dateError);
      workOrderScheduledDate = new Date(); // Fallback to current date
    }

    // Validate required fields
    const requiredFields = [
      'title', 
      'building'
    ];
    
    const missingFields = [];
    const fieldErrors = {};
    
    // Check for missing required fields
    requiredFields.forEach(field => {
      if (!req.body[field] && req.body[field] !== 0 && req.body[field] !== false) {
        missingFields.push(field);
        fieldErrors[field] = `Field '${field}' is required`;
      }
    });
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', { missingFields, fieldErrors });
      return next(new AppError(
        `Missing required fields: ${missingFields.join(', ')}`,
        400,
        { fieldErrors }
      ));
    }
    
    // Import mongoose for validation
    const mongoose = require('mongoose');
    
    // Validate building ID format
    if (!mongoose.Types.ObjectId.isValid(building)) {
      fieldErrors.building = 'Invalid building ID format';
      return next(new AppError('Invalid building ID format', 400, { fieldErrors }));
    }

    // Validate services array - use parsed services
    let processedServices = [];
    if (parsedServices && Array.isArray(parsedServices) && parsedServices.length > 0) {
      processedServices = parsedServices.map(service => ({
        type: service.type || 'other',
        description: service.description || '',
        laborCost: parseFloat(service.laborCost) || 0,
        materialCost: parseFloat(service.materialCost) || 0,
        status: service.status || 'pending'
      }));
    } else {
      // Default service if none provided
      processedServices = [{
        type: 'other',
        description: 'General work',
        laborCost: 0,
        materialCost: 0,
        status: 'pending'
      }];
    }

    // Get the authenticated user's ID
    const createdBy = req.user._id;

    // Process any uploaded photos
    let photos = [];
    if (req.files && req.files.length > 0) {
      photos = req.files.map(file => ({
        url: file.path.replace(/\\/g, '/'), // Convert Windows paths to forward slashes
        filename: file.filename,
        originalname: file.originalname,
        uploadedBy: createdBy,
        uploadedAt: new Date()
      }));
    }

    // Process assigned workers - convert to proper format
    let processedAssignedTo = [];
    if (Array.isArray(parsedAssignedTo) && parsedAssignedTo.length > 0) {
      for (const item of parsedAssignedTo) {
        try {
          // Handle different formats: string ID, object with worker property, or object with _id
          let workerId;
          if (typeof item === 'string') {
            workerId = item;
          } else if (item && typeof item === 'object') {
            workerId = item.worker || item._id;
          }
          
          if (!workerId) {
            console.warn('No valid worker ID found in item:', item);
            continue;
          }
          
          // Validate worker ID format
          if (!mongoose.Types.ObjectId.isValid(workerId)) {
            console.warn('Invalid worker ID format:', workerId);
            continue; // Skip invalid worker IDs
          }
          
          // Check if worker exists
          const workerExists = await User.exists({ _id: workerId, role: 'worker' });
          if (!workerExists) {
            console.warn(`Worker with ID ${workerId} not found or not a worker`);
            continue; // Skip non-existent workers
          }
          
          processedAssignedTo.push({
            worker: workerId,
            assignedAt: new Date(),
            assignedBy: req.user._id,
            status: 'pending'
          });
          
        } catch (error) {
          console.error('Error processing worker assignment:', error);
          // Continue with other workers even if one fails
        }
      }
    }

    // Use the already processed services from above

    // Process notes
    const processedNotes = (Array.isArray(notes) ? notes : []).map(note => ({
      content: note.content || '',
      createdBy: createdBy,
      isPrivate: Boolean(note.isPrivate),
      createdAt: new Date()
    }));

    // Create the work order with processed data
    const workOrderData = {
      title,
      description,
      building,
      apartmentNumber,
      block,
      apartmentStatus,
      priority,
      status,
      scheduledDate: workOrderScheduledDate,
      estimatedCompletionDate: (() => {
        try {
          if (!estimatedCompletionDate) return null;
          const date = new Date(estimatedCompletionDate);
          return isNaN(date.getTime()) ? null : date;
        } catch (error) {
          console.error('Error parsing estimatedCompletionDate:', error);
          return null;
        }
      })(),
      assignedTo: processedAssignedTo,
      services: processedServices,
      photos,
      notes: processedNotes, // Use processedNotes instead of raw notes
      estimatedCost: parseFloat(estimatedCost) || 0,
      createdBy,
      updatedBy: createdBy
    };

    console.log('Creating work order with data:', JSON.stringify(workOrderData, null, 2));
    
    // Verify building exists before creating work order
    const buildingExists = await Building.findById(building);
    if (!buildingExists) {
      return next(new AppError('Building not found', 404));
    }
    
    const workOrder = await WorkOrder.create(workOrderData);

    // Populate the work order with related data for the response
    const populatedWorkOrder = await WorkOrder.findById(workOrder._id)
      .populate('building', 'name address city state zipCode')
      .populate('assignedTo.worker', 'name email phone')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    try {
      // Send notifications to assigned workers
      if (processedAssignedTo.length > 0) {
        try {
          await sendWorkOrderAssignedEmail(populatedWorkOrder);
        } catch (emailError) {
          console.error('Error sending work order assignment emails:', emailError);
          // Log the error but don't fail the request
          // You might want to implement a retry mechanism for failed emails
        }
      }

      // Calculate total cost for the work order
      const totalCost = populatedWorkOrder.services.reduce((sum, service) => {
        return sum + (service.laborCost || 0) + (service.materialCost || 0);
      }, 0);

      // Prepare response data
      const responseData = {
        ...populatedWorkOrder.toObject(),
        totalCost,
        serviceCount: populatedWorkOrder.services.length,
        assignedWorkerCount: populatedWorkOrder.assignedTo.length
      };

      res.status(201).json({
        status: 'success',
        message: 'Work order created successfully',
        data: responseData
      });
    } catch (error) {
      console.error('=== WORK ORDER CREATION ERROR (INNER) ===');
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      handleWorkOrderError(error, next);
    }
  } catch (error) {
    console.error('=== WORK ORDER CREATION ERROR (OUTER) ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const fieldErrors = {};
      Object.keys(error.errors).forEach(key => {
        fieldErrors[key] = error.errors[key].message;
      });
      return next(new AppError('Validation failed', 400, { fieldErrors }));
    }
    
    if (error.name === 'CastError') {
      return next(new AppError('Invalid ID format', 400));
    }
    
    if (error.code === 11000) {
      return next(new AppError('Duplicate field value', 400));
    }
    console.error('Error stack:', error);
    handleWorkOrderError(error, next);
  }
});

// Delete a note from a work order
exports.deleteNoteFromWorkOrder = catchAsync(async (req, res, next) => {
  try {
    const { noteId } = req.params;
    
    // Find the work order containing the note
    const workOrder = await WorkOrder.findOne({
      _id: req.params.id,
      'notes._id': noteId
    });
    
    if (!workOrder) {
      return next(new AppError('No work order or note found with the provided IDs', 404));
    }
    
    // Find the note in the work order
    const note = workOrder.notes.id(noteId);
    
    if (!note) {
      return next(new AppError('Note not found in work order', 404));
    }
    
    // Check if user has permission to delete the note
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isNoteOwner = note.createdBy.toString() === req.user._id.toString();
    
    if (!isAdmin && !isNoteOwner) {
      return next(new AppError('You do not have permission to delete this note', 403));
    }
    
    // Remove the note from the array
    workOrder.notes.pull({ _id: noteId });
    
    // Save the updated work order
    await workOrder.save({ validateBeforeSave: false });
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Update a note in a work order
exports.updateNoteInWorkOrder = catchAsync(async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const { content, isPrivate } = req.body;
    
    if (content !== undefined && (typeof content !== 'string' || content.trim() === '')) {
      return next(new AppError('Note content cannot be empty', 400));
    }
    
    // Find the work order containing the note
    const workOrder = await WorkOrder.findOne({
      _id: req.params.id,
      'notes._id': noteId
    });
    
    if (!workOrder) {
      return next(new AppError('No work order or note found with the provided IDs', 404));
    }
    
    // Find the note in the work order
    const note = workOrder.notes.id(noteId);
    
    if (!note) {
      return next(new AppError('Note not found in work order', 404));
    }
    
    // Check if user has permission to update the note
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isNoteOwner = note.createdBy.toString() === req.user._id.toString();
    
    if (!isAdmin && !isNoteOwner) {
      return next(new AppError('You do not have permission to update this note', 403));
    }
    
    // Update note fields if provided
    if (content !== undefined) {
      note.content = content.trim();
      note.updatedAt = new Date();
      note.updatedBy = req.user._id;
    }
    
    if (isPrivate !== undefined) {
      note.isPrivate = !!isPrivate;
    }
    
    // Mark the work order as modified to ensure the update is saved
    workOrder.markModified('notes');
    
    // Save the updated work order
    await workOrder.save({ validateBeforeSave: false });
    
    // Populate the createdBy and updatedBy fields before sending response
    await workOrder.populate([
      { path: 'notes.createdBy', select: 'name email role' },
      { path: 'notes.updatedBy', select: 'name email role' }
    ]);
    
    // Find the updated note in the populated work order
    const updatedNote = workOrder.notes.id(noteId);
    
    res.status(200).json({
      status: 'success',
      data: {
        note: updatedNote
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Add a note to a work order
exports.addNoteToWorkOrder = catchAsync(async (req, res, next) => {
  try {
    const { content, isPrivate = false } = req.body;
    
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return next(new AppError('Note content is required', 400));
    }
    
    // Find the work order
    const workOrder = await WorkOrder.findById(req.params.id);
    
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // Check if user has permission to add a note
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isSupervisor = req.user.role === 'supervisor';
    const isAssigned = workOrder.assignedTo.some(
      assignment => assignment.worker.toString() === req.user._id.toString()
    );
    
    if (!isAdmin && !isSupervisor && !isAssigned) {
      return next(new AppError('You do not have permission to add notes to this work order', 403));
    }
    
    // Create the new note
    const newNote = {
      content: content.trim(),
      createdBy: req.user._id,
      isPrivate: !!isPrivate,
      createdAt: new Date()
    };
    
    // Add the note to the work order
    workOrder.notes.push(newNote);
    await workOrder.save({ validateBeforeSave: false });
    
    // Populate the createdBy field before sending response
    await workOrder.populate('notes.createdBy', 'name email role');
    
    // Get the newly added note (last one in the array)
    const addedNote = workOrder.notes[workOrder.notes.length - 1];
    
    // TODO: Send notifications to relevant users
    
    res.status(201).json({
      status: 'success',
      data: {
        note: addedNote
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Get form data for work order creation/editing
exports.getWorkOrderFormData = catchAsync(async (req, res, next) => {
  try {
    // Get all active buildings
    const buildings = await Building.find({ active: true })
      .select('name address city state zipCode')
      .sort('name');
    
    // Get all active workers
    const workers = await User.find({ 
      role: 'worker', 
      active: true,
      'workerProfile.status': 'active'
    })
    .select('name email phone workerProfile.skills workerProfile.rate')
    .sort('name');
    
    // Get all active managers and supervisors
    const managers = await User.find({
      role: { $in: ['manager', 'supervisor'] },
      active: true
    })
    .select('name email role')
    .sort('name');
    
    // Define work order priorities
    const priorities = [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' }
    ];
    
    // Define work order statuses
    const statuses = [
      { value: 'pending', label: 'Pending' },
      { value: 'assigned', label: 'Assigned' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'on_hold', label: 'On Hold' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'pending_review', label: 'Pending Review' },
      { value: 'issue_reported', label: 'Issue Reported' }
    ];
    
    // Define service types (this could also come from a database collection)
    const serviceTypes = [
      { value: 'repair', label: 'Repair' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'inspection', label: 'Inspection' },
      { value: 'installation', label: 'Installation' },
      { value: 'cleaning', label: 'Cleaning' },
      { value: 'other', label: 'Other' }
    ];
    
    // Define task statuses
    const taskStatuses = [
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'on_hold', label: 'On Hold' },
      { value: 'cancelled', label: 'Cancelled' }
    ];
    
    // Define assignment roles
    const assignmentRoles = [
      { value: 'primary', label: 'Primary' },
      { value: 'assistant', label: 'Assistant' },
      { value: 'supervisor', label: 'Supervisor' },
      { value: 'inspector', label: 'Inspector' }
    ];
    
    // Prepare the response data
    const formData = {
      buildings,
      workers,
      managers,
      priorities,
      statuses,
      serviceTypes,
      taskStatuses,
      assignmentRoles
    };
    
    res.status(200).json({
      status: 'success',
      data: formData
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Assign workers to a work order
exports.assignWorkers = catchAsync(async (req, res, next) => {
  try {
    const { workers } = req.body;
    
    if (!Array.isArray(workers) || workers.length === 0) {
      return next(new AppError('Please provide an array of workers to assign', 400));
    }
    
    // Find the work order
    const workOrder = await WorkOrder.findById(req.params.id);
    
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // Check if user has permission to assign workers
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    
    if (!isAdmin) {
      return next(new AppError('You do not have permission to assign workers', 403));
    }
    
    // Validate each worker in the request
    const workerIds = workers.map(w => w.workerId);
    const existingUsers = await User.find({ 
      _id: { $in: workerIds },
      role: 'worker',
      active: true
    });
    
    if (existingUsers.length !== workerIds.length) {
      return next(new AppError('One or more workers are invalid or inactive', 400));
    }
    
    // Create new assignments
    const newAssignments = workers.map(worker => ({
      worker: worker.workerId,
      role: worker.role || 'worker',
      assignedBy: req.user._id,
      assignedAt: new Date(),
      status: 'assigned'
    }));
    
    // Add new assignments to work order
    workOrder.assignedTo.push(...newAssignments);
    
    // Update work order status if it's new or unassigned
    if (['new', 'unassigned'].includes(workOrder.status)) {
      workOrder.status = 'assigned';
    }
    
    // Save the updated work order
    await workOrder.save({ validateBeforeSave: false });
    
    // Populate the worker and assignedBy fields before sending response
    await workOrder.populate([
      { path: 'assignedTo.worker', select: 'name email role' },
      { path: 'assignedTo.assignedBy', select: 'name email' }
    ]);
    
    // Get only the newly added assignments
    const addedAssignments = workOrder.assignedTo.slice(-newAssignments.length);
    
    // TODO: Send notifications to assigned workers
    
    res.status(201).json({
      status: 'success',
      data: {
        assignments: addedAssignments
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Update worker assignment status
exports.updateAssignmentStatus = catchAsync(async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const { status, notes, timeSpent } = req.body;
    
    // Find the work order containing the assignment
    const workOrder = await WorkOrder.findOne({
      _id: req.params.id,
      'assignedTo._id': assignmentId
    });
    
    if (!workOrder) {
      return next(new AppError('No work order or assignment found with the provided IDs', 404));
    }
    
    // Find the assignment in the work order
    const assignment = workOrder.assignedTo.id(assignmentId);
    
    if (!assignment) {
      return next(new AppError('Assignment not found in work order', 404));
    }
    
    // Check if user has permission to update the assignment
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isAssignedUser = assignment.worker.toString() === req.user._id.toString();
    
    if (!isAdmin && !isAssignedUser) {
      return next(new AppError('You do not have permission to update this assignment', 403));
    }
    
    // Update assignment fields
    if (status) {
      assignment.status = status;
      
      // Update timestamps based on status
      if (status === 'in_progress' && !assignment.startedAt) {
        assignment.startedAt = new Date();
      } else if (['completed', 'paused', 'cancelled'].includes(status)) {
        assignment.completedAt = new Date();
      }
    }
    
    if (notes) {
      assignment.notes = notes;
    }
    
    if (timeSpent && timeSpent.hours !== undefined && timeSpent.minutes !== undefined) {
      // Convert hours and minutes to total minutes
      const totalMinutes = (timeSpent.hours * 60) + (timeSpent.minutes || 0);
      
      // Update time spent
      if (!assignment.timeSpent) {
        assignment.timeSpent = { hours: 0, minutes: 0 };
      }
      
      // Add to existing time spent
      const currentTotalMinutes = (assignment.timeSpent.hours * 60) + (assignment.timeSpent.minutes || 0);
      const newTotalMinutes = currentTotalMinutes + totalMinutes;
      
      assignment.timeSpent = {
        hours: Math.floor(newTotalMinutes / 60),
        minutes: newTotalMinutes % 60
      };
    }
    
    // Mark the work order as modified to ensure the update is saved
    workOrder.markModified('assignedTo');
    
    // Save the updated work order
    await workOrder.save({ validateBeforeSave: false });
    
    // Populate the worker field before sending response
    await workOrder.populate('assignedTo.worker', 'name email role');
    
    // Find the updated assignment in the populated work order
    const updatedAssignment = workOrder.assignedTo.id(assignmentId);
    
    res.status(200).json({
      status: 'success',
      data: {
        assignment: updatedAssignment
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Get worker assignments for a work order
exports.getWorkerAssignments = catchAsync(async (req, res, next) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id)
      .select('assignedTo')
      .populate({
        path: 'assignedTo.worker',
        select: 'name email phone role'
      });
    
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // Check if user has permission to view assignments
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isAssigned = workOrder.assignedTo.some(
      assignment => assignment.worker._id.toString() === req.user._id.toString()
    );
    
    if (!isAdmin && !isAssigned) {
      return next(new AppError('You do not have permission to view these assignments', 403));
    }
    
    // Format the response
    const assignments = workOrder.assignedTo.map(assignment => ({
      _id: assignment._id,
      worker: assignment.worker,
      role: assignment.role,
      assignedAt: assignment.assignedAt,
      status: assignment.status,
      timeSpent: assignment.timeSpent,
      notes: assignment.notes,
      completedAt: assignment.completedAt
    }));
    
    res.status(200).json({
      status: 'success',
      results: assignments.length,
      data: {
        assignments
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Report an issue with a work order
exports.reportIssue = catchAsync(async (req, res, next) => {
  try {
    const { description } = req.body;
    const { id } = req.params;
    
    // Find the work order
    const workOrder = await WorkOrder.findById(id);
    
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // Check if user has permission to report an issue
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isAssigned = workOrder.assignedTo.some(
      assignment => assignment.worker.toString() === req.user._id.toString()
    );
    
    if (!isAdmin && !isAssigned) {
      return next(new AppError('You do not have permission to report issues for this work order', 403));
    }
    
    // Handle file uploads if any
    let photoUrls = [];
    if (req.files && req.files.length > 0) {
      // Process each uploaded file
      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file, 'work-orders/issues')
      );
      
      const results = await Promise.all(uploadPromises);
      photoUrls = results.map(result => ({
        url: result.secure_url,
        publicId: result.public_id,
        uploadedBy: req.user._id
      }));
    }
    
    // Create the issue
    const newIssue = {
      description,
      reportedBy: req.user._id,
      status: 'reported',
      photos: photoUrls,
      reportedAt: new Date()
    };
    
    // Add the issue to the work order
    workOrder.issues.push(newIssue);
    
    // Update work order status if needed
    if (workOrder.status !== 'issue_reported') {
      workOrder.status = 'issue_reported';
      workOrder.updatedAt = new Date();
    }
    
    // Save the updated work order
    await workOrder.save({ validateBeforeSave: false });
    
    // Populate the reportedBy field before sending response
    await workOrder.populate('issues.reportedBy', 'name email');
    
    // Get the newly added issue (last one in the array)
    const addedIssue = workOrder.issues[workOrder.issues.length - 1];
    
    // TODO: Send notification to admins/managers about the reported issue
    
    res.status(201).json({
      status: 'success',
      data: {
        issue: addedIssue
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Update task status in work order checklist
exports.updateTaskStatus = catchAsync(async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { completed, notes } = req.body;
    
    // Find the work order containing the task
    const workOrder = await WorkOrder.findOne({
      _id: req.params.id,
      'checklist._id': taskId
    });
    
    if (!workOrder) {
      return next(new AppError('No work order or task found with the provided IDs', 404));
    }
    
    // Find the task in the checklist
    const taskIndex = workOrder.checklist.findIndex(
      task => task._id.toString() === taskId
    );
    
    if (taskIndex === -1) {
      return next(new AppError('Task not found in work order', 404));
    }
    
    const task = workOrder.checklist[taskIndex];
    
    // Check if user has permission to update the task
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isAssigned = workOrder.assignedTo.some(
      assignment => assignment.worker.toString() === req.user._id.toString()
    );
    
    if (!isAdmin && !isAssigned) {
      return next(new AppError('You do not have permission to update this task', 403));
    }
    
    // Update task fields
    if (typeof completed === 'boolean') {
      workOrder.checklist[taskIndex].completed = completed;
      workOrder.checklist[taskIndex].status = completed ? 'completed' : 'pending';
      workOrder.checklist[taskIndex].completedAt = completed ? new Date() : null;
      workOrder.checklist[taskIndex].completedBy = completed ? req.user._id : null;
    }
    
    if (notes !== undefined) {
      workOrder.checklist[taskIndex].notes = notes;
    }
    
    // Mark the work order as modified to ensure the update is saved
    workOrder.markModified('checklist');
    await workOrder.save({ validateBeforeSave: false });
    
    // Populate the updated fields before sending response
    await workOrder.populate([
      { path: 'checklist.completedBy', select: 'name email' },
      { path: 'checklist.createdBy', select: 'name email' }
    ]);
    
    // Find the updated task in the populated work order
    const updatedTask = workOrder.checklist.find(
      t => t._id.toString() === taskId
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        task: updatedTask
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Add a task to work order checklist
exports.addTaskToChecklist = catchAsync(async (req, res, next) => {
  try {
    const { name, description, dueDate } = req.body;
    
    const workOrder = await WorkOrder.findById(req.params.id);
    
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // Check if user has permission to add tasks
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isAssigned = workOrder.assignedTo.some(
      assignment => assignment.worker.toString() === req.user._id.toString()
    );
    
    if (!isAdmin && !isAssigned) {
      return next(new AppError('You do not have permission to add tasks to this work order', 403));
    }
    
    const newTask = {
      name,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.user._id,
      status: 'pending',
      completed: false
    };
    
    workOrder.checklist.push(newTask);
    await workOrder.save({ validateBeforeSave: false });
    
    // Populate the createdBy field before sending response
    await workOrder.populate('checklist.createdBy', 'name email');
    
    // Get the newly added task (last one in the array)
    const addedTask = workOrder.checklist[workOrder.checklist.length - 1];
    
    res.status(201).json({
      status: 'success',
      data: {
        task: addedTask
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// @desc    Get a single work order by ID
// @route   GET /api/v1/work-orders/:id
// @access  Private
exports.getWorkOrder = catchAsync(async (req, res, next) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id)
      .populate('building', 'name address city state zipCode')
      .populate('assignedTo.worker', 'name email phone role')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .populate('services.completedBy', 'name email')
      .populate('notes.createdBy', 'name email role');

    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }

    // Calculate total cost
    const totalCost = workOrder.services.reduce((sum, service) => {
      return sum + (service.laborCost || 0) + (service.materialCost || 0);
    }, 0);

    // Calculate completion percentage
    const totalTasks = workOrder.services.length;
    const completedTasks = workOrder.services.filter(
      service => service.status === 'completed'
    ).length;
    const completionPercentage = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    // Prepare response data
    const responseData = {
      ...workOrder.toObject(),
      totalCost,
      completionPercentage,
      totalTasks,
      completedTasks
    };

    res.status(200).json({
      status: 'success',
      data: {
        workOrder: responseData
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
  try {
    const workOrder = await WorkOrder.findById(req.params.id)
      .populate('building', 'name address')
      .populate('createdBy', 'name email')
      .populate({
        path: 'assignedTo.worker',
        select: 'name email role',
        options: { allowEmptyArray: true }
      })
      .populate({
        path: 'services.completedBy',
        select: 'name email',
        options: { allowEmptyArray: true }
      })
      .populate({
        path: 'tasks.completedBy',
        select: 'name email',
        options: { allowEmptyArray: true }
      })
      .populate({
        path: 'notes.createdBy',
        select: 'name email',
        options: { allowEmptyArray: true }
      });

    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }

    // Check if user has permission to view this work order
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isSupervisor = req.user.role === 'supervisor';
    const isAssigned = workOrder.assignedTo.some(
      assignment => assignment.worker._id.toString() === req.user._id.toString()
    );

    if (!isAdmin && !isSupervisor && !isAssigned) {
      return next(new AppError('You do not have permission to view this work order', 403));
    }

    res.status(200).json({
      status: 'success',
      data: {
        workOrder
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Get work order statistics for a building
exports.getWorkOrderStats = catchAsync(async (req, res, next) => {
  try {
    const { buildingId } = req.params;
    const { startDate, endDate } = req.query;

    // 1) Build date filter if dates provided
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // 2) Build the main query
    const query = { building: buildingId };
    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }

    // 3) Get counts by status
    const stats = await WorkOrder.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCost: { $sum: { $add: ['$totalCost', 0] } },
          avgCompletionTime: { $avg: { $subtract: ['$completedAt', '$createdAt'] } }
        }
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1,
          totalCost: 1,
          avgCompletionTime: 1
        }
      },
      { $sort: { status: 1 } }
    ]);

    // 4) Get total work orders
    const totalWorkOrders = await WorkOrder.countDocuments(query);

    // 5) Get average completion time for completed work orders
    const completedWorkOrders = await WorkOrder.aggregate([
      {
        $match: { ...query, status: 'completed' }
      },
      {
        $group: {
          _id: null,
          avgCompletionTime: { $avg: { $subtract: ['$completedAt', '$createdAt'] } },
          totalCost: { $sum: { $add: ['$totalCost', 0] } }
        }
      }
    ]);

    // 6) Format the response
    const result = {
      status: 'success',
      data: {
        stats,
        totalWorkOrders,
        avgCompletionTime: completedWorkOrders[0]?.avgCompletionTime || 0,
        totalCost: completedWorkOrders[0]?.totalCost || 0
      }
    };
    
    res.status(200).json(result);
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Update work order status
exports.updateWorkOrderStatus = catchAsync(async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return next(new AppError('Status is required', 400));
    }
    
    const validStatuses = ['pending', 'in_progress', 'on_hold', 'completed', 'cancelled', 'pending_review', 'issue_reported'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid status value', 400));
    }
    
    const workOrder = await WorkOrder.findById(req.params.id);
    
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }
    
    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isSupervisor = req.user.role === 'supervisor';
    const isAssigned = workOrder.assignedTo.some(
      assignment => assignment.worker.toString() === req.user._id.toString()
    );
    
    if (!isAdmin && !isSupervisor && !isAssigned) {
      return next(new AppError('You do not have permission to update this work order status', 403));
    }
    
    // Update the status
    workOrder.status = status;
    workOrder.updatedBy = req.user._id;
    
    // Set completion date if status is completed
    if (status === 'completed' && !workOrder.completedAt) {
      workOrder.completedAt = new Date();
      workOrder.completedBy = req.user._id;
    }
    
    await workOrder.save();
    
    // Populate the updated work order
    const updatedWorkOrder = await WorkOrder.findById(workOrder._id)
      .populate('building', 'name address')
      .populate('assignedTo.worker', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    res.status(200).json({
      status: 'success',
      data: {
        workOrder: updatedWorkOrder
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Helper function to handle common error cases
const handleWorkOrderError = (error, next) => {
  console.error('Work Order Error:', {
    name: error.name,
    message: error.message,
    code: error.code,
    errors: error.errors,
    stack: error.stack
  });
  
  // Handle validation errors
  if (error.name === 'ValidationError') {
    const messages = Object.entries(error.errors).map(([field, err]) => 
      `${field}: ${err.message}`
    );
    return next(new AppError(`Validation Error: ${messages.join('. ')}`, 400));
  }
  
  // Handle duplicate field errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'unknown field';
    return next(new AppError(`Duplicate field value: ${field}. Please use another value.`, 400));
  }
  
  // Handle CastError (invalid ObjectId)
  if (error.name === 'CastError') {
    const message = error.path === '_id' 
      ? `Invalid ID format: ${error.value}`
      : `Invalid ${error.path}: ${error.value}`;
    return next(new AppError(message, 400));
  }
  
  // Handle missing required fields
  if (error.message && error.message.includes('Path `') && error.message.includes('` is required')) {
    const field = error.message.match(/Path `([^`]+)`/)[1];
    return next(new AppError(`Missing required field: ${field}`, 400));
  }
  
  // Default error handler with more detailed message
  console.error('=== UNHANDLED ERROR IN handleWorkOrderError ===');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  console.error('Error code:', error.code);
  console.error('Error statusCode:', error.statusCode);
  
  return next(new AppError(
    error.message || 'An unexpected error occurred. Please try again.', 
    error.statusCode || 500
  ));
};

// ...
// Get all work orders with filtering, sorting, and pagination
exports.getAllWorkOrders = catchAsync(async (req, res, next) => {
  try {
    // 1) Filtering
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 2) Advanced filtering (gt, gte, lt, lte)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    let query = WorkOrder.find(JSON.parse(queryStr))
      .populate('building', 'name address')
      .populate('createdBy', 'name email')
      .populate('assignedTo.worker', 'name email role');

    // 3) Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // 4) Field limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v');
    }

    // 5) Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    // Execute query
    const workOrders = await query;
    const total = await WorkOrder.countDocuments(JSON.parse(queryStr));

    // Send response
    res.status(200).json({
      status: 'success',
      results: workOrders.length,
      data: {
        workOrders
      },
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// Update work order with improved error handling
exports.updateWorkOrder = catchAsync(async (req, res, next) => {
  try {
    // 1) Find work order and check if it exists
    let workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }

    // 2) Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isSupervisor = req.user.role === 'supervisor';
    const isAssignedWorker = workOrder.assignedTo.some(
      assignment => assignment.worker.toString() === req.user._id.toString()
    );

    if (!isAdmin && !isSupervisor && !isAssignedWorker) {
      return next(new AppError('You do not have permission to update this work order', 403));
    }

    // 3) Define allowed fields and prepare update data
    const allowedFields = [
      'title', 'apartmentNumber', 'block', 'description', 'priority', 
      'status', 'scheduledDate', 'estimatedCompletionDate', 'notes', 
      'apartmentStatus', 'isEmergency', 'building'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // 4) Process file uploads if any
    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(file => 
          uploadToCloudinary(file, 'work-orders')
        );
        const existingPhotos = Array.isArray(workOrder.photos) 
          ? workOrder.photos 
          : [];
        const newPhotos = await Promise.all(uploadPromises);
        updateData.photos = [...existingPhotos, ...newPhotos];
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return next(new AppError('Error uploading one or more files', 500));
      }
    }

    // 5) Process services if provided
    if (req.body.services) {
      if (!Array.isArray(req.body.services) || req.body.services.length === 0) {
        return next(new AppError('At least one service is required', 400));
      }
      updateData.services = processServices(req.body.services);
    }

    // 6) Process worker assignments if provided
    if (req.body.assignedTo && (isAdmin || isSupervisor)) {
      updateData.assignedTo = processAssignments(req.body.assignedTo, req.user);
    }

    // 7) Update the work order
    const updatedWorkOrder = await WorkOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .populate('assignedTo.worker', 'name email role');

    if (!updatedWorkOrder) {
      return next(new AppError('No work order found with that ID', 404));
    }

    // 8) Send notifications if workers were assigned
    if (req.body.assignedTo && updatedWorkOrder.assignedTo.length > 0) {
      try {
        const newlyAssigned = updatedWorkOrder.assignedTo
          .filter(assignment => 
            !workOrder.assignedTo.some(
              oldAssignment => oldAssignment.worker.toString() === assignment.worker._id.toString()
            )
          )
          .map(assignment => assignment.worker._id);

        if (newlyAssigned.length > 0 && (isAdmin || isSupervisor)) {
          await Promise.all(
            newlyAssigned.map(workerId => 
              sendWorkOrderAssignedEmail(workerId, updatedWorkOrder, req.user)
            )
          );
        }
      } catch (emailError) {
        console.error('Error sending assignment emails:', emailError);
        // Don't fail the request if email sending fails
      }
    }

    // 9) Send success response
    res.status(200).json({
      status: 'success',
      data: {
        workOrder: updatedWorkOrder
      }
    });
  } catch (error) {
    handleWorkOrderError(error, next);
  }
});

// @desc    Delete a work order
// @route   DELETE /api/v1/work-orders/:id
// @access  Private/Admin/Manager
exports.deleteWorkOrder = catchAsync(async (req, res, next) => {
  console.log('Delete work order request received:', {
    workOrderId: req.params.id,
    userId: req.user?.id,
    userRole: req.user?.role
  });

  try {
    // 1) Find the work order and check if it exists
    const workOrder = await WorkOrder.findById(req.params.id);
    console.log('Found work order:', workOrder ? workOrder._id : 'Not found');
    
    if (!workOrder) {
      console.log('Work order not found:', req.params.id);
      return res.status(404).json({
        status: 'error',
        message: 'No work order found with that ID'
      });
    }

    // 2) Check if the user has permission to delete
    // Only admins and managers can delete work orders
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      console.log('User does not have permission to delete work orders:', {
        userId: req.user.id,
        role: req.user.role
      });
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete work orders'
      });
    }

    // 3) Check if the work order can be deleted
    // Prevent deletion if the work order is in progress or completed
    if (workOrder.status === 'in_progress' || workOrder.status === 'completed') {
      console.log('Cannot delete work order with status:', workOrder.status);
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete a work order that is in progress or completed. Please cancel it first.'
      });
    }

    // 4) Delete associated files (photos, documents, etc.)
    if (workOrder.photos && workOrder.photos.length > 0) {
      console.log('Deleting associated files for work order:', workOrder._id);
      try {
        // Delete files from storage (e.g., S3, local storage)
        const deletePromises = workOrder.photos.map(photo => {
          if (photo.url) {
            console.log('Would delete file:', photo.url);
            // Example: Delete from cloud storage
            // return deleteFromCloudinary(photo.publicId);
            return Promise.resolve();
          }
          return Promise.resolve();
        });
        await Promise.all(deletePromises);
      } catch (error) {
        console.error('Error deleting work order files - continuing with deletion:', error);
        // Continue with deletion even if file deletion fails
      }
    }

    // 5) Delete the work order
    console.log('Deleting work order from database:', workOrder._id);
    const deletedWorkOrder = await WorkOrder.findByIdAndDelete(req.params.id);
    
    if (!deletedWorkOrder) {
      console.error('Failed to delete work order - not found:', req.params.id);
      return res.status(404).json({
        status: 'error',
        message: 'Work order not found or already deleted'
      });
    }

    // 6) Clean up any related data
    console.log('Cleaning up related data for work order:', workOrder._id);
    try {
      await Promise.all([
        // Remove work order reference from assigned workers
        User.updateMany(
          { 'assignedWorkOrders': req.params.id },
          { $pull: { assignedWorkOrders: req.params.id } }
        ),
        // Remove work order reference from buildings
        Building.updateMany(
          { 'workOrders': req.params.id },
          { $pull: { workOrders: req.params.id } }
        )
      ]);
      console.log('Successfully cleaned up related data');
    } catch (cleanupError) {
      console.error('Error during cleanup - work order was deleted but cleanup failed:', cleanupError);
      // Continue with response even if cleanup fails
    }

    // 7) Log the deletion
    console.log(`Work order ${req.params.id} successfully deleted by user ${req.user.id}`);

    // 8) Send success response with 200 status code and success message
    res.status(200).json({
      status: 'success',
      message: 'Work order deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Error in deleteWorkOrder:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      keyValue: error.keyValue
    });
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'An error occurred while deleting the work order',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});
