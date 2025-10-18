// Migration script to fix invoice dates
// Run this script to update invoices that were saved with system dates instead of intended invoice dates

const mongoose = require('mongoose');
const { Invoice } = require('../models/Invoice');
require('dotenv').config();

const fixInvoiceDates = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find invoices that might have incorrect dates
    // Look for invoices where createdAt and invoiceDate are very close (within 1 minute)
    // This suggests they were saved with system date instead of intended date
    const problematicInvoices = await Invoice.find({
      $expr: {
        $lt: [
          { $abs: { $subtract: ['$invoiceDate', '$createdAt'] } },
          60000 // 1 minute in milliseconds
        ]
      }
    });

    console.log(`Found ${problematicInvoices.length} potentially problematic invoices`);

    // For each problematic invoice, we need to determine the correct date
    // Since we don't have the original intended date, we'll need to make some assumptions
    // or ask the user to provide the correct dates

    // For now, let's just log the problematic invoices
    problematicInvoices.forEach(invoice => {
      const createdAt = new Date(invoice.createdAt);
      const invoiceDate = new Date(invoice.invoiceDate);
      const timeDiff = Math.abs(invoiceDate - createdAt);

      console.log(`Invoice ${invoice.invoiceNumber}:`);
      console.log(`  Created: ${createdAt.toISOString()}`);
      console.log(`  Invoice Date: ${invoiceDate.toISOString()}`);
      console.log(`  Time Difference: ${timeDiff}ms (${Math.round(timeDiff/1000)}s)`);
      console.log('---');
    });

    // If you want to automatically fix the dates, you could:
    // 1. Set invoiceDate to be 1 day before createdAt (assuming they were created the day after the intended date)
    // 2. Or set it to the same date as createdAt but with a specific time

    // Example automatic fix (uncomment if you want to apply this):
    /*
    for (const invoice of problematicInvoices) {
      // Set invoice date to be the same as created date but at a reasonable business hour (9 AM)
      const createdDate = new Date(invoice.createdAt);
      const correctedDate = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate(), 9, 0, 0);

      await Invoice.findByIdAndUpdate(invoice._id, {
        invoiceDate: correctedDate
      });

      console.log(`Updated invoice ${invoice.invoiceNumber} date to ${correctedDate.toISOString()}`);
    }
    */

    console.log('Migration completed. Check the logs above for problematic invoices.');
    console.log('If you want to automatically fix the dates, uncomment the fix section in this script.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the migration
if (require.main === module) {
  fixInvoiceDates();
}

module.exports = { fixInvoiceDates };
