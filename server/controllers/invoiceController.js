const { Invoice, InvoiceCounter } = require('../models/InvoiceSimple');
const WorkOrder = require('../models/WorkOrder');
const WorkType = require('../models/WorkType');
const WorkSubType = require('../models/WorkSubType');
const ProjectEstimate = require('../models/ProjectEstimate');
const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Get all invoices
exports.getAllInvoices = catchAsync(async (req, res, next) => {
    const invoices = await Invoice.find()
        .populate('building', 'name address')
        .populate('workOrders.workOrder', 'title description apartmentNumber status')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: invoices.length,
        data: {
            invoices
        }
    });
});

// Get single invoice
exports.getInvoice = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findById(req.params.id)
        .populate('building', 'name address')
        .populate('workOrders.workOrder', 'title description apartmentNumber status');

    if (!invoice) {
        return next(new AppError('No invoice found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            invoice
        }
    });
});

// Create invoice from work orders
exports.createInvoice = catchAsync(async (req, res, next) => {
    const { buildingId, workOrderIds, dueDate, invoiceDate, notes, invoiceNumber, totalAmount } = req.body;

    console.log('createInvoice called with:', { buildingId, workOrderIds, dueDate, invoiceDate, notes, invoiceNumber, totalAmount });

    // Validate required fields
    if (!buildingId) {
        return next(new AppError('Building ID is required', 400));
    }
    if (!workOrderIds || workOrderIds.length === 0) {
        return next(new AppError('At least one work order must be selected', 400));
    }

    // Get work orders that haven't been invoiced yet
    const workOrders = await WorkOrder.find({
        _id: { $in: workOrderIds },
        building: buildingId,
        $or: [
            { billingStatus: { $exists: false } },
            { billingStatus: 'pending' },
            { billingStatus: null }
        ]
    }).populate('building', 'name address');

    console.log('Found work orders for invoice:', workOrders.length);
    console.log('Work orders:', workOrders);

    if (workOrders.length === 0) {
        return next(new AppError('No eligible work orders found for invoicing. Work orders may already be invoiced.', 400));
    }

    // Calculate totals using consistent logic with frontend
    let subtotal = 0;
    const invoiceWorkOrders = workOrders.map(wo => {
        let totalPrice = 0;

        // Priority 1: Calculate from services if available
        if (wo.services && wo.services.length > 0) {
            totalPrice = wo.services.reduce((sum, service) => {
                return sum + (service.laborCost || 0) + (service.materialCost || 0);
            }, 0);
        }
        // Priority 2: Use price field (what customer pays)
        else if (wo.price && wo.price > 0) {
            totalPrice = wo.price;
        }
        // Priority 3: Fall back to actual cost
        else if (wo.actualCost && wo.actualCost > 0) {
            totalPrice = wo.actualCost;
        }
        // Priority 4: Use estimated cost
        else {
            totalPrice = wo.estimatedCost || 0;
        }

        subtotal += totalPrice;

        return {
            workOrder: wo._id,
            description: `${wo.title || 'Work Order'} (Apt: ${wo.apartmentNumber || 'N/A'})`,
            quantity: 1,
            unitPrice: totalPrice,
            totalPrice: totalPrice,
            // Add debug info
            costBreakdown: {
                services: wo.services?.length || 0,
                price: wo.price || 0,
                actualCost: wo.actualCost || 0,
                estimatedCost: wo.estimatedCost || 0,
                calculatedFrom: wo.services?.length > 0 ? 'services' : 
                               wo.price > 0 ? 'price' : 
                               wo.actualCost > 0 ? 'actualCost' : 'estimatedCost'
            }
        };
    });

    // NO TAX - invoices should not include tax
    const tax = 0;
    const total = subtotal;

    // Create invoice with proper date handling
    const invoiceData = {
        building: buildingId,
        workOrders: invoiceWorkOrders,
        subtotal,
        tax,
        total,
        issueDate: new Date(), // Always current date when invoice is created
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(), // Date to send to client
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Due date
        notes,
        createdBy: req.user ? req.user._id : null
    };

    // Add manual invoice number if provided
    if (invoiceNumber && invoiceNumber.trim()) {
        // Check if invoice number already exists
        const existingInvoice = await Invoice.findOne({ invoiceNumber: invoiceNumber.trim().toUpperCase() });
        if (existingInvoice) {
            return next(new AppError('An invoice with this number already exists', 400));
        }
        invoiceData.invoiceNumber = invoiceNumber.trim().toUpperCase();
    }
    // If no invoice number provided, the pre-save hook will generate one

    console.log('=== CREATING INVOICE ===');
    console.log('Invoice data to be saved:', JSON.stringify(invoiceData, null, 2));

    try {
        const invoice = await Invoice.create(invoiceData);
        console.log('Invoice created successfully:', invoice._id);
        console.log('Generated invoice number:', invoice.invoiceNumber);

        // Update work orders billing status
        await WorkOrder.updateMany(
            { _id: { $in: workOrderIds } },
            { billingStatus: 'invoiced' }
        );

        const populatedInvoice = await Invoice.findById(invoice._id)
            .populate('building', 'name address')
            .populate('workOrders.workOrder', 'title description apartmentNumber');

        console.log('Invoice populated successfully');

        res.status(201).json({
            status: 'success',
            data: {
                invoice: populatedInvoice
            }
        });
    } catch (error) {
        console.error('=== INVOICE CREATION FAILED ===');
        console.error('Error creating invoice:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        if (error.name === 'ValidationError') {
            console.error('Validation errors:', error.errors);
            return next(new AppError(`Validation failed: ${Object.values(error.errors).map(err => err.message).join(', ')}`, 400));
        }

        return next(new AppError('Failed to create invoice', 500));
    }
});

// Update invoice
exports.updateInvoice = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
            new: true,
            runValidators: true
        }
    ).populate('building', 'name address')
     .populate('workOrders.workOrder', 'title description apartmentNumber');

    if (!invoice) {
        return next(new AppError('No invoice found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            invoice
        }
    });
});

// Mark invoice as paid
exports.markAsPaid = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        {
            status: 'paid',
            paidDate: new Date()
        },
        { new: true }
    );

    if (!invoice) {
        return next(new AppError('No invoice found with that ID', 404));
    }

    // Update work orders billing status to paid
    const workOrderIds = invoice.workOrders.map(wo => wo.workOrder);
    await WorkOrder.updateMany(
        { _id: { $in: workOrderIds } },
        { billingStatus: 'paid' }
    );

    res.status(200).json({
        status: 'success',
        data: {
            invoice
        }
    });
});

// Update payment information
exports.updatePayment = catchAsync(async (req, res, next) => {
    const { paymentMethod, paymentDate, amountPaid, notes } = req.body;

    const updateData = {};
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (paymentDate) updateData.paymentDate = paymentDate;
    if (amountPaid !== undefined) updateData.amountPaid = amountPaid;
    if (notes !== undefined) updateData.paymentNotes = notes;

    // If amount paid equals total, mark as paid
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        return next(new AppError('No invoice found with that ID', 404));
    }

    if (amountPaid && amountPaid >= invoice.total) {
        updateData.status = 'paid';
        updateData.paidDate = paymentDate || new Date();
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    ).populate('building', 'name address')
     .populate('workOrders.workOrder', 'title description apartmentNumber');

    res.status(200).json({
        status: 'success',
        data: {
            invoice: updatedInvoice
        }
    });
});

// Get invoices for the logged-in worker
exports.getMyInvoices = catchAsync(async (req, res, next) => {
    // Find all work orders assigned to this worker
    const workOrders = await WorkOrder.find({
        assignedTo: req.user._id,
        billingStatus: 'invoiced'
    }).select('_id');

    const workOrderIds = workOrders.map(wo => wo._id);

    // Find invoices containing these work orders
    const invoices = await Invoice.find({
        'workOrders.workOrder': { $in: workOrderIds }
    })
    .populate('building', 'name address')
    .populate('workOrders.workOrder', 'title description apartmentNumber status')
    .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: invoices.length,
        data: {
            invoices
        }
    });
});

// Get unbilled work orders for a building
exports.getUnbilledWorkOrders = catchAsync(async (req, res, next) => {
    const { buildingId } = req.params;

    if (!buildingId) {
        return next(new AppError('Building ID is required', 400));
    }

    console.log('getUnbilledWorkOrders called with buildingId:', buildingId);

    // Find work orders that haven't been invoiced yet
    const workOrders = await WorkOrder.find({
        building: buildingId,
        $or: [
            { billingStatus: { $exists: false } },
            { billingStatus: 'pending' },
            { billingStatus: null }
        ]
    }).populate('building', 'name address')
      .sort('-createdAt');

    console.log('Found work orders:', workOrders.length);
    console.log('Work orders data:', workOrders);

    res.status(200).json({
        status: 'success',
        results: workOrders.length,
        data: workOrders
    });
});

// Get filtered work orders for invoice creation
exports.getFilteredWorkOrders = catchAsync(async (req, res, next) => {
    const { 
        buildingId, 
        startDate, 
        endDate, 
        workType, 
        workSubType, 
        status 
    } = req.query;

    if (!buildingId) {
        return next(new AppError('Building ID is required', 400));
    }

    console.log('getFilteredWorkOrders called with filters:', req.query);

    // Build base query conditions
    const conditions = [];

    // 1. Building filter (required)
    conditions.push({ building: buildingId });

    // 2. Billing status filter (required - only unbilled work orders)
    conditions.push({
        $or: [
            { billingStatus: { $exists: false } },
            { billingStatus: 'pending' },
            { billingStatus: null }
        ]
    });

    // 3. Date range filter (optional)
    if (startDate || endDate) {
        const dateConditions = [];

        // Work orders with scheduledDate in range
        if (startDate || endDate) {
            const scheduledDateCondition = {};
            if (startDate) scheduledDateCondition.$gte = new Date(startDate);
            if (endDate) scheduledDateCondition.$lte = new Date(endDate);
            dateConditions.push({ scheduledDate: scheduledDateCondition });
        }

        // Work orders without scheduledDate, but createdAt in range
        if (startDate || endDate) {
            const createdAtCondition = {};
            if (startDate) createdAtCondition.$gte = new Date(startDate);
            if (endDate) createdAtCondition.$lte = new Date(endDate);
            dateConditions.push({
                scheduledDate: { $exists: false },
                createdAt: createdAtCondition
            });
        }

        // Add date conditions (must match one of these)
        conditions.push({ $or: dateConditions });
    }

    // 4. Work type filter (optional) - handle both ObjectId and string values
    if (workType && workType.trim()) {
        const trimmedWorkType = workType.trim();
        // Check if it's a valid ObjectId format
        if (/^[0-9a-fA-F]{24}$/.test(trimmedWorkType)) {
            conditions.push({ workType: trimmedWorkType });
        } else {
            // If it's not an ObjectId, try to find the WorkType by name/code and get its ID
            try {
                const workTypeDoc = await WorkType.findOne({
                    $or: [
                        { name: { $regex: trimmedWorkType, $options: 'i' } },
                        { code: { $regex: trimmedWorkType, $options: 'i' } }
                    ]
                });
                if (workTypeDoc) {
                    conditions.push({ workType: workTypeDoc._id });
                } else {
                    console.log(`WorkType not found for: ${trimmedWorkType}`);
                    // Don't add the condition if work type doesn't exist
                }
            } catch (error) {
                console.error('Error looking up work type:', error);
                // Don't add the condition if there's an error
            }
        }
    }

    // 5. Work sub type filter (optional) - handle both ObjectId and string values
    if (workSubType && workSubType.trim()) {
        const trimmedWorkSubType = workSubType.trim();
        // Check if it's a valid ObjectId format
        if (/^[0-9a-fA-F]{24}$/.test(trimmedWorkSubType)) {
            conditions.push({ workSubType: trimmedWorkSubType });
        } else {
            // If it's not an ObjectId, try to find the WorkSubType by name/code and get its ID
            try {
                const workSubTypeDoc = await WorkSubType.findOne({
                    $or: [
                        { name: { $regex: trimmedWorkSubType, $options: 'i' } },
                        { code: { $regex: trimmedWorkSubType, $options: 'i' } }
                    ]
                });
                if (workSubTypeDoc) {
                    conditions.push({ workSubType: workSubTypeDoc._id });
                } else {
                    console.log(`WorkSubType not found for: ${trimmedWorkSubType}`);
                    // Don't add the condition if work sub type doesn't exist
                }
            } catch (error) {
                console.error('Error looking up work sub type:', error);
                // Don't add the condition if there's an error
            }
        }
    }

    // 6. Status filter (optional)
    if (status && status.trim()) {
        conditions.push({ status: status.trim() });
    }

    // Build the final query - all conditions must be met
    const query = conditions.length > 1 ? { $and: conditions } : conditions[0];

    console.log('Final query object:', JSON.stringify(query, null, 2));

    try {
        // Find work orders with filters
        const workOrders = await WorkOrder.find(query)
            .populate('building', 'name address')
            .populate('workType', 'name')
            .populate('workSubType', 'name')
            .populate('assignedTo.worker', 'name email')
            .sort('-scheduledDate');

        console.log('Found filtered work orders:', workOrders.length);

        res.status(200).json({
            status: 'success',
            results: workOrders.length,
            data: workOrders,
            filters: {
                buildingId,
                startDate,
                endDate,
                workType,
                workSubType,
                status
            }
        });
    } catch (error) {
        console.error('Error in getFilteredWorkOrders:', error);
        return next(new AppError('Error fetching filtered work orders', 500));
    }
});

// Delete invoice
exports.deleteInvoice = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
        return next(new AppError('No invoice found with that ID', 404));
    }

    // Reset work orders billing status if invoice is deleted
    const workOrderIds = invoice.workOrders.map(wo => wo.workOrder);
    await WorkOrder.updateMany(
        { _id: { $in: workOrderIds } },
        { billingStatus: 'pending' }
    );

    await Invoice.findByIdAndDelete(req.params.id);

    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Get summary report
exports.getSummaryReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
        dateFilter.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const invoices = await Invoice.find(dateFilter)
        .populate('building', 'name')
        .sort('-createdAt');

    const summary = {
        totalInvoices: invoices.length,
        totalRevenue: invoices.reduce((sum, inv) => sum + inv.total, 0),
        paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
        paidAmount: invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + inv.total, 0),
        pendingInvoices: invoices.filter(inv => inv.status === 'pending').length,
        pendingAmount: invoices
            .filter(inv => inv.status === 'pending')
            .reduce((sum, inv) => sum + inv.total, 0),
        overdueInvoices: invoices.filter(inv =>
            inv.status === 'pending' &&
            inv.dueDate < new Date()
        ).length,
        overdueAmount: invoices
            .filter(inv => inv.status === 'pending' && inv.dueDate < new Date())
            .reduce((sum, inv) => sum + inv.total, 0)
    };

    res.status(200).json({
        status: 'success',
        data: {
            summary,
            period: { startDate, endDate }
        }
    });
});

// Create invoice from project estimate
exports.createFromEstimate = catchAsync(async (req, res, next) => {
    const estimate = await ProjectEstimate.findById(req.params.estimateId);
    
    if (!estimate) {
        return next(new AppError('Project estimate not found', 404));
    }
    
    if (estimate.status !== 'client_accepted') {
        return next(new AppError('Only accepted estimates can be converted to invoices', 400));
    }
    
    const invoice = await Invoice.createFromEstimate(estimate, {
        createdBy: req.user._id,
        ...req.body
    });
    
    // Update estimate status
    estimate.status = 'converted_to_invoice';
    estimate.invoiceId = invoice._id;
    await estimate.save();
    
    const populatedInvoice = await Invoice.findById(invoice._id)
        .populate('building', 'name address')
        .populate('projectEstimate', 'title description');
    
    res.status(201).json({
        status: 'success',
        data: {
            invoice: populatedInvoice
        }
    });
});

// Send invoice to client
exports.sendInvoice = catchAsync(async (req, res, next) => {
    const { emailAddresses } = req.body;
    
    if (!emailAddresses || emailAddresses.length === 0) {
        return next(new AppError('Email addresses are required', 400));
    }
    
    const invoice = await Invoice.findById(req.params.id)
        .populate('building', 'name address')
        .populate('projectEstimate', 'title description');
    
    if (!invoice) {
        return next(new AppError('Invoice not found', 404));
    }
    
    // Mark as sent
    await invoice.markAsSent(emailAddresses, req.user._id);
    
    res.status(200).json({
        status: 'success',
        message: 'Invoice sent successfully',
        data: { invoice }
    });
});

// Accept invoice (client-side)
exports.acceptInvoice = catchAsync(async (req, res, next) => {
    const acceptanceData = {
        acceptedBy: req.body.acceptedBy,
        signature: req.body.signature,
        ipAddress: req.ip
    };
    
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        return next(new AppError('Invoice not found', 404));
    }
    
    await invoice.markAsAccepted(acceptanceData);
    
    res.status(200).json({
        status: 'success',
        message: 'Invoice accepted successfully',
        data: { invoice }
    });
});

// Calculate invoice totals
exports.calculateTotals = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        return next(new AppError('Invoice not found', 404));
    }
    
    const totals = invoice['calculateTotals']();
    
    res.status(200).json({
        status: 'success',
        data: { totals }
    });
});

// Helper function to generate HTML for PDF
const generateInvoiceHTML = (invoice) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .company-info { margin-bottom: 30px; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .invoice-details div { flex: 1; }
        .client-info { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .totals { text-align: right; margin-top: 20px; }
        .total-row { font-weight: bold; font-size: 1.1em; }
        .footer { margin-top: 50px; text-align: center; color: #666; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>DSJ Construction Services</h1>
        <p>Professional Construction Management</p>
        <p>Phone: (555) 123-4567 | Email: info@dsjconstruction.com</p>
      </div>

      <div class="company-info">
        <h2>Invoice #${invoice.invoiceNumber}</h2>
        <p><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
        <p><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
      </div>

      <div class="invoice-details">
        <div>
          <h3>Bill To:</h3>
          <p><strong>${invoice.client?.companyName || 'Client'}</strong></p>
          ${invoice.client?.contactName ? `<p>${invoice.client.contactName}</p>` : ''}
          ${invoice.client?.email ? `<p>${invoice.client.email}</p>` : ''}
          ${invoice.client?.phone ? `<p>${invoice.client.phone}</p>` : ''}
          ${invoice.client?.address ? `<p>${invoice.client.address}</p>` : ''}
        </div>

        <div>
          <h3>Project Details:</h3>
          <p><strong>Building:</strong> ${invoice.building?.name || 'N/A'}</p>
          ${invoice.projectEstimate?.title ? `<p><strong>Project:</strong> ${invoice.projectEstimate.title}</p>` : ''}
          ${invoice.building?.address ? `<p><strong>Address:</strong> ${invoice.building.address}</p>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.lineItems?.map(item => `
            <tr>
              <td>${item.description || item.serviceSubcategory}</td>
              <td>${item.quantity || 1}</td>
              <td>$${item.unitPrice?.toFixed(2) || '0.00'}</td>
              <td>$${item.totalPrice?.toFixed(2) || '0.00'}</td>
            </tr>
          `).join('') || '<tr><td colspan="4">No items</td></tr>'}
        </tbody>
      </table>

      <div class="totals">
        <p><strong>Subtotal: $${invoice.subtotal?.toFixed(2) || '0.00'}</strong></p>
        ${invoice.taxAmount ? `<p>Tax: $${invoice.taxAmount.toFixed(2)}</p>` : ''}
        <p class="total-row">Total: $${invoice.total?.toFixed(2) || '0.00'}</p>
      </div>

      ${invoice.notes ? `
        <div class="notes" style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
          <h3>Notes:</h3>
          <p>${invoice.notes}</p>
        </div>
      ` : ''}

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Payment is due within 30 days of the invoice date.</p>
        <p>For questions, please contact us at info@dsjconstruction.com</p>
      </div>
    </body>
    </html>
  `;
};

// Generate PDF for invoice
exports.generatePDF = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('building', 'name address')
    .populate('projectEstimate', 'title description');

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  try {
    const puppeteer = require('puppeteer');

    // Generate HTML content for PDF
    const htmlContent = generateInvoiceHTML(invoice);

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    });

    await browser.close();

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    return next(new AppError('Failed to generate PDF', 500));
  }
});

// Email invoice
exports.emailInvoice = catchAsync(async (req, res, next) => {
  const { emailAddresses, message } = req.body;

  if (!emailAddresses || emailAddresses.length === 0) {
    return next(new AppError('Email addresses are required', 400));
  }

  const invoice = await Invoice.findById(req.params.id)
    .populate('building', 'name address')
    .populate('projectEstimate', 'title description');

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  try {
    // Send email using email service
    const emailService = require('../services/emailService');
    await emailService.sendInvoiceEmail(invoice, emailAddresses, message);

    // Mark as sent in database
    await invoice.markAsSent(emailAddresses, req.user._id);

    res.status(200).json({
      status: 'success',
      message: 'Invoice emailed successfully',
      data: { invoice }
    });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return next(new AppError('Failed to send invoice email', 500));
  }
});
