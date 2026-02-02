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

exports.getUnbilledWorkOrders = catchAsync(async (req, res, next) => {
  const { buildingId } = req.params;

  if (!buildingId || !mongoose.Types.ObjectId.isValid(buildingId)) {
    return next(new AppError('Invalid building ID', 400));
  }

  const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

  const invoiceClause = {
    $or: [{ invoice: { $exists: false } }, { invoice: null }],
  };

  const billingClause = {
    $or: [
      { billingStatus: { $exists: false } },
      { billingStatus: null },
      { billingStatus: 'pending' },
    ],
  };

  const workOrders = await WorkOrder.find({
    building: buildingObjectId,
    deleted: { $ne: true },
    $and: [invoiceClause, billingClause],
  })
    .setOptions({ strictPopulate: false })
    .populate([
      { path: 'workType', select: 'name' },
      { path: 'workSubType', select: 'name' },
    ])
    .sort({ serviceDate: -1, scheduledDate: -1, createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: workOrders.length,
    data: { workOrders },
  });
});
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
exports.markAsPaid = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid invoice ID', 400));
  }

  const invoice = await Invoice.findById(id);
  if (!invoice) {
    return next(new AppError('No invoice found with that ID', 404));
  }

  if (invoice.status !== 'paid') {
    invoice.status = 'paid';
    invoice.paidDate = new Date();
    invoice.updatedBy = req.user?.id;

    if (!Array.isArray(invoice.statusHistory)) {
      invoice.statusHistory = [];
    }

    invoice.statusHistory.push({
      status: 'paid',
      timestamp: new Date(),
      notes: 'Marked as paid'
    });

    if (typeof invoice.calculateTotals === 'function') {
      invoice.calculateTotals();
    }

    await invoice.save();

    const workOrderIds = (invoice.workOrders || []).map(item => item.workOrder).filter(Boolean);
    if (workOrderIds.length > 0) {
      await WorkOrder.updateMany(
        { _id: { $in: workOrderIds }, invoice: invoice._id },
        { $set: { billingStatus: 'paid' } }
      );
    }
  }

  const populated = await Invoice.findById(invoice._id)
    .populate('building', 'name address')
    .populate('workOrders.workOrder', 'title description apartmentNumber price serviceDate scheduledDate')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');

  res.status(200).json({
    status: 'success',
    data: { invoice: populated }
  });
});
exports.updatePayment = notImplemented;
exports.addWorkOrdersToInvoice = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { workOrderIds } = req.body;

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
    return next(new AppError('workOrderIds must be a non-empty array.', 400));
  }

  const invalidId = workOrderIds.find((woId) => !mongoose.Types.ObjectId.isValid(woId));
  if (invalidId) {
    return next(new AppError('One or more work order IDs are invalid.', 400));
  }

  const invoice = await Invoice.findById(id);
  if (!invoice) {
    return next(new AppError('No invoice found with that ID', 404));
  }

  const existingIds = new Set(
    (invoice.workOrders || [])
      .map((w) => (w.workOrder ? String(w.workOrder) : null))
      .filter(Boolean)
  );

  const workOrders = await WorkOrder.find({
    _id: { $in: workOrderIds },
    deleted: { $ne: true },
  }).setOptions({ strictPopulate: false });

  if (workOrders.length === 0) {
    return next(new AppError('No work orders found for the provided IDs.', 404));
  }

  const mismatchedBuilding = workOrders.find(
    (wo) => String(wo.building) !== String(invoice.building)
  );
  if (mismatchedBuilding) {
    return next(new AppError('All work orders must belong to the same building as the invoice.', 400));
  }

  const alreadyInvoiced = workOrders.find(
    (wo) => wo.invoice && String(wo.invoice) !== String(invoice._id)
  );
  if (alreadyInvoiced) {
    return next(new AppError('One or more work orders are already attached to another invoice.', 409));
  }

  const itemsToAdd = workOrders
    .filter((wo) => !existingIds.has(String(wo._id)))
    .map((wo) => {
      const price = wo.price || wo.estimatedCost || 0;
      return {
        workOrder: wo._id,
        description: wo.title,
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
      };
    });

  invoice.workOrders = [...(invoice.workOrders || []), ...itemsToAdd];
  invoice.updatedBy = req.user?.id;
  if (typeof invoice.calculateTotals === 'function') invoice.calculateTotals();
  await invoice.save();

  if (itemsToAdd.length > 0) {
    await WorkOrder.updateMany(
      { _id: { $in: itemsToAdd.map((i) => i.workOrder) } },
      { $set: { invoice: invoice._id, billingStatus: 'invoiced' } }
    );
  }

  const populated = await Invoice.findById(invoice._id)
    .populate('building', 'name address city state zipCode')
    .populate('workOrders.workOrder', 'title description apartmentNumber price serviceDate scheduledDate');

  res.status(200).json({
    status: 'success',
    data: { invoice: populated },
  });
});

exports.removeWorkOrdersFromInvoice = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { workOrderIds } = req.body;

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
    return next(new AppError('workOrderIds must be a non-empty array.', 400));
  }

  const invalidId = workOrderIds.find((woId) => !mongoose.Types.ObjectId.isValid(woId));
  if (invalidId) {
    return next(new AppError('One or more work order IDs are invalid.', 400));
  }

  const invoice = await Invoice.findById(id);
  if (!invoice) {
    return next(new AppError('No invoice found with that ID', 404));
  }

  const beforeCount = (invoice.workOrders || []).length;
  invoice.workOrders = (invoice.workOrders || []).filter((item) => {
    const woId = item.workOrder ? String(item.workOrder) : null;
    return !woId || !workOrderIds.includes(woId);
  });

  invoice.updatedBy = req.user?.id;
  if (typeof invoice.calculateTotals === 'function') invoice.calculateTotals();
  await invoice.save();

  if (beforeCount !== (invoice.workOrders || []).length) {
    await WorkOrder.updateMany(
      { _id: { $in: workOrderIds }, invoice: invoice._id },
      { $set: { invoice: null, billingStatus: 'pending' } }
    );
  }

  const populated = await Invoice.findById(invoice._id)
    .populate('building', 'name address city state zipCode')
    .populate('workOrders.workOrder', 'title description apartmentNumber price serviceDate scheduledDate');

  res.status(200).json({
    status: 'success',
    data: { invoice: populated },
  });
});
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
    invoiceNumber: manualInvoiceNumber, // Capture manual invoice number
  } = req.body;

  console.log('--- CREATE INVOICE ---');
  console.log('Received work orders:', JSON.stringify(selectedWorkOrders, null, 2));
  console.log('Manual Invoice Number:', manualInvoiceNumber);

  if (!building || !selectedWorkOrders || selectedWorkOrders.length === 0) {
    return next(
      new AppError('Building and at least one work order are required.', 400)
    );
  }

  let invoiceNumber;

  // --- 1. Use manual invoice number or generate a new one ---
  if (manualInvoiceNumber && manualInvoiceNumber.trim() !== '') {
    invoiceNumber = manualInvoiceNumber.trim();
    // Check if this invoice number already exists to prevent duplicates
    const existingInvoice = await Invoice.findOne({ invoiceNumber });
    if (existingInvoice) {
      return next(new AppError('An invoice with this number already exists.', 409));
    }
  } else {
    const currentYear = new Date().getFullYear();
    const counter = await InvoiceCounter.findOneAndUpdate(
      { year: currentYear },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );
    invoiceNumber = `${currentYear}-${String(counter.count).padStart(4, '0')}`;
  }

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
      select: 'title description apartmentNumber price serviceDate scheduledDate'
    });

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  if (!invoice.building) {
    return next(new AppError('Building information is missing for this invoice.', 400));
  }

  const logoUrl = 'https://res.cloudinary.com/dwqxiigpd/image/upload/v1756186310/dsj-logo_mb3npa.jpg';

  const escapeHtml = (str) => {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const formatMoney = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatShortDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('en-US');
  };

  const company = {
    name: 'DSJ Construction & Services LLC',
    address: '651 Pullman Pl',
    cityStateZip: 'Gaithersburg, MD 20877 USA',
    email: 'info@servicesdsj.com',
  };

  const itemsHtml = (invoice.workOrders || [])
    .map((item) => {
      const wo = item.workOrder || {};
      const qty = item.quantity || 1;
      const rate = wo.price !== undefined ? wo.price : (item.unitPrice || item.totalPrice || 0);
      const amount = (qty * (rate || 0));
      const date = wo.serviceDate || wo.scheduledDate || wo.date || wo.createdAt || invoice.invoiceDate;
      const activity = wo.workType?.name || 'Service';
      const title = wo.title || item.description || 'Work Order';
      const desc = wo.description ? escapeHtml(wo.description) : '';

      return `
        <tr>
          <td class="col-date">${escapeHtml(formatShortDate(date))}</td>
          <td class="col-activity">${escapeHtml(activity)}</td>
          <td class="col-description">
            <div class="desc-title">${escapeHtml(title)}</div>
            ${desc ? `<div class="desc-body">${desc}</div>` : ''}
          </td>
          <td class="col-qty">${qty}</td>
          <td class="col-rate">${escapeHtml(formatMoney(rate))}</td>
          <td class="col-amount">${escapeHtml(formatMoney(amount))}</td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * { box-sizing: border-box; }
            @page { size: Letter; margin: 0.6in; }
            html, body { width: 100%; }
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; font-size: 10px; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; }

            /* Prevent cut-off by never using a fixed width larger than the page */
            .invoice-box { width: 100%; max-width: 7.2in; margin: 0 auto; }

            .header { display: table; width: 100%; table-layout: fixed; margin-bottom: 14px; }
            .header-left { display: table-cell; vertical-align: top; }
            .header-right { display: table-cell; width: 90px; vertical-align: top; text-align: right; }
            .company-name { font-weight: 700; font-size: 12px; }
            .muted { color: #5f6b7a; }
            .logo { width: 72px; height: 72px; object-fit: contain; }

            .title-row { display: table; width: 100%; table-layout: fixed; margin: 6px 0 10px; }
            .title { display: table-cell; width: 70%; font-size: 20px; font-weight: 800; color: #0b4aa2; letter-spacing: 0.5px; }
            .invoice-no { display: table-cell; width: 30%; text-align: right; font-size: 12px; font-weight: 700; white-space: nowrap; }

            .meta { display: table; width: 100%; margin-bottom: 10px; }
            .billto { display: table-cell; width: 55%; vertical-align: top; }
            .billto h2 { font-size: 10px; margin: 0 0 4px; color: #0b4aa2; letter-spacing: 0.4px; }
            .billto p { margin: 0; }
            .payboxes { display: table-cell; width: 45%; vertical-align: top; text-align: right; }
            .box { display: block; width: 140px; padding: 8px 10px; margin: 0 0 6px auto; border-radius: 3px; text-align: center; }
            .box.light { background: #e8f2ff; color: #1b2b3a; }
            .box.dark { background: #0b4aa2; color: #fff; }
            .box .label { font-size: 8px; opacity: 0.85; }
            .box .value { font-size: 10px; font-weight: 700; }

            .items { margin-top: 8px; border: 1px solid #dfe6ef; }
            .items thead { display: table-header-group; }
            .items th { background: #243447; color: #fff; font-size: 9px; padding: 8px 8px; text-align: left; }
            .items td { padding: 8px 8px; border-top: 1px solid #eef2f7; vertical-align: top; }
            .items tr { page-break-inside: avoid; }
            .items tbody tr:nth-child(even) { background: #fafbfd; }
            .items { table-layout: fixed; }

            .col-date { width: 11%; }
            .col-activity { width: 14%; font-weight: 600; }
            .col-description { width: 45%; word-break: break-word; overflow-wrap: break-word; }
            .col-qty { width: 6%; text-align: center; }
            .col-rate { width: 12%; text-align: right; white-space: nowrap; }
            .col-amount { width: 12%; text-align: right; white-space: nowrap; font-weight: 700; }

            .desc-title { font-weight: 700; color: #111; }
            .desc-body { margin-top: 2px; color: #4b5563; white-space: pre-wrap; }

            .totals { width: 100%; margin-top: 10px; }
            .totals-inner { float: right; width: 46%; }
            .totals-row { display: table; width: 100%; padding: 4px 0; }
            .totals-row .l { display: table-cell; text-align: right; color: #5f6b7a; }
            .totals-row .r { display: table-cell; text-align: right; padding-left: 10px; }
            .totals-total { border-top: 2px solid #243447; margin-top: 6px; padding-top: 6px; font-size: 12px; font-weight: 800; }

            .footer { clear: both; text-align: center; margin-top: 24px; padding-top: 10px; border-top: 1px solid #e6edf5; font-size: 9px; color: #6b7280; }
        </style>
    </head>
    <body>
        <div class="invoice-box">
            <div class="header">
              <div class="header-left">
                <div class="company-name">${escapeHtml(company.name)}</div>
                <div class="muted">${escapeHtml(company.address)}</div>
                <div class="muted">${escapeHtml(company.cityStateZip)}</div>
                <div class="muted">${escapeHtml(company.email)}</div>
              </div>
              <div class="header-right">
                <img src="${logoUrl}" alt="DSJ Logo" class="logo" />
              </div>
            </div>

            <div class="title-row">
              <div class="title">INVOICE</div>
              <div class="invoice-no">${escapeHtml(invoice.invoiceNumber)}</div>
            </div>

            <div class="meta">
              <div class="billto">
                <h2>BILL TO</h2>
                <p><strong>${escapeHtml(invoice.building.name)}</strong></p>
                <p class="muted">${escapeHtml(invoice.building.address || '')}</p>
                <p class="muted">${escapeHtml(invoice.building.city || '')}${invoice.building.city ? ', ' : ''}${escapeHtml(invoice.building.state || '')} ${escapeHtml(invoice.building.zipCode || '')}</p>
              </div>
              <div class="payboxes">
                <div class="box light">
                  <div class="label">DATE</div>
                  <div class="value">${escapeHtml(formatShortDate(invoice.invoiceDate))}</div>
                </div>
                <div class="box dark">
                  <div class="label">PLEASE PAY</div>
                  <div class="value">$${formatMoney(invoice.total || 0)}</div>
                </div>
                <div class="box light">
                  <div class="label">DUE DATE</div>
                  <div class="value">${escapeHtml(formatShortDate(invoice.dueDate))}</div>
                </div>
              </div>
            </div>

            <table class="items">
              <thead>
                <tr>
                  <th class="col-date">DATE</th>
                  <th class="col-activity">ACTIVITY</th>
                  <th class="col-description">DESCRIPTION</th>
                  <th class="col-qty">QTY</th>
                  <th class="col-rate">RATE</th>
                  <th class="col-amount">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-inner">
                <div class="totals-row"><div class="l">SUBTOTAL</div><div class="r">$${formatMoney(invoice.subtotal || 0)}</div></div>
                <div class="totals-row"><div class="l">TAX</div><div class="r">$${formatMoney(invoice.tax || 0)}</div></div>
                <div class="totals-row totals-total"><div class="l">TOTAL DUE</div><div class="r">$${formatMoney(invoice.total || 0)}</div></div>
              </div>
            </div>

            <div class="footer">
              Thank you for your business!
            </div>
        </div>
    </body>
    </html>
  `;

  const options = {
    format: 'Letter',
    border: { top: '0.6in', right: '0.6in', bottom: '0.6in', left: '0.6in' }
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
