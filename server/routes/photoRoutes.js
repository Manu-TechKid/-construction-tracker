const express = require('express');
const photoController = require('../controllers/photoController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Site photo routes
router.route('/site')
  .post(
    photoController.uploadSitePhotos,
    photoController.createSitePhoto
  );

router.route('/site/:buildingId')
  .get(photoController.getSitePhotos);

router.route('/site/photo/:photoId')
  .get(photoController.getSitePhotoById)
  .put(
    photoController.uploadSitePhotos,
    photoController.updateSitePhoto
  )
  .delete(photoController.deleteSitePhoto);

router.route('/site/:buildingId/type/:type')
  .get(photoController.getPhotosByType);

router.route('/site/:buildingId/stats')
  .get(photoController.getPhotoStats);

// Bulk operations
router.post('/site/bulk',
  photoController.uploadSitePhotos,
  photoController.bulkUploadPhotos
);

// Export functionality
router.post('/site/:buildingId/export',
  photoController.exportBuildingPhotos
);

// Admin only routes
router.use(restrictToRoles('admin', 'manager'));

// Admin photo management
router.get('/admin/all', photoController.getAllPhotos);
router.get('/admin/storage-stats', photoController.getStorageStatistics);
router.delete('/admin/cleanup', photoController.cleanupOldPhotos);
router.post('/admin/optimize', photoController.optimizeExistingPhotos);

module.exports = router;
