const express = require('express');
const router = express.Router();
const {
  checkInWorker,
  checkOutWorker,
  recordLocation,
  getLocationHistory,
  getWorkerStatus
} = require('../controllers/timeTrackingController');
const { protect, authorize } = require('../middleware/auth');

// Worker routes (protected, worker role required)
router.route('/workers/:id/check-in')
  .post(protect, authorize('worker', 'admin'), checkInWorker);

router.route('/workers/:id/check-out')
  .post(protect, authorize('worker', 'admin'), checkOutWorker);

router.route('/workers/:id/location')
  .post(protect, authorize('worker', 'admin'), recordLocation);

// Worker status (accessible by the worker and their managers/admins)
router.route('/workers/:id/status')
  .get(protect, authorize('worker', 'admin', 'manager'), getWorkerStatus);

// Location history (accessible by the worker and their managers/admins)
router.route('/workers/:id/location-history')
  .get(protect, authorize('worker', 'admin', 'manager'), getLocationHistory);

// Admin routes for managing worker time tracking
router.route('/admin/workers/:id/force-check-out')
  .post(protect, authorize('admin', 'manager'), checkOutWorker);

module.exports = router;
