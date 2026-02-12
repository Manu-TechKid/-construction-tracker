const express = require('express');
const buildingController = require('../controllers/buildingController');
const authController = require('../controllers/authController');
const { uploadSingle, uploadMultiple } = require('../utils/multer');
const { hidePricesFromWorkers } = require('../middleware/roleMiddleware');
const logActivity = require('../middleware/activityLogger');

const router = express.Router();

// Public route to get all buildings (auth-aware)
router.route('/').get(authController.protect, buildingController.getAllBuildings);

// Protect all subsequent routes
router.use(authController.protect);

// Hide prices from workers on all routes
router.use(hidePricesFromWorkers);

// Protected route to create a building
router.route('/').post(logActivity('Building', 'create'), buildingController.createBuilding);

// Routes for specific building
router
  .route('/:id')
  .get(buildingController.getBuilding)
  .patch(
    authController.restrictTo('admin', 'manager'),
    logActivity('Building', 'update'),
    buildingController.updateBuilding
  )
  .delete(
    authController.restrictTo('admin'),
    logActivity('Building', 'delete'),
    buildingController.deleteBuilding
  );

// Get all reminders for a specific building
router.get(
  '/:id/reminders',
  authController.restrictTo('admin', 'manager', 'supervisor'),
  buildingController.getBuildingReminders
);

// Apartment routes
router
  .route('/:id/apartments')
  .post(
    authController.restrictTo('admin', 'manager'),
    logActivity('Apartment', 'create'),
    buildingController.addApartment
  );

router
  .route('/:id/apartments/:apartmentId')
  .patch(
    authController.restrictTo('admin', 'manager'),
    logActivity('Apartment', 'update'),
    buildingController.updateApartment
  )
  .delete(
    authController.restrictTo('admin'),
    logActivity('Apartment', 'delete'),
    buildingController.deleteApartment
  );

// Apartment photo routes
router.post(
  '/:id/apartments/:apartmentId/photos',
  authController.protect,
  authController.restrictTo('admin', 'manager'),
  uploadSingle('apartment', 'photo'),
  buildingController.uploadApartmentPhoto
);

router.patch(
  '/:id/apartments/:apartmentId/photos/:photoId/set-primary',
  authController.protect,
  authController.restrictTo('admin', 'manager'),
  buildingController.setApartmentPrimaryPhoto
);

router.delete(
  '/:id/apartments/:apartmentId/photos/:photoId',
  authController.protect,
  authController.restrictTo('admin', 'manager'),
  buildingController.deleteApartmentPhoto
);

module.exports = router;
