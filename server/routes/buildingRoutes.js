const express = require('express');
const buildingController = require('../controllers/buildingController');
const authController = require('../controllers/authController');
const { uploadSingle, uploadMultiple } = require('../utils/multer');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Routes for buildings
router
  .route('/')
  .get(buildingController.getAllBuildings)
  .post(buildingController.createBuilding);

// Routes for specific building
router
  .route('/:id')
  .get(buildingController.getBuilding)
  .patch(
    authController.restrictTo('admin', 'manager'),
    buildingController.updateBuilding
  )
  .delete(
    authController.restrictTo('admin'),
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
    buildingController.addApartment
  );

router
  .route('/:id/apartments/:apartmentId')
  .patch(
    authController.restrictTo('admin', 'manager'),
    buildingController.updateApartment
  )
  .delete(
    authController.restrictTo('admin'),
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
