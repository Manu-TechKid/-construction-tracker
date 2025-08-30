require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const buildingRoutes = require('./routes/buildingRoutes');
const workOrderRoutes = require('./routes/workOrderRoutes');
const workerRoutes = require('./routes/workerRoutes');
const authRoutes = require('./routes/authRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const noteRoutes = require('./routes/noteRoutes');

// Import routes
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const routes = require('./routes');

// Initialize Express app
const app = express();

// 1) GLOBAL MIDDLEWARES

// Trust the first proxy (Render, Heroku, etc.) so that req.ip and rate limiting work correctly
app.set('trust proxy', 1);

// Set security HTTP headers with minimal CSP for Cloudinary
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable default CSP
    crossOriginEmbedderPolicy: false, // Disable COEP
    crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow cross-origin images
  })
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// CORS
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:3000'
];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin like Postman or server-to-server
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, true); // relax for now; tighten later if needed
    },
    credentials: true
  })
);
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) ROUTES
app.use('/api/v1', routes);

// Simple health endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Database health
app.get('/api/v1/health/db', async (req, res) => {
  try {
    const stateMap = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const state = mongoose.connection.readyState;
    let ping = null;
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      // ping admin to confirm connectivity
      ping = await mongoose.connection.db.admin().ping();
    }
    res.json({
      status: 'ok',
      mongo: stateMap[state] || state,
      ping
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Base API info
app.get('/api/v1', (req, res) => {
  res.json({ status: 'ok', message: 'Construction Tracker API v1' });
});

// Alternate health paths for easier testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Note: Do not set a root '/' handler here so that when a client build
// exists, Express static can serve index.html at '/'.

// Serve client build in production ONLY if it exists (API-only otherwise)
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.resolve(__dirname, '../client/build');
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else {
    console.log('Client build not found; running API-only.');
  }
}

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

// 4) START SERVER
const PORT = process.env.PORT || 5000;

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout for server selection
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 30000, // 30 seconds timeout for initial connection
      retryWrites: true,
      w: 'majority'
    });
    console.log('MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    return false;
  }
};

// Start the server
const startServer = async () => {
  const isConnected = await connectDB();
  if (!isConnected) {
    console.log('Retrying MongoDB connection in 5 seconds...');
    setTimeout(startServer, 5000);
    return;
  }
  
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
};

// Start the application
startServer();

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});
