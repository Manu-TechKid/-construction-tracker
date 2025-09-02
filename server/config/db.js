const mongoose = require('mongoose');
const colors = require('colors');

const connectDB = async () => {
  // For local development, use a simple local MongoDB or skip DB connection
  if (process.env.NODE_ENV === 'development' && !process.env.MONGO_URI) {
    console.log('No MongoDB URI provided for development. Skipping database connection.');
    return null;
  }

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
      return conn;
    } catch (error) {
      retryCount++;
      console.log(`MongoDB connection error (attempt ${retryCount}/${maxRetries}):`, error.message);
      
      if (retryCount === maxRetries) {
        console.log('Max retries reached. Could not connect to MongoDB.');
        
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
