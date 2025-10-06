const mongoose = require('mongoose');
const Building = require('../models/Building');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-tracker';

async function migrate() {
  console.log('Starting apartment schema migration...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get all buildings with apartments
    const buildings = await Building.find({ 'apartments.0': { $exists: true } });
    console.log(`Found ${buildings.length} buildings with apartments to update`);

    let updatedCount = 0;
    
    // Update each building's apartments
    for (const building of buildings) {
      let needsUpdate = false;
      
      for (const apartment of building.apartments) {
        // Set default values for new fields if they don't exist
        if (!apartment.floor) {
          apartment.floor = '1';
          needsUpdate = true;
        }
        
        if (!apartment.type) {
          apartment.type = 'standard';
          needsUpdate = true;
        }
        
        if (!apartment.bedrooms) {
          apartment.bedrooms = 0;
          needsUpdate = true;
        }
        
        if (!apartment.bathrooms) {
          apartment.bathrooms = 1;
          needsUpdate = true;
        }
        
        if (!apartment.createdAt) {
          apartment.createdAt = apartment._id.getTimestamp();
          needsUpdate = true;
        }
        
        if (!apartment.updatedAt) {
          apartment.updatedAt = apartment._id.getTimestamp();
          needsUpdate = true;
        }
        
        if (!apartment.createdBy) {
          apartment.createdBy = building.createdBy;
          needsUpdate = true;
        }
        
        if (!apartment.updatedBy) {
          apartment.updatedBy = building.updatedBy || building.createdBy;
          needsUpdate = true;
        }
      }
      
      // Save the building if any apartments were updated
      if (needsUpdate) {
        await building.save({ validateBeforeSave: false });
        updatedCount++;
      }
    }
    
    console.log(`Migration completed. Updated ${updatedCount} buildings.`);
    process.exit(0);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
