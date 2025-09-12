const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const WorkOrder = require('../models/WorkOrder');
const authController = require('../controllers/authController');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/photos');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `workorder-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Protect all routes
router.use(authController.protect);

// Signed upload payload for Cloudinary direct uploads
router.post('/sign', uploadController.getUploadSignature);

// Upload photo to work order
router.post('/photo', upload.single('photo'), catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No photo file provided', 400));
  }

  const { workOrderId, description, type } = req.body;

  if (!workOrderId) {
    return next(new AppError('Work order ID is required', 400));
  }

  // Find work order
  const workOrder = await WorkOrder.findById(workOrderId);
  if (!workOrder) {
    return next(new AppError('Work order not found', 404));
  }

  // Create photo object with proper URL structure
  const photoUrl = `/api/v1/uploads/photos/${req.file.filename}`;
  const photo = {
    url: photoUrl,
    path: photoUrl, // Add path field for compatibility
    filename: req.file.filename, // Add filename for direct access
    description: description || '',
    type: type || 'other',
    uploadedBy: req.user.id,
    uploadedAt: new Date()
  };

  // Add photo to work order
  workOrder.photos.push(photo);
  await workOrder.save();

  res.status(201).json({
    status: 'success',
    data: {
      photo,
      workOrder: workOrder._id
    }
  });
}));

// Delete photo from work order
router.delete('/photo/:workOrderId/:photoId', catchAsync(async (req, res, next) => {
  const { workOrderId, photoId } = req.params;

  const workOrder = await WorkOrder.findById(workOrderId);
  if (!workOrder) {
    return next(new AppError('Work order not found', 404));
  }

  // Find and remove photo
  const photoIndex = workOrder.photos.findIndex(photo => photo._id.toString() === photoId);
  if (photoIndex === -1) {
    return next(new AppError('Photo not found', 404));
  }

  const photo = workOrder.photos[photoIndex];
  
  // Delete file from filesystem
  const filePath = path.join(__dirname, '../public', photo.url);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Remove from database
  workOrder.photos.splice(photoIndex, 1);
  await workOrder.save();

  res.status(200).json({
    status: 'success',
    message: 'Photo deleted successfully'
  });
}));

// Update photo metadata
router.patch('/photo/:workOrderId/:photoId', catchAsync(async (req, res, next) => {
  const { workOrderId, photoId } = req.params;
  const { description, type } = req.body;

  const workOrder = await WorkOrder.findById(workOrderId);
  if (!workOrder) {
    return next(new AppError('Work order not found', 404));
  }

  // Find and update photo
  const photo = workOrder.photos.id(photoId);
  if (!photo) {
    return next(new AppError('Photo not found', 404));
  }

  if (description !== undefined) photo.description = description;
  if (type !== undefined) photo.type = type;

  await workOrder.save();

  res.status(200).json({
    status: 'success',
    data: {
      photo
    }
  });
}));

module.exports = router;
