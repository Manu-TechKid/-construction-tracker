const express = require('express');

const authRoutes = require('./authRoutes');
const buildingRoutes = require('./buildingRoutes');
const workOrderRoutes = require('./workOrderRoutes');
const workerRoutes = require('./workerRoutes');
const reminderRoutes = require('./reminderRoutes');

const router = express.Router();

// API routes
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/buildings', buildingRoutes);
router.use('/api/v1/work-orders', workOrderRoutes);
router.use('/api/v1/workers', workerRoutes);
router.use('/api/v1/reminders', reminderRoutes);

module.exports = router;
