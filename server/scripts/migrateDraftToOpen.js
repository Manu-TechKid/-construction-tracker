const mongoose = require('mongoose');
const { Invoice } = require('../models/Invoice');

async function migrateDraftToOpen() {
  try {
    console.log('🔄 Starting migration from "draft" to "open" status...');
    
    // Find all invoices with "draft" status
    const draftInvoices = await Invoice.find({ status: 'draft' });
    
    console.log(`📊 Found ${draftInvoices.length} invoices with "draft" status`);
    
    if (draftInvoices.length === 0) {
      console.log('✅ No draft invoices found. Migration not needed.');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const invoice of draftInvoices) {
      try {
        // Update status to "open"
        invoice.status = 'open';
        
        // Add to status history for audit trail
        invoice.statusHistory.push({
          status: 'open',
          timestamp: new Date(),
          notes: 'Migrated from "draft" to "open" status - System update for better terminology',
          updatedBy: null // System update
        });

        await invoice.save();
        
        console.log(`✅ Migrated invoice ${invoice.invoiceNumber || invoice._id}: draft -> open`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating invoice ${invoice.invoiceNumber || invoice._id}:`, error.message);
        errorCount++;
        errors.push(`Invoice ${invoice.invoiceNumber || invoice._id}: ${error.message}`);
      }
    }

    console.log('\n📈 MIGRATION SUMMARY:');
    console.log(`✅ Successfully migrated: ${successCount} invoices`);
    console.log(`❌ Errors: ${errorCount} invoices`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERROR DETAILS:');
      errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n🎉 Draft to Open migration completed!');
    
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    throw error;
  }
}

// Export for use in other scripts or run directly
module.exports = { migrateDraftToOpen };

// Run if called directly
if (require.main === module) {
  // Connect to MongoDB
  const connectDB = async () => {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://construction_admin:YQVjoW3YhYWkfmul@cluster0.0ewapuy.mongodb.net/construction_tracker?retryWrites=true&w=majority&appName=Cluster0';
      await mongoose.connect(mongoURI);
      console.log('📡 Connected to MongoDB');
      
      await migrateDraftToOpen();
      
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
