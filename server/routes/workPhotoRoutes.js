const express = require('express');
const workPhotoController = require('../controllers/workPhotoController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Upload photos (workers and admins)
router.post(
  '/upload',
  workPhotoController.upload.array('photos', 10),
  workPhotoController.uploadWorkPhotos
);

// Get photos with filters
router.get('/', workPhotoController.getWorkPhotos);

// Get photo statistics
router.get('/stats', workPhotoController.getPhotoStats);

// Get single photo
router.get('/:id', workPhotoController.getWorkPhoto);

// Update photo details
router.patch('/:id', workPhotoController.updateWorkPhoto);

// Delete photo
router.delete('/:id', workPhotoController.deleteWorkPhoto);

// Admin routes
router.post(
  '/:id/comment',
  restrictTo('admin', 'manager'),
  workPhotoController.addAdminComment
);

router.patch(
  '/:id/review',
  restrictTo('admin', 'manager'),
  workPhotoController.reviewWorkPhoto
);

module.exports = router;
