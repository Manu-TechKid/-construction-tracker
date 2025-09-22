require('dotenv').config();
const mongoose = require('mongoose');
const { migrateSetupData } = require('../migrations/setupDataMigration');

const runMigration = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('Running setup data migration...');
    const result = await migrateSetupData();
    
    console.log('\n=== Migration Results ===');
    console.log(`Work Types: ${result.workTypes}`);
    console.log(`Work Sub-Types: ${result.workSubTypes}`);
    console.log(`Dropdown Configs: ${result.dropdownConfigs}`);
    console.log('=========================\n');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
