const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './server/.env' });

async function testConnection() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    console.log('Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // List databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    
    console.log('\nAvailable databases:');
    dbs.databases.forEach(db => {
      console.log(`- ${db.name}`);
    });
    
    // Test the construction_tracker database
    console.log('\nTesting construction_tracker database...');
    const db = client.db('construction_tracker');
    const collections = await db.listCollections().toArray();
    
    console.log('\nCollections in construction_tracker:');
    if (collections.length > 0) {
      collections.forEach(coll => console.log(`- ${coll.name}`));
    } else {
      console.log('No collections found. Database is empty.');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\nTroubleshooting steps:');
    console.log('1. Check your internet connection');
    console.log('2. Verify your IP is whitelisted in MongoDB Atlas');
    console.log('3. Check if the database user has correct permissions');
    console.log('4. Try using a VPN if you\'re on a restricted network');
  } finally {
    await client.close();
    process.exit();
  }
}

testConnection();
