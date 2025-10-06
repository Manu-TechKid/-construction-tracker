const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const WorkType = require('../server/models/WorkType');
const WorkSubType = require('../server/models/WorkSubType');
const DropdownConfig = require('../server/models/DropdownConfig');

const testConnection = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://construction_admin:YQVjoW3YhYWkfmul@cluster0.0ewapuy.mongodb.net/construction_tracker?retryWrites=true&w=majority&appName=Cluster0';
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully!');
    
    // Test reading existing data
    console.log('\n=== Testing Data Retrieval ===');
    
    const workTypes = await WorkType.find({}).limit(5);
    console.log(`Found ${workTypes.length} work types:`, workTypes.map(wt => wt.name));
    
    const workSubTypes = await WorkSubType.find({}).limit(5);
    console.log(`Found ${workSubTypes.length} work sub-types:`, workSubTypes.map(wst => wst.name));
    
    const dropdownConfigs = await DropdownConfig.find({}).limit(5);
    console.log(`Found ${dropdownConfigs.length} dropdown configs:`, dropdownConfigs.map(dc => dc.category));
    
    // Test creating a simple work type
    console.log('\n=== Testing Data Creation ===');
    
    const testWorkType = await WorkType.create({
      name: 'Test Work Type',
      code: 'test',
      description: 'Test description',
      color: '#FF0000',
      icon: 'test',
      sortOrder: 999,
      isActive: true
    });
    
    console.log('Created test work type:', testWorkType.name);
    
    // Clean up the test data
    await WorkType.findByIdAndDelete(testWorkType._id);
    console.log('Cleaned up test work type');
    
    console.log('\n✅ Database connection and operations working correctly!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

testConnection();
