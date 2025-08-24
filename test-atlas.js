const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

console.log('Testing MongoDB Atlas connection...');
console.log('Connection string:', process.env.MONGODB_URI);

const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections in database:');
    console.log(collections.map(c => `- ${c.name}`).join('\n') || 'No collections found');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection error:', error.message);
    console.log('\nTroubleshooting steps:');
    console.log('1. Check your internet connection');
    console.log('2. Verify your IP is whitelisted in MongoDB Atlas');
    console.log('3. Check if the database user has correct permissions');
    console.log('4. Try using a VPN if you\'re on a restricted network');
    
    // Retry after 5 seconds
    console.log('\nRetrying in 5 seconds...\n');
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();
