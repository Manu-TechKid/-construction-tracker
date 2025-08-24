const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './server/.env' });

async function testDirectConnection() {
  // Extract the first host from the connection string
  const uri = new URL(process.env.MONGODB_URI);
  const hosts = uri.hostname.split(',');
  const singleHostUri = process.env.MONGODB_URI.replace(uri.hostname, hosts[0]);

  const client = new MongoClient(singleHostUri, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 10000,
    directConnection: true,
    tls: true,
    tlsAllowInvalidCertificates: true,
    retryWrites: true,
    w: 'majority'
  });

  try {
    console.log('Attempting to connect to MongoDB Atlas with direct connection...');
    await client.connect();
    
    const db = client.db('construction_tracker');
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // List collections
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
  }
}

testDirectConnection();
