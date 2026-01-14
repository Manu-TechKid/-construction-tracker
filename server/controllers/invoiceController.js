const { Invoice } = require('../models/Invoice');
const WorkOrder = require('../models/WorkOrder');
const InvoiceCounter = require('../models/InvoiceCounter');
const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const pdf = require('html-pdf');

// Placeholder for missing functions to prevent server crash
const notImplemented = (req, res, next) => {
  next(new AppError('This feature is not yet implemented.', 501));
};

exports.getUnbilledWorkOrders = notImplemented;
exports.getFilteredWorkOrders = catchAsync(async (req, res, next) => {
  console.log('--- Received Filter Request ---');
  console.log('Query Params:', req.query);

  const { buildingId, startDate, endDate, status } = req.query;

  if (!buildingId || !startDate || !endDate) {
    return next(new AppError('Please provide a building, start date, and end date.', 400));
  }

  if (!mongoose.Types.ObjectId.isValid(buildingId)) {
    return next(new AppError('Invalid building ID', 400));
  }

  const dateRange = {
    $gte: new Date(startDate),
    $lte: new Date(endDate),
  };

  const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

  const dateClause = {
    $or: [
      { serviceDate: dateRange },
      { scheduledDate: dateRange },
      // Legacy field support in case some docs still use "date"
      { date: dateRange },
    ],
  };

  const invoiceClause = {
    $or: [{ invoice: { $exists: false } }, { invoice: null }],
  };

  const statusClause = status
    ? { status }
    : { status: { $in: ['completed', 'in_progress', 'pending'] } };

  try {
    const findQuery = {
      building: buildingObjectId,
      $and: [
        dateClause,
        invoiceClause,
        // Avoid soft-deleted records just in case
        { deleted: { $ne: true } },
      ],
      ...statusClause,
    };

    const [totalForBuilding, totalDateMatches, totalUnbilled, totalDateAndUnbilled] =
      await Promise.all([
        WorkOrder.countDocuments({ building: buildingObjectId }),
        WorkOrder.countDocuments({ building: buildingObjectId, ...dateClause }),
        WorkOrder.countDocuments({ building: buildingObjectId, ...invoiceClause }),
        WorkOrder.countDocuments({
          building: buildingObjectId,
          $and: [dateClause, invoiceClause],
        }),
      ]);

    console.log('--- Preliminary Counts ---');
    console.log(
      JSON.stringify(
        {
          totalForBuilding,
          totalDateMatches,
          totalUnbilled,
          totalDateAndUnbilled,
        },
        null,
        2
      )
    );

    console.log('--- Executing Database Query ---');
    console.log('Find Query:', JSON.stringify(findQuery, null, 2));

    const workOrders = await WorkOrder.find(findQuery)
      .setOptions({ strictPopulate: false })
      .populate([
        { path: 'workType', select: 'name' },
        { path: 'workSubType', select: 'name' },
      ]);

    console.log(`--- Query Result ---`);
    console.log(`Found ${workOrders.length} work orders.`);

    res.status(200).json({
      status: 'success',
      results: workOrders.length,
      data: {
        workOrders,
      },
    });
  } catch (err) {
    console.error('Error in getFilteredWorkOrders:', err);
    return next(err);
  }
});

exports.debugInvoiceNumber = notImplemented;
exports.forceDeleteDraftInvoice = notImplemented;
exports.getMyInvoices = notImplemented;
exports.createFromEstimate = notImplemented;
exports.sendInvoice = notImplemented;
exports.acceptInvoice = notImplemented;
exports.calculateTotals = notImplemented;
exports.emailInvoice = notImplemented;
exports.markAsPaid = notImplemented;
exports.updatePayment = notImplemented;
exports.addWorkOrdersToInvoice = notImplemented;
exports.removeWorkOrdersFromInvoice = notImplemented;
exports.addLineItem = notImplemented;
exports.updateLineItem = notImplemented;
exports.removeLineItem = notImplemented;
exports.getNextInvoiceNumber = notImplemented;
exports.getSummaryReport = notImplemented;
exports.getAgingReport = notImplemented;
exports.getClientSummaryReport = notImplemented;

// Get all invoices
exports.getAllInvoices = catchAsync(async (req, res, next) => {
  const { search, status, buildingId, invoiceDateStart, invoiceDateEnd } = req.query;

  const filter = {};

  if (search) {
    filter.invoiceNumber = { $regex: search, $options: 'i' };
  } else {
    if (status) {
      filter.status = status;
    }
    if (buildingId) {
      filter.building = buildingId;
    }
    if (invoiceDateStart && invoiceDateEnd) {
      filter.invoiceDate = {
        $gte: new Date(invoiceDateStart),
        $lte: new Date(invoiceDateEnd),
      };
    }
  }

  const invoices = await Invoice.find(filter)
    .populate('building', 'name address')
    .populate('workOrders.workOrder', 'title description price workType')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort('-createdAt');

  res.status(200).json({ status: 'success', results: invoices.length, data: { invoices } });
});

// Get single invoice
exports.getInvoice = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findById(req.params.id)
        .populate('building', 'name address')
        .populate('workOrders.workOrder', 'title description price');
    if (!invoice) {
        return next(new AppError('No invoice found with that ID', 404));
    }
    res.status(200).json({ status: 'success', data: { invoice } });
});

// Create invoice
exports.createInvoice = catchAsync(async (req, res, next) => {
  const {
    building,
    invoiceDate,
    dueDate,
    workOrders: selectedWorkOrders,
    notes,
  } = req.body;

  if (!building || !selectedWorkOrders || selectedWorkOrders.length === 0) {
    return next(
      new AppError('Building and at least one work order are required.', 400)
    );
  }

  // --- 1. Generate Invoice Number ---
  const counter = await InvoiceCounter.findOneAndUpdate(
    { name: 'invoiceNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const invoiceNumber = `INV-${String(counter.seq).padStart(6, '0')}`;

  // --- 2. Calculate Totals ---
  const workOrderDetails = await WorkOrder.find({
    _id: { $in: selectedWorkOrders.map(wo => wo._id) },
  });

  let subtotal = 0;
  const workOrderItems = workOrderDetails.map(wo => {
    const price = wo.price || wo.estimatedCost || 0;
    subtotal += price;
    return {
      workOrder: wo._id,
      description: wo.title,
      totalPrice: price,
    };
  });

  const taxRate = 0.0; // Assuming no tax for now
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // --- 3. Create Invoice ---
  const newInvoice = await Invoice.create({
    invoiceNumber,
    building,
    invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
    dueDate: dueDate ? new Date(dueDate) : new Date(),
    workOrders: workOrderItems,
    subtotal,
    tax,
    total,
    notes,
    status: 'draft',
    createdBy: req.user.id,
  });

  // --- 4. Update Work Orders ---
  await WorkOrder.updateMany(
    { _id: { $in: workOrderDetails.map(wo => wo._id) } },
    {
      $set: {
        invoice: newInvoice._id,
        billingStatus: 'invoiced',
      },
    }
  );

  res.status(201).json({
    status: 'success',
    data: {
      invoice: newInvoice,
    },
  });
});

// Update invoice
exports.updateInvoice = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    if (!invoice) {
        return next(new AppError('No invoice found with that ID', 404));
    }
    res.status(200).json({ status: 'success', data: { invoice } });
});

// Delete invoice (soft delete)
exports.deleteInvoice = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        return next(new AppError('No invoice found with that ID', 404));
    }

    const workOrderIds = invoice.workOrders.map(wo => wo.workOrder).filter(Boolean);
    if (workOrderIds.length > 0) {
        await WorkOrder.updateMany(
            { _id: { $in: workOrderIds } },
            { $set: { billingStatus: 'pending', invoice: null } }
        );
    }

    invoice.deleted = true;
    invoice.deletedBy = req.user.id;
    invoice.deletedAt = new Date();
    invoice.status = 'cancelled';
    await invoice.save();
    
    res.status(204).json({ status: 'success', data: null });
});

// Generate PDF for invoice
exports.generatePDF = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('building', 'name address city state zipCode')
    .populate({ 
      path: 'workOrders.workOrder',
      select: 'title description price'
    });

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  if (!invoice.building) {
    return next(new AppError('Building information is missing for this invoice.', 400));
  }

  const logoUrl = 'https://res.cloudinary.com/dwqxiigpd/image/upload/v1756186310/dsj-logo_mb3npa.jpg';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333; font-size: 11px; line-height: 1.6; }
            .invoice-box { width: 100%; max-width: 800px; margin: auto; padding: 30px; }
            table { width: 100%; border-collapse: collapse; }
            .header-table, .details-table { margin-bottom: 30px; }
            .header-table td { vertical-align: top; }
            .logo { width: 150px; }
            .company-info { text-align: right; word-wrap: break-word; }
            .bill-to p { word-wrap: break-word; }
            .company-info h1 { font-size: 32px; color: #00529B; margin: 0; }
            .bill-to h2 { font-size: 14px; color: #00529B; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .invoice-meta { text-align: right; }
            .invoice-meta p { margin: 2px 0; }
            .items-table { margin-top: 20px; }
            .items-table th { background-color: #f2f2f2; text-align: left; font-weight: bold; padding: 10px; border-bottom: 1px solid #ddd; }
            .items-table td { padding: 10px; border-bottom: 1px solid #ddd; }
            .items-table .description { width: 75%; }
            .items-table .amount { text-align: right; }
            .totals-table { float: right; width: 45%; margin-top: 20px; }
            .totals-table td { padding: 8px; }
            .totals-table .label { text-align: right; font-weight: bold; }
            .totals-table .value { text-align: right; }
            .totals-table .total-row td { border-top: 2px solid #333; font-weight: bold; font-size: 13px; }
            .footer { text-align: center; margin-top: 80px; padding-top: 15px; border-top: 1px solid #eee; font-size: 10px; color: #777; }
        </style>
    </head>
    <body>
        <div class="invoice-box">
            <table class="header-table">
                <tr>
                    <td><img src="${logoUrl}" alt="DSJ Logo" class="logo"></td>
                    <td class="company-info">
                        <h1>INVOICE</h1>
                        <p>DSJ Construction Inc.<br>123 Construction Ave.<br>New York, NY 10001</p>
                    </td>
                </tr>
            </table>
            <table class="details-table">
                <tr>
                    <td class="bill-to">
                        <h2>BILL TO:</h2>
                        <p>${invoice.building.name}<br>${invoice.building.address || ''}<br>${invoice.building.city || ''}, ${invoice.building.state || ''} ${invoice.building.zipCode || ''}</p>
                    </td>
                    <td class="invoice-meta">
                        <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
                        <p><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                        <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
                    </td>
                </tr>
            </table>
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="description">Description</th>
                        <th class="amount">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.workOrders.map(item => `
                        <tr>
                            <td>${item.workOrder ? item.workOrder.title : (item.description || 'Work Order Item')}</td>
                            <td class="amount">$${(item.totalPrice || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <table class="totals-table">
                <tr>
                    <td class="label">Subtotal:</td>
                    <td class="value">$${(invoice.subtotal || 0).toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="label">Tax:</td>
                    <td class="value">$${(invoice.tax || 0).toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td class="label">Total:</td>
                    <td class="value">$${(invoice.total || 0).toFixed(2)}</td>
                </tr>
            </table>
            <div style="clear: both;"></div>
            <div class="footer">
                <p>Thank you for your business!</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const options = {
    format: 'Letter',
    border: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
  };

  pdf.create(htmlContent, options).toBuffer((err, buffer) => {
    if (err) {
      console.error('PDF Generation Error:', err);
      return next(new AppError('Could not generate PDF', 500));
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    res.send(buffer);
  });
});
