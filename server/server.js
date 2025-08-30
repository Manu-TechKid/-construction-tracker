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
const reminderRoutes = require('./routes/reminderRoutes');

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
// API routes
app.use('/api/v1/buildings', buildingRoutes);
app.use('/api/v1/work-orders', workOrderRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/schedules', scheduleRoutes);
app.use('/api/v1/notes', noteRoutes);
app.use('/api/v1/reminders', reminderRoutes);

// Health check endpoints
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    node: process.version,
    env: process.env.NODE_ENV || 'development'
  });
});

// Database health check
app.get('/api/v1/health/db', async (req, res) => {
  try {
    const stateMap = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const state = mongoose.connection.readyState;
    let ping = null;
    
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      ping = await mongoose.connection.db.admin().ping();
    }
    
    res.json({
      status: 'ok',
      mongo: stateMap[state] || state,
      ping: ping ? 'ok' : 'failed',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ 
      status: 'error', 
      message: e.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API info endpoint
app.get('/api/v1', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Construction Tracker API v1',
    timestamp: new Date().toISOString(),
    docs: process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5000/api-docs' 
      : 'https://api.yourdomain.com/api-docs'
  });
});

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.resolve(__dirname, '../client/build');
  
  if (fs.existsSync(clientBuildPath)) {
    // Serve static files from the React app
    app.use(express.static(clientBuildPath));
    
    // Handle React routing, return all requests to React app (but only for non-API routes)
    app.get('*', (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else {
    console.log('Client build not found; running in API-only mode');
  }
}

// Handle 404 for API routes only
app.all('/api/*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler - must be after all other middleware
app.use(globalErrorHandler);

// 4) START SERVER
const PORT = process.env.PORT || 5000;

// Database connection with retry logic
const connectDB = async () => {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        retryWrites: true,
        w: 'majority'
      });
      console.log('MongoDB connected successfully');
      return true;
    } catch (err) {
      retryCount++;
      console.error(`MongoDB connection error (attempt ${retryCount}/${maxRetries}):`, err.message);
      
      if (retryCount === maxRetries) {
        console.error('Max retries reached. Could not connect to MongoDB.');
        return false;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
    }
  }
};

// Start server after DB connection
const startServer = async () => {
  const dbConnected = await connectDB();
  
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }
  
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
};

// Start the application
startServer();

// Start the application
startServer();
