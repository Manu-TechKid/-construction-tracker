const mongoose = require('mongoose');
const WorkOrder = require('../models/WorkOrder');
const Building = require('../models/Building');

/**
 * Migration to update existing work orders to match the new schema
 * This ensures compatibility with the new WorkOrder form and functionality
 */
async function migrateWorkOrders() {
  try {
    console.log('Starting WorkOrder migration...');
    
    // Get all existing work orders
    const workOrders = await WorkOrder.find({});
    console.log(`Found ${workOrders.length} work orders to migrate`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const workOrder of workOrders) {
      try {
        const updateData = {};
        let needsUpdate = false;
        
        // Ensure required fields exist
        if (!workOrder.title) {
          updateData.title = workOrder.description ? workOrder.description.substring(0, 100) : 'Work Order';
          needsUpdate = true;
        }
        
        if (!workOrder.description) {
          updateData.description = workOrder.title || 'No description provided';
          needsUpdate = true;
        }
        
        // Ensure apartment fields exist
        if (!workOrder.apartmentNumber) {
          updateData.apartmentNumber = '';
          needsUpdate = true;
        }
        
        if (!workOrder.block) {
          updateData.block = '';
          needsUpdate = true;
        }
        
        if (!workOrder.apartmentStatus) {
          updateData.apartmentStatus = 'occupied';
          needsUpdate = true;
        }
        
        // Ensure priority exists
        if (!workOrder.priority) {
          updateData.priority = 'medium';
          needsUpdate = true;
        }
        
        // Ensure status exists
        if (!workOrder.status) {
          updateData.status = 'pending';
          needsUpdate = true;
        }
        
        // Ensure scheduledDate exists
        if (!workOrder.scheduledDate) {
          updateData.scheduledDate = workOrder.createdAt || new Date();
          needsUpdate = true;
        }
        
        // Ensure estimatedCost exists
        if (workOrder.estimatedCost === undefined || workOrder.estimatedCost === null) {
          updateData.estimatedCost = 0;
          needsUpdate = true;
        }
        
        // Ensure services array exists and has proper structure
        if (!workOrder.services || !Array.isArray(workOrder.services)) {
          updateData.services = [{
            type: 'other',
            description: 'General work',
            laborCost: 0,
            materialCost: 0,
            status: 'pending'
          }];
          needsUpdate = true;
        } else {
          // Validate and fix service structure
          const validServices = workOrder.services.map(service => ({
            type: service.type || 'other',
            description: service.description || 'Service',
            laborCost: parseFloat(service.laborCost) || 0,
            materialCost: parseFloat(service.materialCost) || 0,
            status: service.status || 'pending'
          }));
          
          if (JSON.stringify(validServices) !== JSON.stringify(workOrder.services)) {
            updateData.services = validServices;
            needsUpdate = true;
          }
        }
        
        // Ensure assignedTo array exists
        if (!workOrder.assignedTo || !Array.isArray(workOrder.assignedTo)) {
          updateData.assignedTo = [];
          needsUpdate = true;
        } else {
          // Validate and fix assignedTo structure
          const validAssignedTo = workOrder.assignedTo.map(assignment => ({
            worker: assignment.worker || assignment,
            assignedAt: assignment.assignedAt || new Date(),
            assignedBy: assignment.assignedBy || workOrder.createdBy,
            status: assignment.status || 'pending',
            timeSpent: assignment.timeSpent || { hours: 0, minutes: 0 },
            materials: assignment.materials || []
          }));
          
          if (JSON.stringify(validAssignedTo) !== JSON.stringify(workOrder.assignedTo)) {
            updateData.assignedTo = validAssignedTo;
            needsUpdate = true;
          }
        }
        
        // Ensure notes array exists
        if (!workOrder.notes || !Array.isArray(workOrder.notes)) {
          updateData.notes = [];
          needsUpdate = true;
        }
        
        // Ensure photos array exists
        if (!workOrder.photos || !Array.isArray(workOrder.photos)) {
          updateData.photos = [];
          needsUpdate = true;
        }
        
        // Ensure billingStatus exists
        if (!workOrder.billingStatus) {
          updateData.billingStatus = 'pending';
          needsUpdate = true;
        }
        
        // Update the work order if needed
        if (needsUpdate) {
          await WorkOrder.findByIdAndUpdate(workOrder._id, updateData);
          migratedCount++;
          console.log(`Migrated work order: ${workOrder._id}`);
        }
        
      } catch (error) {
        console.error(`Error migrating work order ${workOrder._id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Migration completed:`);
    console.log(`- Migrated: ${migratedCount} work orders`);
    console.log(`- Errors: ${errorCount} work orders`);
    console.log(`- Total processed: ${workOrders.length} work orders`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  const connectDB = require('../config/db');
  
  connectDB()
    .then(() => {
      console.log('Connected to database');
      return migrateWorkOrders();
    })
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateWorkOrders;
