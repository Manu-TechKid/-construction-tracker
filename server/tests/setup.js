// Setup test environment
process.env.NODE_ENV = 'test';

// Load environment variables from test.env
const dotenv = require('dotenv');
dotenv.config({ path: './config/test.env' });

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Set test timeout
jest.setTimeout(30000);

// Global test hooks
beforeAll(async () => {
  // Any setup that needs to happen before all tests
});

afterAll(async () => {
  // Any cleanup that needs to happen after all tests
  const { mongoose } = require('mongoose');
  await mongoose.connection.close();
});
