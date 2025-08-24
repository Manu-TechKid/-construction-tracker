const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './server/.env' });

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  connectTimeoutMS: 10000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 10000,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testConnection() {
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    // Test the connection
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    return 'Connection successful!';
  } catch (error) {
    console.error('Connection error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

testConnection()
  .then(console.log)
  .catch(console.error);
