const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/error');
const connectDB = require('./config/db');
const { getDeviceInfo } = require('./utils/deviceInfo');
const { locationTrackingMiddleware } = require('./middleware/locationTracking');

// Load env vars
require('dotenv').config();

// Connect to database
connectDB();

// Route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const workerRoutes = require('./routes/workers');
const scheduleRoutes = require('./routes/schedules');
const timeTrackingRoutes = require('./routes/timeTrackingRoutes');

const app = express();

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enable CORS
app.use(cors());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Device info middleware
app.use((req, res, next) => {
  req.deviceInfo = getDeviceInfo(req);
  next();
});

// Location tracking middleware for workers
app.use(locationTrackingMiddleware());

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/schedules', scheduleRoutes);
app.use('/api/v1/time-tracking', timeTrackingRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold)
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});

module.exports = app;
