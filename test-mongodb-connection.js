const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './server/.env' });

async function testConnection() {
  // Use the first host only for testing
  const testUri = process.env.MONGODB_URI.replace(
    'mongodb://construction_admin:y7nq4REYPy5Mn1kh@cluster0-shard-00-00.crayhm1.mongodb.net:27017,cluster0-shard-00-01.crayhm1.mongodb.net:27017,cluster0-shard-00-02.crayhm1.mongodb.net:27017',
    'mongodb://construction_admin:y7nq4REYPy5Mn1kh@cluster0-shard-00-00.crayhm1.mongodb.net:27017'
  );

  console.log('Testing connection to:', testUri.split('@')[1].split('/')[0]);
  
  const client = new MongoClient(testUri, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 10000,
    tls: true,
    tlsAllowInvalidCertificates: true
  });

  try {
    console.log('Attempting to connect...');
    await client.connect();
    const db = client.db('construction_tracker');
    console.log('✅ Successfully connected to MongoDB!');
    
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

testConnection();
