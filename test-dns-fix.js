const dns = require('dns');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './server/.env' });

// Set DNS servers to Google's public DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function testConnection() {
  const client = new MongoClient(process.env.MONGODB_URI, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 10000,
  });

  try {
    console.log('Testing DNS resolution...');
    await dns.promises.resolveSrv('_mongodb._tcp.cluster0.crayhm1.mongodb.net');
    console.log('✅ DNS resolution successful!');
    
    console.log('\nConnecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Test the connection
    const db = client.db('construction_tracker');
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in database:');
    console.log(collections.map(c => `- ${c.name}`).join('\n') || 'No collections found');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'ETIMEOUT') {
      console.log('\nTroubleshooting steps:');
      console.log('1. Try using a VPN (e.g., ProtonVPN, TunnelBear)');
      console.log('2. Contact your network administrator if on a corporate network');
      console.log('3. Try connecting from a different network (e.g., mobile hotspot)');
    }
  } finally {
    await client.close();
  }
}

testConnection();
