// Improved error handling for work order controller
const WorkOrder = require('../models/WorkOrder');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Building = require('../models/Building');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { sendWorkOrderAssignedEmail } = require('../services/emailService');

// Helper function to handle common error cases
const handleWorkOrderError = (error, next) => {
  console.error('Work Order Error:', error);
  
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    return next(new AppError(`Validation error: ${messages.join('. ')}`, 400));
  }
  
  if (error.name === 'CastError') {
    return next(new AppError(`Invalid ID format: ${error.value}`, 400));
  }
  
  if (error.code === 11000) {
    return next(new AppError('Duplicate field value. Please use another value.', 400));
  }
  
  // Log detailed error information for debugging
  console.error('Error Details:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error.errors && { errors: error.errors })
  });
  
  return next(new AppError(`An unexpected error occurred: ${error.message}`, 500));
};

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

// Export other controller functions as they were
module.exports = {
  ...require('./workOrderController'),
  updateWorkOrder: exports.updateWorkOrder,
  handleWorkOrderError
};
