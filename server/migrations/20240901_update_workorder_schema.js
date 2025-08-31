const mongoose = require('mongoose');
const dotenv = require('dotenv');
const WorkOrder = require('../models/WorkOrder');

// Load environment variables
dotenv.config({ path: '../.env' });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

const updateWorkOrderSchema = async () => {
  try {
    // Add default dates for existing work orders
    await WorkOrder.updateMany(
      { startDate: { $exists: false } },
      { 
        $set: { 
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
        } 
      }
    );

    // Add scheduledDate if it doesn't exist
    await WorkOrder.updateMany(
      { scheduledDate: { $exists: false } },
      { $set: { scheduledDate: new Date() } }
    );

    console.log('WorkOrder schema updated successfully');
  } catch (error) {
    console.error('Error updating WorkOrder schema:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
};

// Run the migration
(async () => {
  await connectDB();
  await updateWorkOrderSchema();
})();
