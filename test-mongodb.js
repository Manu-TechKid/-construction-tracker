const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

console.log('Attempting to connect to MongoDB...');
console.log('Connection string:', process.env.MONGODB_URI);

// Try direct connection to the primary node
const connectionString = 'mongodb://construction_admin:y7nq4REYPy5Mn1kh@cluster0-shard-00-00.crayhm1.mongodb.net:27017/construction_tracker?ssl=true&authSource=admin&retryWrites=true&w=majority';

console.log('Trying direct connection to primary node...');

mongoose.connect(connectionString, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 10000
})
.then(() => {
    console.log('✅ Successfully connected to MongoDB!');    
    process.exit(0);
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check your internet connection');
    console.log('2. Verify your IP is whitelisted in MongoDB Atlas');
    console.log('3. Try using a VPN if your network might be blocking the connection');
    console.log('4. Check if MongoDB Atlas cluster is running');
    process.exit(1);
});
