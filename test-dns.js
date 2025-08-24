const dns = require('dns');

const hostname = 'cluster0.crayhm1.mongodb.net';

console.log(`Resolving ${hostname}...`);

dns.resolveSrv(`_mongodb._tcp.${hostname}`, (err, addresses) => {
  if (err) {
    console.error('SRV record resolution failed:', err);
    console.log('\nTroubleshooting Steps:');
    console.log('1. Check your internet connection');
    console.log('2. Try using a different network (e.g., mobile hotspot)');
    console.log('3. Contact your network administrator if on a corporate network');
    console.log('4. Try using a VPN service');
    return;
  }
  
  console.log('SRV records:', JSON.stringify(addresses, null, 2));
});

// Also try regular DNS resolution
dns.resolve4(hostname, (err, addresses) => {
  if (err) {
    console.error(`\nA record resolution failed: ${err.message}`);
  } else {
    console.log(`\nA records for ${hostname}:`, addresses);
  }
});
