const mongoose = require('mongoose');
const { migrateWorkersToUsers } = require('../migrations/20240103_migrate_workers_to_users');
require('dotenv').config();

async function runMigration() {
    try {
        console.log('🚀 Starting worker migration process...');
        
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
        if (!mongoUri) {
            console.log('⚠️ No MongoDB URI found - skipping migration');
            return;
        }
        
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Check if migration is needed
        const Worker = mongoose.model('Worker', new mongoose.Schema({}));
        const workerCount = await Worker.countDocuments().catch(() => 0);
        
        if (workerCount === 0) {
            console.log('ℹ️ No workers found in Worker collection - migration not needed');
            await mongoose.disconnect();
            return;
        }
        
        console.log(`📊 Found ${workerCount} workers to migrate`);
        
        // Run migration
        const results = await migrateWorkersToUsers();
        
        console.log('🎉 Migration completed successfully!');
        console.log('📊 Results:', results);
        
        // Disconnect
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        
        // Disconnect on error
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
        
        // Don't exit with error in production to prevent deployment failure
        if (process.env.NODE_ENV === 'production') {
            console.log('⚠️ Migration failed in production - continuing deployment');
            return;
        }
        
        process.exit(1);
    }
}

// Only run if called directly or in development
if (require.main === module || process.env.NODE_ENV !== 'production') {
    runMigration();
} else {
    console.log('ℹ️ Skipping migration in production environment');
}

module.exports = { runMigration };
