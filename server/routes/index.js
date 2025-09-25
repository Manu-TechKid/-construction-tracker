const express = require('express');

const authRoutes = require('./authRoutes');
const buildingRoutes = require('./buildingRoutes');
const workOrderRoutes = require('./workOrderRoutes');
const userRoutes = require('./userRoutes');
const reminderRoutes = require('./reminderRoutes');
const photoRoutes = require('./photoRoutes');
const uploadRoutes = require('./uploadRoutes');
const timeTrackingRoutes = require('./timeTrackingRoutes');
const searchRoutes = require('./searchRoutes');
const setupRoutes = require('./setupRoutes');
const migrationRoutes = require('./migrationRoutes');

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/buildings', buildingRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/users', userRoutes);
router.use('/reminders', reminderRoutes);
router.use('/photos', photoRoutes);
router.use('/uploads', uploadRoutes);
router.use('/time-tracking', timeTrackingRoutes);
router.use('/search', searchRoutes);
router.use('/setup', setupRoutes);
router.use('/migrations', migrationRoutes);

module.exports = router;
