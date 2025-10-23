const mongoose = require('mongoose');
const { correctInvoiceDates } = require('./correctInvoiceDates');
const { migrateDraftToOpen } = require('./migrateDraftToOpen');

async function deployInvoiceUpdates() {
  try {
    console.log('🚀 Starting comprehensive invoice updates deployment...\n');
    
    // Step 1: Correct invoice dates
    console.log('📅 STEP 1: Correcting invoice dates...');
    await correctInvoiceDates();
    console.log('✅ Invoice date corrections completed!\n');
    
    // Step 2: Migrate draft to open
    console.log('🔄 STEP 2: Migrating "draft" status to "open"...');
    await migrateDraftToOpen();
    console.log('✅ Draft to Open migration completed!\n');
    
    console.log('🎉 ALL INVOICE UPDATES DEPLOYED SUCCESSFULLY!');
    console.log('\n📋 SUMMARY OF CHANGES:');
    console.log('   ✅ Invoice dates corrected for historical invoices');
    console.log('   ✅ "Draft" status changed to "Open" for better clarity');
    console.log('   ✅ Status history updated for audit trail');
    console.log('   ✅ Frontend components updated to use "Open" terminology');
    
  } catch (error) {
    console.error('💥 Fatal error during deployment:', error);
    throw error;
  }
}

// Export for use in other scripts or run directly
module.exports = { deployInvoiceUpdates };

// Run if called directly
if (require.main === module) {
  // Connect to MongoDB
  const connectDB = async () => {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://construction_admin:YQVjoW3YhYWkfmul@cluster0.0ewapuy.mongodb.net/construction_tracker?retryWrites=true&w=majority&appName=Cluster0';
      await mongoose.connect(mongoURI);
      console.log('📡 Connected to MongoDB');
      
      await deployInvoiceUpdates();
      
    } catch (error) {
      console.error('💥 Database connection error:', error);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log('📡 Disconnected from MongoDB');
      process.exit(0);
    }
  };

  connectDB();
}
