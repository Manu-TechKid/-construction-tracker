const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Dashboard analytics
router.get('/dashboard', analyticsController.getDashboardStats);

// Time tracking analytics
router.get('/time-tracking', analyticsController.getTimeTrackingAnalytics);

// Work order analytics
router.get('/work-orders', analyticsController.getWorkOrderAnalytics);

module.exports = router;