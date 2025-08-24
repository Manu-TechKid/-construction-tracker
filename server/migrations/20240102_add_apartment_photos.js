const mongoose = require('mongoose');
const Building = require('../models/Building');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-tracker';

async function migrate() {
  console.log('Starting apartment photos migration...');
  
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
    
    // Update each building's apartments to include the photos array if it doesn't exist
    for (const building of buildings) {
      let needsUpdate = false;
      
      for (const apartment of building.apartments) {
        // If photos array doesn't exist, create it
        if (!apartment.photos || !Array.isArray(apartment.photos)) {
          apartment.photos = [];
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
    
    // Create necessary directories
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
    const apartmentPhotosDir = path.join(uploadsDir, 'apartments');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`Created directory: ${uploadsDir}`);
    }
    
    if (!fs.existsSync(apartmentPhotosDir)) {
      fs.mkdirSync(apartmentPhotosDir, { recursive: true });
      console.log(`Created directory: ${apartmentPhotosDir}`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
