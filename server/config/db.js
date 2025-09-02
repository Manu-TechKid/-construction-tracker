const mongoose = require('mongoose');
const colors = require('colors');

const connectDB = async () => {
  // For local development, use a simple local MongoDB or skip DB connection
  if (process.env.NODE_ENV === 'development' && !process.env.MONGO_URI) {
    console.log('No MongoDB URI provided for development. Skipping database connection.');
    return null;
  }

  const maxRetries = 2; // Reduced from 3 to 2 for faster failure
  let retryCount = 0;

  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 3000, // Reduced from 5000ms
    socketTimeoutMS: 30000, // Reduced from 45000ms
    maxPoolSize: 10, // Added connection pooling
    minPoolSize: 1,
    maxIdleTimeMS: 10000,
    retryWrites: true,
    w: 'majority'
  };

  while (retryCount < maxRetries) {
    try {
      console.log(`Attempting to connect to MongoDB (attempt ${retryCount + 1}/${maxRetries})...`);
      
      const conn = await mongoose.connect(process.env.MONGO_URI, options);
      
      // Connection events for better debugging
      mongoose.connection.on('connected', () => {
        console.log('MongoDB connected successfully');
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
      return conn;
    } catch (error) {
      retryCount++;
      console.error(`MongoDB connection error (attempt ${retryCount}/${maxRetries}):`, error.message);
      
      if (retryCount === maxRetries) {
        console.error('Max retries reached. Could not connect to MongoDB.');
        
        // In development, continue without DB for UI testing
        if (process.env.NODE_ENV === 'development') {
          console.log('Continuing in development mode without database...');
          return null;
        }
        
        console.error(`Error: ${error.message}`.red.bold);
        // Exit process with failure
        process.exit(1);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

module.exports = connectDB;
