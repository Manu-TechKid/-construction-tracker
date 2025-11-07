const WorkPhoto = require('../models/WorkPhoto');
const User = require('../models/User');
const Building = require('../models/Building');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/work-photos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'work-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed', 400), false);
  }
};

exports.upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload work photos
exports.uploadWorkPhotos = catchAsync(async (req, res, next) => {
  const { workerId, buildingId, workOrderId, timeSessionId, title, description, notes, workType, apartmentNumber, tags } = req.body;

  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one photo', 400));
  }

  const uploadedPhotos = [];

  for (const file of req.files) {
    const photoData = {
      worker: workerId || req.user.id,
      building: buildingId || null,
      workOrder: workOrderId || null,
      timeSession: timeSessionId || null,
      photoUrl: `/uploads/work-photos/${file.filename}`,
      title: title || 'Work Progress Photo',
      description: description || '',
      notes: notes || '',
      workType: workType || 'other',
      apartmentNumber: apartmentNumber || null,
      fileSize: file.size,
      mimeType: file.mimetype,
      tags: tags ? JSON.parse(tags) : []
    };

    const photo = await WorkPhoto.create(photoData);
    await photo.populate('worker', 'name email');
    if (buildingId) {
      await photo.populate('building', 'name address');
    }

    uploadedPhotos.push(photo);
  }

  res.status(201).json({
    status: 'success',
    message: `${uploadedPhotos.length} photo(s) uploaded successfully`,
    data: {
      photos: uploadedPhotos
    }
  });
});

// Get work photos with filters
exports.getWorkPhotos = catchAsync(async (req, res, next) => {
  const { workerId, buildingId, workOrderId, status, isReviewed, startDate, endDate, limit = 50, page = 1 } = req.query;

  const query = {};

  if (workerId) query.worker = workerId;
  if (buildingId) query.building = buildingId;
  if (workOrderId) query.workOrder = workOrderId;
  if (status) query.status = status;
  if (isReviewed !== undefined) query.isReviewed = isReviewed === 'true';

  if (startDate || endDate) {
    query.uploadedAt = {};
    if (startDate) query.uploadedAt.$gte = new Date(startDate);
    if (endDate) query.uploadedAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const photos = await WorkPhoto.find(query)
    .populate('worker', 'name email')
    .populate('building', 'name address')
    .populate('workOrder', 'title')
    .populate('reviewedBy', 'name')
    .populate('adminComments.admin', 'name')
    .sort({ uploadedAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await WorkPhoto.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: photos.length,
    data: {
      photos,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

// Get single photo
exports.getWorkPhoto = catchAsync(async (req, res, next) => {
  const photo = await WorkPhoto.findById(req.params.id)
    .populate('worker', 'name email')
    .populate('building', 'name address')
    .populate('workOrder', 'title')
    .populate('reviewedBy', 'name')
    .populate('adminComments.admin', 'name');

  if (!photo) {
    return next(new AppError('Photo not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      photo
    }
  });
});

// Update photo details
exports.updateWorkPhoto = catchAsync(async (req, res, next) => {
  const { title, description, notes, workType, apartmentNumber, tags } = req.body;

  const photo = await WorkPhoto.findById(req.params.id);

  if (!photo) {
    return next(new AppError('Photo not found', 404));
  }

  // Check if user is the owner or admin
  if (photo.worker.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('You do not have permission to update this photo', 403));
  }

  if (title) photo.title = title;
  if (description) photo.description = description;
  if (notes) photo.notes = notes;
  if (workType) photo.workType = workType;
  if (apartmentNumber) photo.apartmentNumber = apartmentNumber;
  if (tags) photo.tags = tags;

  await photo.save();

  res.status(200).json({
    status: 'success',
    data: {
      photo
    }
  });
});

// Delete photo
exports.deleteWorkPhoto = catchAsync(async (req, res, next) => {
  const photo = await WorkPhoto.findById(req.params.id);

  if (!photo) {
    return next(new AppError('Photo not found', 404));
  }

  // Check if user is the owner or admin
  if (photo.worker.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('You do not have permission to delete this photo', 403));
  }

  // Delete physical file
  const filePath = path.join(__dirname, '..', photo.photoUrl);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.log('Error deleting file:', error.message);
  }

  await photo.deleteOne();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Admin: Add comment to photo
exports.addAdminComment = catchAsync(async (req, res, next) => {
  const { comment } = req.body;

  if (!comment) {
    return next(new AppError('Comment is required', 400));
  }

  const photo = await WorkPhoto.findById(req.params.id);

  if (!photo) {
    return next(new AppError('Photo not found', 404));
  }

  photo.adminComments.push({
    admin: req.user.id,
    comment: comment,
    createdAt: new Date()
  });

  await photo.save();
  await photo.populate('adminComments.admin', 'name');

  res.status(200).json({
    status: 'success',
    data: {
      photo
    }
  });
});

// Admin: Review photo
exports.reviewWorkPhoto = catchAsync(async (req, res, next) => {
  const { status, qualityRating, comment } = req.body;

  const photo = await WorkPhoto.findById(req.params.id);

  if (!photo) {
    return next(new AppError('Photo not found', 404));
  }

  photo.isReviewed = true;
  photo.reviewedBy = req.user.id;
  photo.reviewedAt = new Date();
  
  if (status) photo.status = status;
  if (qualityRating) photo.qualityRating = qualityRating;
  
  if (comment) {
    photo.adminComments.push({
      admin: req.user.id,
      comment: comment,
      createdAt: new Date()
    });
  }

  await photo.save();
  await photo.populate('reviewedBy', 'name');
  await photo.populate('adminComments.admin', 'name');

  res.status(200).json({
    status: 'success',
    data: {
      photo
    }
  });
});

// Get photo statistics
exports.getPhotoStats = catchAsync(async (req, res, next) => {
  const { workerId, buildingId, startDate, endDate } = req.query;

  const matchQuery = {};
  if (workerId) matchQuery.worker = mongoose.Types.ObjectId(workerId);
  if (buildingId) matchQuery.building = mongoose.Types.ObjectId(buildingId);
  if (startDate || endDate) {
    matchQuery.uploadedAt = {};
    if (startDate) matchQuery.uploadedAt.$gte = new Date(startDate);
    if (endDate) matchQuery.uploadedAt.$lte = new Date(endDate);
  }

  const stats = await WorkPhoto.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalPhotos: { $sum: 1 },
        pendingReview: {
          $sum: { $cond: [{ $eq: ['$isReviewed', false] }, 1, 0] }
        },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        avgQualityRating: { $avg: '$qualityRating' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: stats[0] || {
        totalPhotos: 0,
        pendingReview: 0,
        approved: 0,
        rejected: 0,
        avgQualityRating: 0
      }
    }
  });
});
