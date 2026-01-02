const express = require('express');
const activityLogController = require('../controllers/activityLogController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware and restrict to superuser
router.use(authController.protect, authController.restrictTo('superuser'));

router.route('/').get(activityLogController.getAllActivities);

module.exports = router;
