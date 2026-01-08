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
exports.getFilteredWorkOrders = notImplemented;
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
  const filter = {};
  // A more robust implementation would handle query params for filtering
  const invoices = await Invoice.find(filter)
    .populate('building', 'name address')
    .populate('workOrders.workOrder', 'title description price')
    .populate('createdBy', 'name')
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
    const { buildingId, workOrderIds } = req.body;
    if (!buildingId || !workOrderIds || workOrderIds.length === 0) {
        return next(new AppError('Building and work orders are required', 400));
    }
    // This is a simplified version. A full implementation would calculate totals, etc.
    const invoice = await Invoice.create(req.body);
    res.status(201).json({ status: 'success', data: { invoice } });
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
            body { font-family: Arial, sans-serif; color: #333; font-size: 10px; margin: 0; padding: 0; }
            .container { padding: 40px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
            .header img { width: 150px; height: auto; }
            .header-info { text-align: right; }
            .details-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
            h1, h2 { color: #00529B; }
            h1 { font-size: 28px; margin: 0; }
            h2 { font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; word-wrap: break-word; }
            th { background-color: #f2f2f2; }
            .totals { float: right; width: 40%; margin-top: 20px; }
            .totals table td:first-child { text-align: right; font-weight: bold; }
            .totals table td:last-child { text-align: right; }
            .footer { text-align: center; margin-top: 40px; padding-top: 10px; border-top: 1px solid #eee; font-size: 9px; color: #777; position: absolute; bottom: 40px; left: 40px; right: 40px; }
            .address { white-space: pre-line; }
            .clearfix::after { content: ""; clear: both; display: table; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${logoUrl}" alt="DSJ Logo">
                <div class="header-info">
                    <h1>INVOICE</h1>
                    <p>DSJ Construction Inc.<br>123 Construction Ave.<br>New York, NY 10001</p>
                </div>
            </div>
            <div class="details-section">
                <div class="client-details">
                    <h2>BILL TO:</h2>
                    <p class="address">${invoice.building.name}<br>${invoice.building.address || ''}<br>${invoice.building.city || ''}, ${invoice.building.state || ''} ${invoice.building.zipCode || ''}</p>
                </div>
                <div class="invoice-details" style="text-align: right;">
                    <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
                    <p><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                    <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
                </div>
            </div>
            <h2>Work Items</h2>
            <table>
                <thead>
                    <tr>
                        <th style="width: 75%;">Description</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.workOrders.map(item => `
                        <tr>
                            <td>${item.workOrder ? item.workOrder.title : (item.description || 'Work Order Item')}</td>
                            <td>$${(item.totalPrice || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="totals">
                <table>
                    <tr>
                        <td>Subtotal:</td>
                        <td>$${(invoice.subtotal || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Tax:</td>
                        <td>$${(invoice.tax || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td><strong>Total:</strong></td>
                        <td><strong>$${(invoice.total || 0).toFixed(2)}</strong></td>
                    </tr>
                </table>
            </div>
            <div class="clearfix"></div>
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
