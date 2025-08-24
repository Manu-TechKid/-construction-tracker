const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './server/.env' });

async function testFinalConnection() {
  console.log('Testing connection with final settings...');
  console.log('Connection string:', 
    process.env.MONGODB_URI.replace(
      /(mongodb:\/\/)[^:]+:[^@]+@/, 
      'mongodb://USER:PASSWORD@'
    )
  );

  const client = new MongoClient(process.env.MONGODB_URI, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 10000,
    tls: true,
    tlsAllowInvalidCertificates: true,
    retryWrites: true,
    w: 'majority',
    directConnection: true
  });

  try {
    console.log('\nAttempting to connect...');
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

testFinalConnection();
