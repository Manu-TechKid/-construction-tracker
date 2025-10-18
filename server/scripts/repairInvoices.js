/*
 * Script to repair invoices and reset work orders that are stuck in the invoiced state
 * Usage: NODE_ENV=production npm run migrate:repair-invoices
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

const buildWorkOrderSummaryFromLineItem = (lineItem) => {
  const quantity = normalizeNumber(lineItem.quantity, 1) || 1;
  const unitPrice = normalizeNumber(lineItem.unitPrice, 0);
  const totalPrice = normalizeNumber(lineItem.totalPrice, quantity * unitPrice);

  return {
    workOrder: lineItem.workOrder || null,
    description: lineItem.description || 'Invoice Line Item',
    quantity,
    unitPrice,
    totalPrice,
    costBreakdown: {
      services: 0,
      price: totalPrice,
      actualCost: 0,
      estimatedCost: 0,
      calculatedFrom: 'lineItem',
    },
  };
};

const repairInvoices = async () => {
  const summary = {
    invoicesChecked: 0,
    invoicesUpdated: 0,
    lineItemsFixed: 0,
    workOrdersLinked: 0,
    workOrdersReset: 0,
    errors: [],
  };

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI (or MONGODB_URI) environment variable is required');
    }

    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB');

    const invoices = await Invoice.find({}).populate('workOrders.workOrder', 'billingStatus invoice title apartmentNumber');
    summary.invoicesChecked = invoices.length;

    for (const invoice of invoices) {
      try {
        let modified = false;
        const workOrdersArray = Array.isArray(invoice.workOrders) ? invoice.workOrders : [];
        const lineItemsArray = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];

        // If invoice has workOrders but lineItems are missing, rebuild lineItems
        if (workOrdersArray.length > 0 && lineItemsArray.length === 0) {
          invoice.lineItems = workOrdersArray.map(buildLineItemFromWorkOrder);
          summary.lineItemsFixed += invoice.lineItems.length;
          modified = true;
        }

        // If invoice has lineItems but no workOrders, rebuild workOrders summaries
        if (lineItemsArray.length > 0 && workOrdersArray.length === 0) {
          invoice.workOrders = lineItemsArray.map(buildWorkOrderSummaryFromLineItem);
          modified = true;
        }

        // Ensure totals are up to date
        const totalsBefore = {
          subtotal: invoice.subtotal,
          total: invoice.total,
        };

        invoice.calculateTotals();

        if (totalsBefore.subtotal !== invoice.subtotal || totalsBefore.total !== invoice.total) {
          modified = true;
        }

        if (modified) {
          await invoice.save();
          summary.invoicesUpdated += 1;
        }

        // Relink work orders -> invoice
        const workOrderIds = invoice.workOrders
          .map((item) => item.workOrder)
          .filter((id) => !!id);

        if (workOrderIds.length > 0) {
          const updateResult = await WorkOrder.updateMany(
            { _id: { $in: workOrderIds } },
            { billingStatus: 'invoiced', invoice: invoice._id }
          );
          summary.workOrdersLinked += updateResult.modifiedCount || 0;
        }
      } catch (error) {
        console.error(`⚠️ Failed to repair invoice ${invoice._id}:`, error);
        summary.errors.push({ invoiceId: invoice._id.toString(), message: error.message });
      }
    }

    // Reset orphaned work orders that are stuck as invoiced without an invoice reference
    const stuckWorkOrders = await WorkOrder.find({
      billingStatus: 'invoiced',
      $or: [{ invoice: { $exists: false } }, { invoice: null }],
    });

    if (stuckWorkOrders.length > 0) {
      const resetResult = await WorkOrder.updateMany(
        { _id: { $in: stuckWorkOrders.map((wo) => wo._id) } },
        { billingStatus: 'pending', invoice: null }
      );
      summary.workOrdersReset = resetResult.modifiedCount || 0;
    }

    console.log('✅ Repair complete:');
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
  repairInvoices().then(() => process.exit());
}

module.exports = { repairInvoices };
