const mongoose = require('mongoose');
const WorkOrder = require('../models/WorkOrder');
const config = require('../config/config');

// Connect to the database
mongoose.connect(config.database.url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB for migration'))
  .catch(err => console.error('MongoDB connection error:', err));

async function migrateWorkOrders() {
  try {
    console.log('Starting work order migration...');
    
    // Get all work orders
    const workOrders = await WorkOrder.find({});
    console.log(`Found ${workOrders.length} work orders to migrate`);
    
    let updatedCount = 0;
    
    // Process each work order
    for (const workOrder of workOrders) {
      // Skip if already migrated (has services array)
      if (workOrder.services && workOrder.services.length > 0) {
        continue;
      }
      
      // Convert single service to services array
      workOrder.services = [{
        type: workOrder.workType || 'other',
        description: workOrder.description || 'No description provided',
        laborCost: workOrder.estimatedCost || 0,
        materialCost: 0,
        status: workOrder.status || 'pending',
        createdAt: workOrder.createdAt || new Date(),
        updatedAt: new Date()
      }];
      
      // Save the updated work order
      await workOrder.save();
      updatedCount++;
    }
    
    console.log(`Migration complete. Updated ${updatedCount} work orders.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// Run the migration
migrateWorkOrders();
