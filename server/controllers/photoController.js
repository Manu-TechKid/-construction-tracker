const WorkOrder = require('../models/WorkOrder');
const Reminder = require('../models/Reminder');
const SitePhoto = require('../models/SitePhoto');
const Building = require('../models/Building');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { optimizePhoto, getStorageStats, cleanupOldPhotos } = require('../utils/photoOptimizer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for site photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/site-photos');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `site-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed', 400), false);
    }
  }
});

exports.uploadSitePhotos = upload.fields([
  { name: 'originalPhoto', maxCount: 1 },
  { name: 'annotatedPhoto', maxCount: 1 }
]);

// @desc    Upload photos for work order
// @route   POST /api/v1/work-orders/:id/photos
// @access  Private
exports.uploadWorkOrderPhotos = catchAsync(async (req, res, next) => {
  const workOrder = await WorkOrder.findById(req.params.id);

  if (!workOrder) {
    return next(new AppError('No work order found with that ID', 404));
  }

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return next(new AppError('Please upload at least one photo', 400));
  }

  const optimizedPhotos = [];
  const outputDir = path.join(__dirname, '../public/uploads/photos');

  // Process and optimize each uploaded file
  for (const file of req.files) {
    try {
      const optimizationResult = await optimizePhoto(
        file.path,
        outputDir,
        file.filename
      );

      // Create photo object with all optimized versions
      const photoData = {
        thumbnail: `/uploads/photos/${optimizationResult.thumbnail.filename}`,
        medium: `/uploads/photos/${optimizationResult.medium.filename}`,
        original: `/uploads/photos/${optimizationResult.original.filename}`,
        caption: req.body.description || '',
        type: req.body.type || 'other',
        uploadedBy: req.user.id,
        uploadedAt: new Date(),
        metadata: optimizationResult.metadata,
        compressionStats: optimizationResult.compressionStats
      };

      optimizedPhotos.push(photoData);
    } catch (error) {
      console.error('Photo optimization failed:', error);
      // Fallback to original file if optimization fails
      const photoData = {
        url: `/uploads/photos/${file.filename}`,
        caption: req.body.description || '',
        type: req.body.type || 'other',
        uploadedBy: req.user.id,
        uploadedAt: new Date()
      };
      optimizedPhotos.push(photoData);
    }
  }

  // Add photos to work order
  workOrder.photos.push(...optimizedPhotos);
  await workOrder.save();

  res.status(200).json({
    status: 'success',
    data: {
      photos: optimizedPhotos,
      message: 'Photos uploaded and optimized successfully'
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
    caption: req.body.description || '',
    type: req.body.type || 'other',
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

// ============ SITE PHOTO CONTROLLERS ============

// @desc    Create site photo with annotations
// @route   POST /api/v1/photos/site
// @access  Private
exports.createSitePhoto = catchAsync(async (req, res, next) => {
  const { buildingId, mode, notes, annotations, timestamp, zoom, panOffset } = req.body;

  // Verify building exists
  const building = await Building.findById(buildingId);
  if (!building) {
    return next(new AppError('Building not found', 404));
  }

  // Process uploaded files
  let originalPhotoUrl = null;
  let annotatedPhotoUrl = null;

  if (req.files) {
    if (req.files.originalPhoto) {
      originalPhotoUrl = `/uploads/site-photos/${req.files.originalPhoto[0].filename}`;
    }
    if (req.files.annotatedPhoto) {
      annotatedPhotoUrl = `/uploads/site-photos/${req.files.annotatedPhoto[0].filename}`;
    }
  }

  // Parse annotations if it's a string
  let parsedAnnotations = [];
  if (annotations) {
    try {
      parsedAnnotations = typeof annotations === 'string' ? JSON.parse(annotations) : annotations;
    } catch (error) {
      parsedAnnotations = [];
    }
  }

  // Parse panOffset if it's a string
  let parsedPanOffset = { x: 0, y: 0 };
  if (panOffset) {
    try {
      parsedPanOffset = typeof panOffset === 'string' ? JSON.parse(panOffset) : panOffset;
    } catch (error) {
      parsedPanOffset = { x: 0, y: 0 };
    }
  }

  const sitePhoto = await SitePhoto.create({
    building: buildingId,
    originalPhoto: originalPhotoUrl,
    annotatedPhoto: annotatedPhotoUrl,
    mode: mode || 'estimate',
    notes: notes || '',
    annotations: parsedAnnotations,
    timestamp: timestamp || new Date(),
    zoom: zoom ? parseFloat(zoom) : 1,
    panOffset: parsedPanOffset,
    createdBy: req.user.id
  });

  await sitePhoto.populate('building', 'name address');
  await sitePhoto.populate('createdBy', 'name email');

  res.status(201).json({
    status: 'success',
    data: {
      photo: sitePhoto
    }
  });
});

// @desc    Get site photos for a building
// @route   GET /api/v1/photos/site/:buildingId
// @access  Private
exports.getSitePhotos = catchAsync(async (req, res, next) => {
  const { buildingId } = req.params;
  const { mode, page = 1, limit = 50 } = req.query;

  // Verify building exists
  const building = await Building.findById(buildingId);
  if (!building) {
    return next(new AppError('Building not found', 404));
  }

  // Build query
  const query = { building: buildingId };
  if (mode) {
    query.mode = mode;
  }

  const photos = await SitePhoto.find(query)
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await SitePhoto.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: photos.length,
    total,
    data: {
      photos
    }
  });
});

// @desc    Get specific site photo
// @route   GET /api/v1/photos/site/photo/:photoId
// @access  Private
exports.getSitePhotoById = catchAsync(async (req, res, next) => {
  const photo = await SitePhoto.findById(req.params.photoId)
    .populate('building', 'name address')
    .populate('createdBy', 'name email');

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

// @desc    Update site photo
// @route   PUT /api/v1/photos/site/:photoId
// @access  Private
exports.updateSitePhoto = catchAsync(async (req, res, next) => {
  const { photoId } = req.params;
  const { mode, notes, annotations, timestamp, zoom, panOffset } = req.body;

  const photo = await SitePhoto.findById(photoId);
  if (!photo) {
    return next(new AppError('Photo not found', 404));
  }

  // Check if user can update this photo
  if (photo.createdBy.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('You can only update your own photos', 403));
  }

  // Process uploaded files
  if (req.files) {
    if (req.files.originalPhoto) {
      // Delete old file if exists
      if (photo.originalPhoto) {
        const oldPath = path.join(__dirname, '../public', photo.originalPhoto);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      photo.originalPhoto = `/uploads/site-photos/${req.files.originalPhoto[0].filename}`;
    }
    
    if (req.files.annotatedPhoto) {
      // Delete old file if exists
      if (photo.annotatedPhoto) {
        const oldPath = path.join(__dirname, '../public', photo.annotatedPhoto);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      photo.annotatedPhoto = `/uploads/site-photos/${req.files.annotatedPhoto[0].filename}`;
    }
  }

  // Update fields
  if (mode) photo.mode = mode;
  if (notes !== undefined) photo.notes = notes;
  if (timestamp) photo.timestamp = timestamp;
  if (zoom) photo.zoom = parseFloat(zoom);

  if (annotations) {
    try {
      photo.annotations = typeof annotations === 'string' ? JSON.parse(annotations) : annotations;
    } catch (error) {
      // Keep existing annotations if parsing fails
    }
  }

  if (panOffset) {
    try {
      photo.panOffset = typeof panOffset === 'string' ? JSON.parse(panOffset) : panOffset;
    } catch (error) {
      // Keep existing panOffset if parsing fails
    }
  }

  photo.updatedAt = new Date();
  await photo.save();

  await photo.populate('building', 'name address');
  await photo.populate('createdBy', 'name email');

  res.status(200).json({
    status: 'success',
    data: {
      photo
    }
  });
});

// @desc    Delete site photo
// @route   DELETE /api/v1/photos/site/:photoId
// @access  Private
exports.deleteSitePhoto = catchAsync(async (req, res, next) => {
  const photo = await SitePhoto.findById(req.params.photoId);

  if (!photo) {
    return next(new AppError('Photo not found', 404));
  }

  // Check if user can delete this photo
  if (photo.createdBy.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('You can only delete your own photos', 403));
  }

  // Delete files from filesystem
  if (photo.originalPhoto) {
    const originalPath = path.join(__dirname, '../public', photo.originalPhoto);
    if (fs.existsSync(originalPath)) {
      fs.unlinkSync(originalPath);
    }
  }

  if (photo.annotatedPhoto) {
    const annotatedPath = path.join(__dirname, '../public', photo.annotatedPhoto);
    if (fs.existsSync(annotatedPath)) {
      fs.unlinkSync(annotatedPath);
    }
  }

  await SitePhoto.findByIdAndDelete(req.params.photoId);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Get photos by type for a building
// @route   GET /api/v1/photos/site/:buildingId/type/:type
// @access  Private
exports.getPhotosByType = catchAsync(async (req, res, next) => {
  const { buildingId, type } = req.params;

  const photos = await SitePhoto.find({
    building: buildingId,
    mode: type
  })
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .sort({ timestamp: -1 });

  res.status(200).json({
    status: 'success',
    results: photos.length,
    data: {
      photos
    }
  });
});

// @desc    Get photo statistics for a building
// @route   GET /api/v1/photos/site/:buildingId/stats
// @access  Private
exports.getPhotoStats = catchAsync(async (req, res, next) => {
  const { buildingId } = req.params;

  const stats = await SitePhoto.aggregate([
    { $match: { building: buildingId } },
    {
      $group: {
        _id: '$mode',
        count: { $sum: 1 },
        latestPhoto: { $max: '$timestamp' }
      }
    }
  ]);

  const totalPhotos = await SitePhoto.countDocuments({ building: buildingId });

  res.status(200).json({
    status: 'success',
    data: {
      totalPhotos,
      byType: stats
    }
  });
});

// @desc    Get site photo by ID
// @route   GET /api/v1/photos/site/photo/:photoId
// @access  Private
exports.getSitePhotoById = catchAsync(async (req, res, next) => {
  const photo = await SitePhoto.findById(req.params.photoId)
    .populate('building', 'name address')
    .populate('createdBy', 'name email');

  if (!photo) {
    return next(new AppError('Photo not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { photo }
  });
});

// @desc    Update site photo
// @route   PUT /api/v1/photos/site/photo/:photoId
// @access  Private
exports.updateSitePhoto = catchAsync(async (req, res, next) => {
  const { photoId } = req.params;
  const { notes, annotations, zoom, panOffset, mode } = req.body;

  const photo = await SitePhoto.findById(photoId);
  if (!photo) {
    return next(new AppError('Photo not found', 404));
  }

  // Update fields
  if (notes !== undefined) photo.notes = notes;
  if (mode !== undefined) photo.mode = mode;
  if (zoom !== undefined) photo.zoom = parseFloat(zoom);
  
  if (annotations) {
    try {
      photo.annotations = typeof annotations === 'string' ? JSON.parse(annotations) : annotations;
    } catch (error) {
      photo.annotations = [];
    }
  }

  if (panOffset) {
    try {
      photo.panOffset = typeof panOffset === 'string' ? JSON.parse(panOffset) : panOffset;
    } catch (error) {
      photo.panOffset = { x: 0, y: 0 };
    }
  }

  // Handle file uploads if present
  if (req.files) {
    if (req.files.originalPhoto) {
      photo.originalPhoto = `/uploads/site-photos/${req.files.originalPhoto[0].filename}`;
    }
    if (req.files.annotatedPhoto) {
      photo.annotatedPhoto = `/uploads/site-photos/${req.files.annotatedPhoto[0].filename}`;
    }
  }

  await photo.save();
  await photo.populate('building', 'name address');
  await photo.populate('createdBy', 'name email');

  res.status(200).json({
    status: 'success',
    data: { photo }
  });
});

// @desc    Delete site photo
// @route   DELETE /api/v1/photos/site/photo/:photoId
// @access  Private
exports.deleteSitePhoto = catchAsync(async (req, res, next) => {
  const photo = await SitePhoto.findById(req.params.photoId);
  
  if (!photo) {
    return next(new AppError('Photo not found', 404));
  }

  // Delete files from filesystem
  if (photo.originalPhoto) {
    const originalPath = path.join(__dirname, '../public', photo.originalPhoto);
    if (fs.existsSync(originalPath)) {
      fs.unlinkSync(originalPath);
    }
  }
  
  if (photo.annotatedPhoto) {
    const annotatedPath = path.join(__dirname, '../public', photo.annotatedPhoto);
    if (fs.existsSync(annotatedPath)) {
      fs.unlinkSync(annotatedPath);
    }
  }

  await SitePhoto.findByIdAndDelete(req.params.photoId);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Get photos by type
// @route   GET /api/v1/photos/site/:buildingId/type/:type
// @access  Private
exports.getPhotosByType = catchAsync(async (req, res, next) => {
  const { buildingId, type } = req.params;

  const photos = await SitePhoto.find({ 
    building: buildingId, 
    mode: type 
  })
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .sort({ timestamp: -1 });

  res.status(200).json({
    status: 'success',
    results: photos.length,
    data: { photos }
  });
});

// @desc    Bulk upload photos
// @route   POST /api/v1/photos/site/bulk
// @access  Private
exports.bulkUploadPhotos = catchAsync(async (req, res, next) => {
  // This is a placeholder for bulk upload functionality
  res.status(200).json({
    status: 'success',
    message: 'Bulk upload functionality not yet implemented'
  });
});

// @desc    Export building photos
// @route   POST /api/v1/photos/site/:buildingId/export
// @access  Private
exports.exportBuildingPhotos = catchAsync(async (req, res, next) => {
  // This is a placeholder for export functionality
  res.status(200).json({
    status: 'success',
    message: 'Export functionality not yet implemented'
  });
});

// @desc    Get all photos (admin)
// @route   GET /api/v1/photos/admin/all
// @access  Admin
exports.getAllPhotos = catchAsync(async (req, res, next) => {
  const photos = await SitePhoto.find()
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .sort({ timestamp: -1 });

  res.status(200).json({
    status: 'success',
    results: photos.length,
    data: { photos }
  });
});

// @desc    Get storage statistics (admin)
// @route   GET /api/v1/photos/admin/storage-stats
// @access  Admin
exports.getStorageStatistics = catchAsync(async (req, res, next) => {
  const uploadsDir = path.join(__dirname, '../public/uploads');
  const stats = await getStorageStats(uploadsDir);
  
  if (!stats) {
    return next(new AppError('Failed to get storage statistics', 500));
  }

  // Get MongoDB photo count for comparison
  const workOrderPhotos = await WorkOrder.aggregate([
    { $unwind: '$photos' },
    { $count: 'total' }
  ]);
  
  const sitePhotos = await SitePhoto.countDocuments();
  
  const dbPhotoCount = (workOrderPhotos[0]?.total || 0) + sitePhotos;

  res.status(200).json({
    status: 'success',
    data: {
      storage: stats,
      database: {
        workOrderPhotos: workOrderPhotos[0]?.total || 0,
        sitePhotos,
        totalPhotos: dbPhotoCount
      },
      recommendations: {
        compressionSavings: stats.totalSize > 100 * 1024 * 1024 ? 'Consider running photo optimization' : 'Storage usage is optimal',
        cleanup: stats.totalFiles > 1000 ? 'Consider cleaning up old photos' : 'File count is manageable'
      }
    }
  });
});

// @desc    Cleanup old photos (admin)
// @route   DELETE /api/v1/photos/admin/cleanup
// @access  Admin
exports.cleanupOldPhotos = catchAsync(async (req, res, next) => {
  const { maxAgeInDays = 365 } = req.body;
  const uploadsDir = path.join(__dirname, '../public/uploads');
  
  const cleanupResult = await cleanupOldPhotos(uploadsDir, maxAgeInDays);
  
  res.status(200).json({
    status: 'success',
    data: {
      ...cleanupResult,
      message: `Cleaned up ${cleanupResult.deletedFiles} files, freed ${cleanupResult.freedSpaceFormatted}`
    }
  });
});

// @desc    Optimize existing photos (admin)
// @route   POST /api/v1/photos/admin/optimize
// @access  Admin
exports.optimizeExistingPhotos = catchAsync(async (req, res, next) => {
  // This would be a batch operation to optimize existing unoptimized photos
  // For now, return a placeholder response
  res.status(200).json({
    status: 'success',
    message: 'Batch optimization functionality will be implemented in future updates',
    recommendation: 'New uploads are automatically optimized. Consider this feature for large existing photo collections.'
  });
});
