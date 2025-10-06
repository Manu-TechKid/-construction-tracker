const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = 5001; // Different from main server port

// MongoDB connection
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB connected successfully!');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

// Simple endpoint to check DB connection
app.get('/check-db', async (req, res) => {
  const isConnected = await connectDB();
  res.status(isConnected ? 200 : 500).json({
    status: isConnected ? 'success' : 'error',
    message: isConnected 
      ? 'Successfully connected to MongoDB!' 
      : 'Failed to connect to MongoDB. Check server logs for details.'
  });});

// Start the server
app.listen(PORT, () => {
  console.log(`DB check server running on http://localhost:${PORT}`);
  console.log('Test the connection by visiting: http://localhost:5001/check-db');
});
