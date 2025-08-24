const express = require('express');

const authRoutes = require('./authRoutes');
const buildingRoutes = require('./buildingRoutes');
const workOrderRoutes = require('./workOrderRoutes');
const workerRoutes = require('./workerRoutes');
const reminderRoutes = require('./reminderRoutes');

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/buildings', buildingRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/workers', workerRoutes);
router.use('/reminders', reminderRoutes);

module.exports = router;
