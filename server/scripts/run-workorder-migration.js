#!/usr/bin/env node

/**
 * Script to run the WorkOrder migration
 * This ensures all existing work orders are compatible with the new schema
 */

const path = require('path');
const mongoose = require('mongoose');

// Add the server directory to the require path
const serverPath = path.join(__dirname, '..');
require('module')._resolveFilename = (function(originalResolveFilename) {
  return function(request, parent) {
    if (request.startsWith('./') || request.startsWith('../')) {
      return originalResolveFilename(request, parent);
    }
    try {
      return originalResolveFilename(request, parent);
    } catch (e) {
      try {
        return originalResolveFilename(path.join(serverPath, request), parent);
      } catch (e2) {
        throw e;
      }
    }
  };
})(require('module')._resolveFilename);

const connectDB = require('../config/db');
const migrateWorkOrders = require('../migrations/20240909_migrate_workorders_to_new_schema');

async function runMigration() {
  try {
    console.log('🚀 Starting WorkOrder Migration...');
    console.log('=====================================');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');
    
    // Run migration
    await migrateWorkOrders();
    
    console.log('=====================================');
    console.log('✅ WorkOrder migration completed successfully!');
    console.log('All existing work orders have been updated to match the new schema.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️  Migration interrupted by user');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Migration terminated');
  await mongoose.connection.close();
  process.exit(0);
});

// Run the migration
runMigration();
