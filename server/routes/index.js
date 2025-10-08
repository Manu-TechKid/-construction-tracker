const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const buildingRoutes = require('./buildingRoutes');
const workOrderRoutes = require('./workOrderRoutes');
const userRoutes = require('./userRoutes');
const reminderRoutes = require('./reminderRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const noteRoutes = require('./noteRoutes');
const setupRoutes = require('./setupRoutes');
const workerScheduleRoutes = require('./workerScheduleRoutes');
const uploadRoutes = require('./uploadRoutes');
const photoRoutes = require('./photoRoutes');
const timeTrackingRoutes = require('./timeTrackingRoutes');
const employmentRoutes = require('./employmentRoutes');

// API routes
router.use('/auth', authRoutes);
router.use('/buildings', buildingRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/users', userRoutes);
router.use('/reminders', reminderRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/notes', noteRoutes);
router.use('/setup', setupRoutes);
router.use('/worker-schedules', workerScheduleRoutes);
router.use('/uploads', uploadRoutes);
router.use('/photos', photoRoutes);
router.use('/time-tracking', timeTrackingRoutes);
router.use('/employment', employmentRoutes);

// All routes are now properly organized above
// Frontend should use /setup/work-types, /users for workers, etc.

module.exports = router;
