const dns = require('dns').promises;
const { MongoClient } = require('mongodb');

// Shard hostnames from SRV resolution
const hosts = [
  'ac-bvx9brl-shard-00-00.crayhm1.mongodb.net',
  'ac-bvx9brl-shard-00-01.crayhm1.mongodb.net',
  'ac-bvx9brl-shard-00-02.crayhm1.mongodb.net'
];

const username = 'construction_admin';
const password = 'mx9Jeh2efFfoyH67';
const dbName = 'construction_tracker';
const replicaSet = 'atlas-bvx9brl-shard-0';

async function run() {
  try {
    console.log('Resolving A records for shard hosts...');
    const ipResults = [];
    for (const h of hosts) {
      try {
        const addrs = await dns.lookup(h, { all: true });
        const ip = addrs[0]?.address;
        if (ip) {
          ipResults.push({ host: h, ip });
          console.log(`- ${h} -> ${ip}`);
        }
      } catch (e) {
        console.log(`- Failed to resolve ${h}: ${e.message}`);
      }
    }

    if (ipResults.length === 0) {
      console.log('\nNo IPs resolved. This indicates DNS A lookups are blocked.');
      process.exit(1);
    }

    const uri = `mongodb://${username}:${encodeURIComponent(password)}@${ipResults.map(r=>r.ip+':27017').join(',')}/${dbName}?ssl=true&replicaSet=${replicaSet}&authSource=admin&retryWrites=true&w=majority`;

    console.log('\nAttempting direct IP connection using TLS (hostname mismatch allowed)...');
    const client = new MongoClient(uri, {
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 15000,
      tls: true,
      tlsAllowInvalidHostnames: true,
    });

    await client.connect();
    console.log('✅ Connected by IP');

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c=>c.name));

    await client.close();
    console.log('\nIf this worked, we can update server/.env to use the IP-based URI with tlsAllowInvalidHostnames.');
  } catch (err) {
    console.error('\n❌ Failed:', err.message);
  }
}

run();
