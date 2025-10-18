/*
 * Enhanced script to repair invoices and reset work orders
 * Addresses: missing lineItems, orphaned work orders, duplicate detection
 * Usage: node scripts/repairInvoicesEnhanced.js
 */

const mongoose = require('mongoose');
const { Invoice } = require('../models/Invoice');
const WorkOrder = require('../models/WorkOrder');
require('dotenv').config();

const normalizeNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildLineItemFromWorkOrder = (workOrderItem) => {
  const quantity = normalizeNumber(workOrderItem.quantity, 1) || 1;
  const unitPrice = normalizeNumber(workOrderItem.unitPrice, 0);
  const totalPrice = normalizeNumber(workOrderItem.totalPrice, quantity * unitPrice);

  return {
    workOrder: workOrderItem.workOrder || null,
    serviceCategory: 'other',
    serviceSubcategory: 'work_order',
    description: workOrderItem.description || 'Work Order Service',
    quantity,
    unitType: 'fixed',
    unitPrice,
    totalPrice,
    taxable: true,
    taxRate: 0,
  };
};

const repairInvoicesEnhanced = async () => {
  const summary = {
    invoicesChecked: 0,
    invoicesRepaired: 0,
    lineItemsAdded: 0,
    workOrdersRelinked: 0,
    workOrdersReset: 0,
    duplicatesFound: [],
    errors: [],
  };

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI (or MONGODB_URI) environment variable is required');
    }

    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB');

    // Find all invoices
    const invoices = await Invoice.find({}).populate('workOrders.workOrder', 'billingStatus invoice title apartmentNumber');
    summary.invoicesChecked = invoices.length;
    console.log(`Found ${invoices.length} invoices to check`);

    for (const invoice of invoices) {
      try {
        let modified = false;
        const workOrdersArray = Array.isArray(invoice.workOrders) ? invoice.workOrders : [];
        const lineItemsArray = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];

        // CRITICAL FIX: If invoice has workOrders but lineItems are empty, rebuild lineItems
        if (workOrdersArray.length > 0 && lineItemsArray.length === 0) {
          console.log(`\n🔧 Repairing invoice ${invoice.invoiceNumber} (${invoice._id})`);
          console.log(`   - Has ${workOrdersArray.length} work orders but 0 line items`);
          
          invoice.lineItems = workOrdersArray.map(buildLineItemFromWorkOrder);
          summary.lineItemsAdded += invoice.lineItems.length;
          modified = true;
          
          console.log(`   ✅ Added ${invoice.lineItems.length} line items`);
        }

        // Recalculate totals
        const totalsBefore = {
          subtotal: invoice.subtotal,
          total: invoice.total,
        };

        invoice.calculateTotals();

        if (totalsBefore.subtotal !== invoice.subtotal || totalsBefore.total !== invoice.total) {
          console.log(`   💰 Updated totals: $${totalsBefore.total} → $${invoice.total}`);
          modified = true;
        }

        if (modified) {
          await invoice.save();
          summary.invoicesRepaired += 1;
          console.log(`   ✅ Invoice ${invoice.invoiceNumber} saved successfully`);
        }

        // Relink work orders to invoice
        const workOrderIds = invoice.workOrders
          .map((item) => item.workOrder)
          .filter((id) => !!id);

        if (workOrderIds.length > 0) {
          const updateResult = await WorkOrder.updateMany(
            { _id: { $in: workOrderIds } },
            { billingStatus: 'invoiced', invoice: invoice._id }
          );
          if (updateResult.modifiedCount > 0) {
            summary.workOrdersRelinked += updateResult.modifiedCount;
            console.log(`   🔗 Relinked ${updateResult.modifiedCount} work orders`);
          }
        }
      } catch (error) {
        console.error(`⚠️ Failed to repair invoice ${invoice.invoiceNumber}:`, error.message);
        summary.errors.push({ invoiceId: invoice._id.toString(), invoiceNumber: invoice.invoiceNumber, message: error.message });
      }
    }

    // Reset orphaned work orders (stuck as invoiced without valid invoice reference)
    console.log('\n🔍 Checking for orphaned work orders...');
    const stuckWorkOrders = await WorkOrder.find({
      billingStatus: 'invoiced',
      $or: [{ invoice: { $exists: false } }, { invoice: null }],
    });

    if (stuckWorkOrders.length > 0) {
      console.log(`Found ${stuckWorkOrders.length} orphaned work orders`);
      const resetResult = await WorkOrder.updateMany(
        { _id: { $in: stuckWorkOrders.map((wo) => wo._id) } },
        { billingStatus: 'pending', invoice: null }
      );
      summary.workOrdersReset = resetResult.modifiedCount || 0;
      console.log(`✅ Reset ${summary.workOrdersReset} orphaned work orders to pending`);
    } else {
      console.log('✅ No orphaned work orders found');
    }

    // Check for duplicate invoice numbers
    console.log('\n🔍 Checking for duplicate invoice numbers...');
    const duplicates = await Invoice.aggregate([
      { $group: { _id: '$invoiceNumber', count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicates.length > 0) {
      console.log(`⚠️ Found ${duplicates.length} duplicate invoice numbers:`);
      duplicates.forEach(dup => {
        console.log(`   - Invoice #${dup._id}: ${dup.count} copies (IDs: ${dup.ids.join(', ')})`);
        summary.duplicatesFound.push({ invoiceNumber: dup._id, count: dup.count, ids: dup.ids });
      });
    } else {
      console.log('✅ No duplicate invoice numbers found');
    }

    console.log('\n✅ Repair complete:');
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error('❌ Repair failed:', error);
    summary.errors.push({ message: error.message });
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

if (require.main === module) {
  repairInvoicesEnhanced().then(() => process.exit());
}

module.exports = { repairInvoicesEnhanced };
