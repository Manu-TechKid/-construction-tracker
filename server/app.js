const express = require('express');
const cors = require('cors');

// Import routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const buildingRoutes = require('./routes/buildingRoutes');
const workOrderRoutes = require('./routes/workOrderRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const workerScheduleRoutes = require('./routes/workerScheduleRoutes');
const searchRoutes = require('./routes/searchRoutes');
const timeTrackingRoutes = require('./routes/timeTrackingRoutes');
const projectEstimateRoutes = require('./routes/projectEstimateRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/buildings', buildingRoutes);
app.use('/api/v1/work-orders', workOrderRoutes);
app.use('/api/v1/reminders', reminderRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/schedule', scheduleRoutes);
app.use('/api/v1/worker-schedules', workerScheduleRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/time-tracking', timeTrackingRoutes);
app.use('/api/v1/project-estimates', projectEstimateRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

module.exports = app;
