const WorkOrder = require('../models/WorkOrder');
const Reminder = require('../models/Reminder');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const path = require('path');
const fs = require('fs');

// @desc    Upload photos for work order
// @route   POST /api/v1/work-orders/:id/photos
// @access  Private
exports.uploadWorkOrderPhotos = catchAsync(async (req, res, next) => {
  const workOrder = await WorkOrder.findById(req.params.id);
  
  if (!workOrder) {
    return next(new AppError('No work order found with that ID', 404));
  }

  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one photo', 400));
  }

  // Process uploaded files
  const photos = req.files.map(file => ({
    url: `/uploads/${file.filename}`,
    description: req.body.description || '',
    uploadedBy: req.user.id,
    uploadedAt: new Date()
  }));

  // Add photos to work order
  workOrder.photos.push(...photos);
  await workOrder.save();

  res.status(200).json({
    status: 'success',
    data: {
      photos: photos
    }
  });
});

// @desc    Upload photos for reminder
// @route   POST /api/v1/reminders/:id/photos
// @access  Private
exports.uploadReminderPhotos = catchAsync(async (req, res, next) => {
  const reminder = await Reminder.findById(req.params.id);
  
  if (!reminder) {
    return next(new AppError('No reminder found with that ID', 404));
  }

  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one photo', 400));
  }

  // Process uploaded files
  const photos = req.files.map(file => ({
    url: `/uploads/${file.filename}`,
    description: req.body.description || '',
    uploadedBy: req.user.id,
    uploadedAt: new Date()
  }));

  // Add photos to reminder
  reminder.photos.push(...photos);
  await reminder.save();

  res.status(200).json({
    status: 'success',
    data: {
      photos: photos
    }
  });
});

// @desc    Delete photo from work order
// @route   DELETE /api/v1/work-orders/:id/photos/:photoId
// @access  Private
exports.deleteWorkOrderPhoto = catchAsync(async (req, res, next) => {
  const workOrder = await WorkOrder.findById(req.params.id);
  
  if (!workOrder) {
    return next(new AppError('No work order found with that ID', 404));
  }

  const photo = workOrder.photos.id(req.params.photoId);
  if (!photo) {
    return next(new AppError('No photo found with that ID', 404));
  }

  // Delete file from filesystem
  const filePath = path.join(__dirname, '../public', photo.url);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Remove photo from work order
  workOrder.photos.pull(req.params.photoId);
  await workOrder.save();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Delete photo from reminder
// @route   DELETE /api/v1/reminders/:id/photos/:photoId
// @access  Private
exports.deleteReminderPhoto = catchAsync(async (req, res, next) => {
  const reminder = await Reminder.findById(req.params.id);
  
  if (!reminder) {
    return next(new AppError('No reminder found with that ID', 404));
  }

  const photo = reminder.photos.id(req.params.photoId);
  if (!photo) {
    return next(new AppError('No photo found with that ID', 404));
  }

  // Delete file from filesystem
  const filePath = path.join(__dirname, '../public', photo.url);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Remove photo from reminder
  reminder.photos.pull(req.params.photoId);
  await reminder.save();

  res.status(204).json({
    status: 'success',
    data: null
  });
});
