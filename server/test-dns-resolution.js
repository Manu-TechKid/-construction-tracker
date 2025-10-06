const dns = require('dns');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Set DNS servers to Google's public DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

console.log('Testing DNS resolution for MongoDB Atlas...');

// Test DNS resolution for the MongoDB Atlas host
const hostname = 'cluster0.crayhm1.mongodb.net';

dns.resolveSrv(`_mongodb._tcp.${hostname}`, async (err, addresses) => {
  if (err) {
    console.error('❌ DNS SRV resolution failed:', err.message);
    console.log('\nTroubleshooting steps:');
    console.log('1. Check your internet connection');
    console.log('2. Try using a VPN (e.g., ProtonVPN, TunnelBear)');
    console.log('3. Try connecting from a different network (e.g., mobile hotspot)');
    process.exit(1);
  }

  console.log('✅ DNS SRV resolution successful!');
  console.log('Resolved addresses:', JSON.stringify(addresses, null, 2));

  // Now test the MongoDB connection
  console.log('\nAttempting to connect to MongoDB...');
  
  const client = new MongoClient(process.env.MONGODB_URI, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 10000,
    retryWrites: true,
    w: 'majority'
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    const db = client.db('construction_tracker');
    const collections = await db.listCollections().toArray();
    
    console.log('\nCollections:');
    console.log(collections.map(c => `- ${c.name}`).join('\n') || 'No collections found');
    
  } catch (error) {
    console.error('\n❌ MongoDB connection failed:', error.message);
    
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
});
