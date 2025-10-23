const mongoose = require('mongoose');
const { Invoice } = require('../models/Invoice');

// Invoice date corrections based on your provided data
const invoiceCorrections = [
  // Enero
  { invoiceNumber: "5355", invoiceDate: "2025-01-30", dueDate: "2025-03-31" },
  { invoiceNumber: "5356", invoiceDate: "2025-01-30", dueDate: "2025-03-31" },
  { invoiceNumber: "5358", invoiceDate: "2025-01-13", dueDate: "2025-01-12" },
  { invoiceNumber: "5362", invoiceDate: "2025-01-24", dueDate: "2025-02-23" },
  { invoiceNumber: "2371", invoiceDate: "2025-01-13", dueDate: "2025-01-28" },
  
  // Febrero
  { invoiceNumber: "5375", invoiceDate: "2025-02-07", dueDate: "2025-03-09" },
  { invoiceNumber: "5376", invoiceDate: "2025-02-07", dueDate: "2025-03-09" },
  { invoiceNumber: "5378", invoiceDate: "2025-02-03", dueDate: "2025-03-15" },
  { invoiceNumber: "5385", invoiceDate: "2025-02-19", dueDate: "2025-03-21" },
  
  // Marzo
  { invoiceNumber: "5391", invoiceDate: "2025-03-03", dueDate: "2025-05-02" },
  { invoiceNumber: "5392", invoiceDate: "2025-03-04", dueDate: "2025-05-03" },
  { invoiceNumber: "5393", invoiceDate: "2025-03-05", dueDate: "2025-05-04" },
  { invoiceNumber: "5395", invoiceDate: "2025-03-06", dueDate: "2025-05-05" },
  { invoiceNumber: "5400", invoiceDate: "2025-03-17", dueDate: "2025-05-16" },
  { invoiceNumber: "5402", invoiceDate: "2025-03-20", dueDate: "2025-05-19" },
  { invoiceNumber: "5403", invoiceDate: "2025-03-20", dueDate: "2025-05-19" },
  { invoiceNumber: "5405", invoiceDate: "2025-03-31", dueDate: "2025-05-20" },
  { invoiceNumber: "5406", invoiceDate: "2025-03-31", dueDate: "2025-05-20" },
  { invoiceNumber: "5409", invoiceDate: "2025-03-31", dueDate: "2025-05-20" },
  
  // Abril
  { invoiceNumber: "5414", invoiceDate: "2025-04-30", dueDate: "2025-06-29" },
  { invoiceNumber: "5411", invoiceDate: "2025-04-30", dueDate: "2025-06-29" },
  { invoiceNumber: "5412", invoiceDate: "2025-04-30", dueDate: "2025-06-29" },
  { invoiceNumber: "5417", invoiceDate: "2025-04-04", dueDate: "2025-05-04" },
  { invoiceNumber: "5426", invoiceDate: "2025-04-30", dueDate: "2025-06-29" },
  { invoiceNumber: "5427", invoiceDate: "2025-04-30", dueDate: "2025-06-29" },
  { invoiceNumber: "5437", invoiceDate: "2025-04-30", dueDate: "2025-06-29" },
  
  // Mayo
  { invoiceNumber: "5479", invoiceDate: "2025-05-30", dueDate: "2025-07-29" },
  { invoiceNumber: "5478", invoiceDate: "2025-05-30", dueDate: "2025-07-29" },
  { invoiceNumber: "5457", invoiceDate: "2025-05-30", dueDate: "2025-07-29" },
  { invoiceNumber: "5447", invoiceDate: "2025-05-30", dueDate: "2025-07-29" },
  { invoiceNumber: "5448", invoiceDate: "2025-05-30", dueDate: "2025-07-29" },
  { invoiceNumber: "5462", invoiceDate: "2025-05-30", dueDate: "2025-07-29" },
  
  // Septiembre
  { invoiceNumber: "5656", invoiceDate: "2025-09-30", dueDate: "2025-11-29" },
  { invoiceNumber: "5657", invoiceDate: "2025-09-30", dueDate: "2025-11-29" },
  { invoiceNumber: "5658", invoiceDate: "2025-09-30", dueDate: "2025-11-29" },
  { invoiceNumber: "5689", invoiceDate: "2025-09-30", dueDate: "2025-11-29" },
  { invoiceNumber: "5690", invoiceDate: "2025-09-30", dueDate: "2025-11-29" }
];

async function correctInvoiceDates() {
  try {
    console.log('🔄 Starting invoice date correction...');
    console.log(`📊 Processing ${invoiceCorrections.length} invoices`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const correction of invoiceCorrections) {
      try {
        // Find invoice by number (handle both string and number formats)
        const invoice = await Invoice.findOne({
          $or: [
            { invoiceNumber: correction.invoiceNumber },
            { invoiceNumber: correction.invoiceNumber.toString() },
            { invoiceNumber: correction.invoiceNumber.padStart(6, '0') }
          ]
        });

        if (!invoice) {
          console.log(`⚠️  Invoice ${correction.invoiceNumber} not found`);
          errorCount++;
          errors.push(`Invoice ${correction.invoiceNumber} not found`);
          continue;
        }

        // Store original dates for logging
        const originalInvoiceDate = invoice.invoiceDate;
        const originalDueDate = invoice.dueDate;

        // Update dates
        invoice.invoiceDate = new Date(correction.invoiceDate);
        invoice.dueDate = new Date(correction.dueDate);

        // Add to status history for audit trail
        invoice.statusHistory.push({
          status: invoice.status,
          timestamp: new Date(),
          notes: `Date correction: Invoice date changed from ${originalInvoiceDate?.toISOString()?.split('T')[0]} to ${correction.invoiceDate}, Due date changed from ${originalDueDate?.toISOString()?.split('T')[0]} to ${correction.dueDate}`,
          updatedBy: null // System update
        });

        await invoice.save();
        
        console.log(`✅ Updated invoice ${correction.invoiceNumber}: ${correction.invoiceDate} -> ${correction.dueDate}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error updating invoice ${correction.invoiceNumber}:`, error.message);
        errorCount++;
        errors.push(`Invoice ${correction.invoiceNumber}: ${error.message}`);
      }
    }

    console.log('\n📈 CORRECTION SUMMARY:');
    console.log(`✅ Successfully updated: ${successCount} invoices`);
    console.log(`❌ Errors: ${errorCount} invoices`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERROR DETAILS:');
      errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n🎉 Invoice date correction completed!');
    
  } catch (error) {
    console.error('💥 Fatal error during invoice correction:', error);
    throw error;
  }
}

// Export for use in other scripts or run directly
module.exports = { correctInvoiceDates, invoiceCorrections };

// Run if called directly
if (require.main === module) {
  // Connect to MongoDB
  const connectDB = async () => {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://construction_admin:YQVjoW3YhYWkfmul@cluster0.0ewapuy.mongodb.net/construction_tracker?retryWrites=true&w=majority&appName=Cluster0';
      await mongoose.connect(mongoURI);
      console.log('📡 Connected to MongoDB');
      
      await correctInvoiceDates();
      
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
