const mongoose = require('mongoose');
require('dotenv').config();

console.log('Testing MongoDB connection...');
console.log('Connection string:', 
  process.env.MONGODB_URI.replace(
    /mongodb:\/\/([^:]+):[^@]+@/, 
    'mongodb://$1:********@'
  )
);

mongoose.connection.on('connecting', () => {
  console.log('MongoDB: Connecting...');});

mongoose.connection.on('connected', () => {
  console.log('MongoDB: Connected');});

mongoose.connection.on('open', () => {
  console.log('MongoDB: Connection open');});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB: Disconnected');});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  console.error('Error stack:', err.stack);
});

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    const uri = process.env.MONGODB_URI;
    const isSrv = uri.startsWith('mongodb+srv://');
    const isMultiHost = !isSrv && uri.includes(',');
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority'
    };
    // directConnection is invalid for SRV URIs, and also invalid when multiple hosts are present
    if (!isSrv && !isMultiHost) options.directConnection = true;

    await mongoose.connect(uri, options);
    
    console.log('✅ Successfully connected to MongoDB!');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections:');
    console.log(collections.map(c => `- ${c.name}`).join('\n') || 'No collections found');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    
    if (error.name === 'MongooseServerSelectionError') {
      console.log('\nPossible solutions:');
      console.log('1. Check your internet connection');
      console.log('2. Verify your IP is whitelisted in MongoDB Atlas');
      console.log('3. Try using a VPN (e.g., ProtonVPN, TunnelBear)');
      console.log('4. Check if MongoDB Atlas is up: https://status.cloud.mongodb.com/');
    }
    
    console.error('\nFull error details:', error);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

testConnection();
