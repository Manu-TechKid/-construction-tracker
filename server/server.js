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
const authRoutes = require('./routes/authRoutes');

// Import routes
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const routes = require('./routes');
const connectDB = require('./config/db');

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
  max: 1000, // Increased from 100 to 1000
  windowMs: 15 * 60 * 1000, // Reduced from 1 hour to 15 minutes
  message: 'Too many requests from this IP, please try again in 15 minutes!',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for time tracking status checks
  skip: (req) => {
    return req.path.includes('/time-tracking/status/');
  }
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

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, 'public/uploads/photos');
const timeTrackingUploadsDir = path.join(__dirname, 'public/uploads/time-tracking');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(timeTrackingUploadsDir)) {
  fs.mkdirSync(timeTrackingUploadsDir, { recursive: true });
}

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded photos with proper CORS headers
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) ROUTES
// Add global request logging
app.use('/api/v1', (req, res, next) => {
  console.log(`=== API REQUEST: ${req.method} ${req.originalUrl} ===`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/buildings', buildingRoutes);
app.use('/api/v1/work-orders', workOrderRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/schedules', scheduleRoutes);
app.use('/api/v1/notes', noteRoutes);
app.use('/api/v1/reminders', reminderRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/time-tracking', timeTrackingRoutes);
app.use('/api/v1/project-estimates', projectEstimateRoutes);
app.use('/api/v1/setup', setupRoutes);
app.use('/api/v1/migration', migrationRoutes);
app.use('/api/v1/photos', photoRoutes);
app.use('/api/v1/worker-schedules', workerScheduleRoutes);
// Health check endpoints
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.2'  // Trigger deployment
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
  console.log('Looking for client build at:', clientBuildPath);
  console.log('Client build exists:', fs.existsSync(clientBuildPath));

  if (fs.existsSync(clientBuildPath)) {
    // Serve static files from the React app with proper headers
    app.use(express.static(clientBuildPath, {
      maxAge: '1d',
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));

    // Handle React routing, return all requests to React app (but only for non-API routes)
    app.get('*', (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }

      console.log('Serving React app for path:', req.path);
      res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
        if (err) {
          console.error('Error serving index.html:', err);
          res.status(500).send('Error loading application');
        }
      });
    });
  } else {
    console.log('Client build not found at:', clientBuildPath);

    // Serve a basic HTML page indicating the frontend is not available
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Construction Tracker</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
              .info { color: #1976d2; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>Construction Tracker API</h1>
            <p class="error">Frontend build not found. Running in API-only mode.</p>
            <p class="info">API is available at <a href="/api/v1">/api/v1</a></p>
            <p class="info">Health check: <a href="/api/v1/health">/api/v1/health</a></p>
          </body>
        </html>
      `);
    });
  }
}

// Handle 404 for API routes only
// Health check endpoint for Render
app.get('/health', (req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy';
  res.status(200).json({
    status: 'success',
    data: {
      server: 'running',
      database: status,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// 404 handler for all other API routes
app.all('/api/*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler - must be after all other middleware
app.use(globalErrorHandler);

// 4) START SERVER
const PORT = process.env.PORT || 5000;

// Improved server startup with better error handling
const startServer = async () => {
  try {
    // Connect to database first
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('Database connection established');
    
    // Start the server only after DB connection is successful
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      
      // Signal to Render that the app is ready
      if (process.env.NODE_ENV === 'production') {
        console.log('Server is ready to accept connections');
      }
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') throw error;
      
      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;
      
      // Handle specific listen errors with friendly messages
      switch (error.code) {
        case 'EACCES':
          console.error(bind + ' requires elevated privileges');
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(bind + ' is already in use');
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
    
    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      server.close(async () => {
        console.log('Server closed');
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close(false);
          console.log('MongoDB connection closed');
        }
        process.exit(0);
      });
      
      // Force close server after 5 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 5000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    
    // In development, allow server to start without DB for UI testing
    if (process.env.NODE_ENV === 'development') {
      console.log('Starting in development mode without database...');
      return app.listen(PORT, () => {
        console.log(`Server running in development mode (without DB) on port ${PORT}`);
      });
    }
    
    // In production, exit if we can't connect to DB
    console.error('Exiting due to database connection failure');
    process.exit(1);
  }
  
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
