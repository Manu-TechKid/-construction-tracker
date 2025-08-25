const express = require('express');

const authRoutes = require('./authRoutes');
const buildingRoutes = require('./buildingRoutes');
const workOrderRoutes = require('./workOrderRoutes');
const workerRoutes = require('./workerRoutes');
const reminderRoutes = require('./reminderRoutes');
const invoiceRoutes = require('./invoiceRoutes');

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/buildings', buildingRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/workers', workerRoutes);
router.use('/reminders', reminderRoutes);
router.use('/invoices', invoiceRoutes);

module.exports = router;
