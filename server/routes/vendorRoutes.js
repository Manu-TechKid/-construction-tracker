const express = require('express');
const vendorController = require('../controllers/vendorController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(restrictToRoles('admin', 'manager', 'supervisor'), vendorController.getAllVendors)
  .post(restrictToRoles('admin', 'manager'), vendorController.createVendor);

router
  .route('/:id')
  .get(restrictToRoles('admin', 'manager', 'supervisor'), vendorController.getVendor)
  .patch(restrictToRoles('admin', 'manager'), vendorController.updateVendor)
  .delete(restrictToRoles('admin', 'manager'), vendorController.deleteVendor);

module.exports = router;
