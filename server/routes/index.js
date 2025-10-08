const express = require('express');
const employmentRoutes = require('./employmentRoutes');

const router = express.Router();

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
