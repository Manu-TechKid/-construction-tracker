const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load environment variables from the root directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const WorkType = require('../server/models/WorkType');
const WorkSubType = require('../server/models/WorkSubType');
const DropdownConfig = require('../server/models/DropdownConfig');

// Load data
const jsonData = JSON.parse(fs.readFileSync(path.join(__dirname, '../mongodb-atlas-insertion-data.json'), 'utf8'));

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://construction_admin:YQVjoW3YhYWkfmul@cluster0.0ewapuy.mongodb.net/construction_tracker?retryWrites=true&w=majority&appName=Cluster0';
    console.log('Connecting to MongoDB with URI:', mongoUri.replace(/\/\/.*@/, '//***:***@'));
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Clear existing data
const clearData = async () => {
  try {
    await WorkType.deleteMany({});
    await WorkSubType.deleteMany({});
    await DropdownConfig.deleteMany({});
    console.log('Cleared existing data');
  } catch (err) {
    console.error('Error clearing data:', err);
    process.exit(1);
  }
};

// Import data
const importData = async () => {
  try {
    // 1. Insert Work Types
    const workTypes = await WorkType.insertMany(jsonData.workTypes);
    console.log(`Inserted ${workTypes.length} work types`);

    // Create a map of work type codes to their IDs
    const workTypeMap = {};
    workTypes.forEach(type => {
      workTypeMap[type.code] = type._id;
    });

    // 2. Insert Work Sub-Types with proper workType references
    const workSubTypesData = jsonData.workSubTypes.map(subType => {
      let workTypeCode = '';
      if (subType.workType.includes('MAINTENANCE')) workTypeCode = 'maintenance';
      else if (subType.workType.includes('REPAIR')) workTypeCode = 'repair';
      else if (subType.workType.includes('CLEANING')) workTypeCode = 'cleaning';
      else if (subType.workType.includes('INSPECTION')) workTypeCode = 'inspection';
      else if (subType.workType.includes('RENOVATION')) workTypeCode = 'renovation';
      
      return {
        ...subType,
        workType: workTypeMap[workTypeCode]
      };
    });
    
    const workSubTypes = await WorkSubType.insertMany(workSubTypesData);
    console.log(`Inserted ${workSubTypes.length} work sub-types`);

    // 3. Insert Dropdown Configurations
    const dropdownConfigs = await DropdownConfig.insertMany(jsonData.dropdownConfigs);
    console.log(`Inserted ${dropdownConfigs.length} dropdown configurations`);

    console.log('Data import completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error importing data:', err);
    process.exit(1);
  }
};

// Run the import
(async () => {
  await connectDB();
  await clearData();
  await importData();
})();
