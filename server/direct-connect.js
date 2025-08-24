const { MongoClient } = require('mongodb');
require('dotenv').config();

// Use the resolved hostname from the DNS test
const MONGODB_URI = 'mongodb://construction_admin:y7nq4REYPy5Mn1kh@ac-bvx9brl-shard-00-00.crayhm1.mongodb.net:27017,ac-bvx9brl-shard-00-01.crayhm1.mongodb.net:27017,ac-bvx9brl-shard-00-02.crayhm1.mongodb.net:27017/construction_tracker?ssl=true&replicaSet=atlas-bvx9brl-shard-0&authSource=admin&retryWrites=true&w=majority';

async function connect() {
  console.log('Attempting to connect to MongoDB with direct hostnames...');
  
  const client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 10000,
    retryWrites: true,
    w: 'majority',
    ssl: true
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    const db = client.db('construction_tracker');
    const collections = await db.listCollections().toArray();
    
    console.log('\nCollections:');
    console.log(collections.map(c => `- ${c.name}`).join('\n') || 'No collections found');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    
    if (error.message.includes('ETIMEOUT') || error.message.includes('ENOTFOUND')) {
      console.log('\nThis appears to be a network/DNS issue. Please try:');
      console.log('1. Using a VPN (e.g., ProtonVPN, TunnelBear)');
      console.log('2. Connecting from a different network (e.g., mobile hotspot)');
      console.log('3. Contacting your network administrator if on a corporate network');
    }
  } finally {
    await client.close();
    process.exit();
  }
}

connect();
