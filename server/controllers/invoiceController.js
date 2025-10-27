const { Invoice } = require('../models/Invoice');
const WorkOrder = require('../models/WorkOrder');
const WorkType = require('../models/WorkType');
const WorkSubType = require('../models/WorkSubType');
const ProjectEstimate = require('../models/ProjectEstimate');
const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Get all invoices
exports.getAllInvoices = catchAsync(async (req, res, next) => {
  const {
    startDate,
    endDate,
    status,
    buildingId,
    invoiceDateStart,
    invoiceDateEnd,
    dueDateStart,
    dueDateEnd,
    search
  } = req.query;

  // Build filter object
  const filter = {};

  // Search filter - search in invoice number
  if (search) {
    filter.invoiceNumber = { $regex: search, $options: 'i' };
  }

  // Status filter
  if (status) {
    filter.status = status;
  }

  // Building filter
  if (buildingId) {
    filter.building = buildingId;
  }

  // Date filters - support both invoiceDate and general date ranges
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Invoice date filter (when invoice was issued/sent to client)
  if (invoiceDateStart || invoiceDateEnd) {
    filter.invoiceDate = {};
    if (invoiceDateStart) filter.invoiceDate.$gte = new Date(invoiceDateStart);
    if (invoiceDateEnd) filter.invoiceDate.$lte = new Date(invoiceDateEnd);
  }

  // Due date filter
  if (dueDateStart || dueDateEnd) {
    filter.dueDate = {};
    if (dueDateStart) filter.dueDate.$gte = new Date(dueDateStart);
    if (dueDateEnd) filter.dueDate.$lte = new Date(dueDateEnd);
  }

  console.log('Invoice filter applied:', filter);

  const invoices = await Invoice.find(filter)
    .populate('building', 'name address serviceManagerEmail generalManagerEmail maintenanceManagerEmail')
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
        .populate('building', 'name address serviceManagerEmail generalManagerEmail maintenanceManagerEmail')
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
        ],
        $or: [
            { invoice: { $exists: false } },
            { invoice: null }
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
            unitPrice: Number(totalPrice.toFixed(2)),
            totalPrice: Number(totalPrice.toFixed(2)),
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
        lineItems: invoiceWorkOrders.map(item => ({
            workOrder: item.workOrder,
            serviceCategory: 'other',
            serviceSubcategory: 'work_order',
            description: item.description,
            quantity: item.quantity,
            unitType: 'fixed',
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            taxable: true,
            taxRate: 0
        })),
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
            { billingStatus: 'invoiced', invoice: invoice._id }
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
    const workOrderIds = invoice.workOrders.map(wo => wo.workOrder).filter(Boolean);
    await WorkOrder.updateMany(
        { _id: { $in: workOrderIds } },
        { billingStatus: 'paid', invoice: invoice._id }
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
        $and: [
            {
                $or: [
                    { billingStatus: { $exists: false } },
                    { billingStatus: 'pending' },
                    { billingStatus: null }
                ]
            },
            {
                $or: [
                    { invoice: { $exists: false } },
                    { invoice: null }
                ]
            }
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
        $and: [
            {
                $or: [
                    { billingStatus: { $exists: false } },
                    { billingStatus: 'pending' },
                    { billingStatus: null }
                ]
            },
            {
                $or: [
                    { invoice: { $exists: false } },
                    { invoice: null }
                ]
            }
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
    const workOrderIds = invoice.workOrders.map(wo => wo.workOrder).filter(Boolean);
    await WorkOrder.updateMany(
        { _id: { $in: workOrderIds } },
        { billingStatus: 'pending', invoice: null }
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
  const hasWorkOrders = Array.isArray(invoice.workOrders) && invoice.workOrders.length > 0;
  const lineItems = hasWorkOrders ? invoice.workOrders : invoice.lineItems || [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #333;
          background-color: #fff;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #2c3e50;
          padding-bottom: 30px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          background: white;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .logo-placeholder {
          width: 80px;
          height: 80px;
          margin-right: 15px;
          background: linear-gradient(135deg, #3498db, #2c3e50);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          position: relative;
        }
        .building-icon {
          font-size: 24px;
          margin-bottom: 2px;
        }
        .dsj-text {
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 1px;
        }
        .company-text {
          text-align: left;
        }
        .company-name {
          font-size: 36px;
          font-weight: bold;
          color: #2c3e50;
          margin: 0;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
          background: linear-gradient(135deg, #3498db, #2c3e50);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .company-tagline {
          font-size: 16px;
          color: #7f8c8d;
          margin: 5px 0 15px 0;
          font-style: italic;
        }
        .company-contact {
          font-size: 14px;
          color: #95a5a6;
          margin: 0;
          font-weight: 500;
        }
        .invoice-title {
          font-size: 28px;
          color: #2c3e50;
          margin: 20px 0 10px 0;
        }
        .invoice-info {
          display: flex;
          justify-content: space-between;
          margin: 30px 0;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        .invoice-details, .client-details {
          flex: 1;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 10px;
          border-bottom: 2px solid #3498db;
          padding-bottom: 3px;
        }
        .info-row {
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: bold;
          color: #555;
          display: inline-block;
          width: 120px;
        }
        .info-value {
          display: inline-block;
        }
        .work-orders-section {
          margin: 30px 0;
        }
        .table-container {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .table-header {
          background-color: #2c3e50;
          color: white;
          font-weight: bold;
        }
        .table-header th {
          padding: 15px;
          text-align: left;
          border-right: 1px solid #34495e;
        }
        .table-header th:last-child {
          border-right: none;
        }
        .table-body td {
          padding: 15px;
          border-bottom: 1px solid #ecf0f1;
          border-right: 1px solid #ecf0f1;
        }
        .table-body td:last-child {
          border-right: none;
        }
        .table-body tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        .totals-section {
          background-color: #f8f9fa;
          padding: 25px;
          border-radius: 8px;
          margin-top: 30px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .totals-row:last-child {
          margin-bottom: 0;
          border-top: 2px solid #2c3e50;
          padding-top: 15px;
          font-size: 18px;
          font-weight: bold;
          color: #2c3e50;
        }
        .payment-terms {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .notes-section {
          background-color: #d1ecf1;
          border: 1px solid #bee5eb;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #bdc3c7;
          color: #7f8c8d;
          font-size: 12px;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-paid { background-color: #d4edda; color: #155724; }
        .status-pending { background-color: #fff3cd; color: #856404; }
        .status-overdue { background-color: #f8d7da; color: #721c24; }
        .status-open { background-color: #e2e3e5; color: #383d41; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="logo-container">
            <div class="logo-placeholder">
              <div class="building-icon">🏢</div>
              <div class="dsj-text">DSJ</div>
            </div>
            <div class="company-text">
              <div class="company-name">DSJ Construction & Services LLC</div>
              <div class="company-tagline">Professional Construction & Renovation Services</div>
            </div>
          </div>
          <div class="company-contact">
            Phone: (555) 123-4567 | Email: info@dsjconstruction.com
          </div>
        </div>

        <div class="invoice-title">INVOICE</div>

        <div class="invoice-info">
          <div class="invoice-details">
            <div class="section-title">Invoice Details</div>
            <div class="info-row">
              <span class="info-label">Invoice Number:</span>
              <span class="info-value">${invoice.invoiceNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Invoice Date:</span>
              <span class="info-value">${formatDate(invoice.invoiceDate)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Due Date:</span>
              <span class="info-value">${formatDate(invoice.dueDate)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="info-value">
                <span class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</span>
              </span>
            </div>
          </div>

          <div class="client-details">
            <div class="section-title">Bill To</div>
            <div class="info-row">
              <span class="info-label">Building:</span>
              <span class="info-value">${invoice.building?.name || 'N/A'}</span>
            </div>
            ${invoice.building?.address ? `
              <div class="info-row">
                <span class="info-label">Address:</span>
                <span class="info-value">${invoice.building.address}</span>
              </div>
            ` : ''}
            ${invoice.building?.city ? `
              <div class="info-row">
                <span class="info-label">City:</span>
                <span class="info-value">${invoice.building.city}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="work-orders-section">
          <div class="section-title">Services Performed</div>
          <table class="table-container">
            <thead class="table-header">
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody class="table-body">
              ${lineItems.length > 0 ? lineItems.map(wo => `
                <tr>
                  <td>${wo.description || wo.serviceSubcategory || 'Work Order Service'}</td>
                  <td>${wo.quantity || 1}</td>
                  <td>${formatCurrency(wo.unitPrice)}</td>
                  <td>${formatCurrency(wo.totalPrice)}</td>
                </tr>
              `).join('') : '<tr><td colspan="4">No services listed</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="totals-section">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(invoice.subtotal)}</span>
          </div>
          ${invoice.tax ? `
            <div class="totals-row">
              <span>Tax:</span>
              <span>${formatCurrency(invoice.tax)}</span>
            </div>
          ` : ''}
          <div class="totals-row">
            <span>TOTAL AMOUNT DUE:</span>
            <span>${formatCurrency(invoice.total)}</span>
          </div>
        </div>

        <div class="payment-terms">
          <strong>Payment Terms:</strong> Payment is due within 30 days of the invoice date. Thank you for your business!
        </div>

        ${invoice.notes ? `
          <div class="notes-section">
            <strong>Notes:</strong><br>
            ${invoice.notes}
          </div>
        ` : ''}

        <div class="footer">
          <p>This invoice was generated electronically and is valid without signature.</p>
          <p>For questions about this invoice, please contact DSJ Construction Services.</p>
          <p>Generated on ${formatDate(new Date())}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate PDF for invoice
exports.generatePDF = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('building', 'name address serviceManagerEmail generalManagerEmail maintenanceManagerEmail')
    .populate('projectEstimate', 'title description');

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  const invoiceObject = invoice.toObject({ virtuals: true });
  const hasWorkOrders = Array.isArray(invoiceObject.workOrders) && invoiceObject.workOrders.length > 0;
  const lineItems = hasWorkOrders
    ? (invoiceObject.workOrders || [])
    : (invoiceObject.lineItems || []);

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return next(new AppError('Invoice has no billable items. Please add line items before downloading the PDF.', 400));
  }

  // Ensure lineItems is available for the PDF template even when workOrders are stored
  invoiceObject.lineItems = lineItems;

  try {
    console.log(`Generating PDF for invoice ${invoice.invoiceNumber} (${invoice._id})`);
    console.log(`Invoice has ${lineItems.length} line items`);
    
    const pdf = require('html-pdf');
    
    // Generate HTML content for PDF
    const htmlContent = generateInvoiceHTML(invoiceObject);
    console.log('HTML content generated successfully');

    // PDF generation options with enhanced image loading
    const options = {
      format: 'A4',
      orientation: 'portrait',
      border: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      type: 'pdf',
      timeout: 30000, // Reduced timeout for faster generation
      renderDelay: 1000, // Reduced delay for faster generation
      phantomArgs: [
        '--load-images=yes', 
        '--local-to-remote-url-access=yes', 
        '--web-security=no',
        '--ignore-ssl-errors=yes',
        '--ssl-protocol=any'
      ],
      childProcessOptions: {
        env: {
          OPENSSL_CONF: '/dev/null',
        },
      }
    };

    // Generate PDF using html-pdf
    const pdfBuffer = await new Promise((resolve, reject) => {
      pdf.create(htmlContent, options).toBuffer((err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer);
        }
      });
    });

    console.log(`PDF generated successfully. Size: ${pdfBuffer.length} bytes`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    console.error('Error stack:', error.stack);
    console.error('Invoice ID:', invoice._id);
    console.error('Invoice Number:', invoice.invoiceNumber);
    
    // Provide more specific error messages and fallbacks
    if (error.message.includes('Navigation timeout')) {
      return next(new AppError('PDF generation timed out. Please try again.', 500));
    } else if (error.message.includes('Protocol error')) {
      return next(new AppError('Browser error during PDF generation. Please try again.', 500));
    } else if (error.message.includes('html-pdf') || error.message.includes('wkhtmltopdf') || error.message.includes('Cannot find module')) {
      console.log('PDF generation not available, returning HTML content...');
      const htmlContent = generateInvoiceHTML(invoiceObject);
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.html"`);
      return res.send(htmlContent);
    } else {
      return next(new AppError(`Failed to generate PDF: ${error.message}`, 500));
    }
  }
});

// Email invoice
exports.emailInvoice = catchAsync(async (req, res, next) => {
  const { emailAddresses, message } = req.body;

  if (!emailAddresses || emailAddresses.length === 0) {
    return next(new AppError('Email addresses are required', 400));
  }

  const invoice = await Invoice.findById(req.params.id)
    .populate('building', 'name address serviceManagerEmail generalManagerEmail maintenanceManagerEmail')
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

// Add line item to invoice
exports.addLineItem = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }
  
  invoice.lineItems.push(req.body);
  invoice['calculateTotals']();
  await invoice.save();
  
  const updatedInvoice = await Invoice.findById(req.params.id)
    .populate('building', 'name address');
  
  res.status(200).json({
    status: 'success',
    data: { invoice: updatedInvoice }
  });
});

// Update line item
exports.updateLineItem = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        return next(new AppError('Invoice not found', 404));
    }
    
    const lineItem = invoice.lineItems.id(req.params.lineItemId);
    if (!lineItem) {
        return next(new AppError('Line item not found', 404));
    }
    
    Object.keys(req.body).forEach(key => {
        lineItem[key] = req.body[key];
    });
    
    invoice['calculateTotals']();
    await invoice.save();
    
    const updatedInvoice = await Invoice.findById(req.params.id)
        .populate('building', 'name address');
    
    res.status(200).json({
        status: 'success',
        data: { invoice: updatedInvoice }
    });
});

// Remove line item
exports.removeLineItem = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        return next(new AppError('Invoice not found', 404));
    }
    
    const lineItem = invoice.lineItems.id(req.params.lineItemId);
    if (!lineItem) {
        return next(new AppError('Line item not found', 404));
    }
    
    lineItem.deleteOne();
    invoice['calculateTotals']();
    await invoice.save();
    
    const updatedInvoice = await Invoice.findById(req.params.id)
        .populate('building', 'name address');
    
    res.status(200).json({
        status: 'success',
        data: { invoice: updatedInvoice }
    });
});

// Get next invoice number
exports.getNextInvoiceNumber = catchAsync(async (req, res, next) => {
    try {
        const currentYear = new Date().getFullYear();
        
        // Find or create counter for current year
        let counter = await InvoiceCounter.findOne({ year: currentYear });
        if (!counter) {
            // Check if there are any existing invoices to determine starting number
            const lastInvoice = await Invoice.findOne(
                {},
                { invoiceNumber: 1 },
                { sort: { createdAt: -1 } }
            ).lean();
            
            let startingCount = 0;
            if (lastInvoice && lastInvoice.invoiceNumber) {
                const matches = lastInvoice.invoiceNumber.match(/(\d+)$/);
                if (matches && matches[1]) {
                    startingCount = parseInt(matches[1], 10);
                }
            }
            
            counter = new InvoiceCounter({ 
                year: currentYear, 
                count: startingCount 
            });
        }
        
        // Increment counter for next number
        counter.count += 1;
        const nextNumber = String(counter.count).padStart(6, '0');
        
        res.status(200).json({
            status: 'success',
            data: {
                nextNumber,
                counter
            }
        });
    } catch (error) {
        console.error('Error getting next invoice number:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error getting next invoice number'
        });
    }
});

// Get client summary report
exports.getClientSummaryReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate, buildingId } = req.query;
    
    let matchConditions = {};
    if (startDate && endDate) {
        matchConditions.invoiceDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    if (buildingId) {
        matchConditions.building = mongoose.Types.ObjectId(buildingId);
    }
    
    const clientSummary = await Invoice.aggregate([
        { $match: matchConditions },
        {
            $group: {
                _id: '$client.companyName',
                totalInvoices: { $sum: 1 },
                totalAmount: { $sum: '$total' },
                paidAmount: {
                    $sum: {
                        $cond: [
                            { $eq: ['$status', 'paid'] },
                            '$total',
                            0
                        ]
                    }
                },
                pendingAmount: {
                    $sum: {
                        $cond: [
                            { $eq: ['$status', 'pending'] },
                            '$total',
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                clientName: '$_id',
                totalInvoices: 1,
                totalAmount: 1,
                paidAmount: 1,
                pendingAmount: 1,
                _id: 0
            }
        },
        { $sort: { totalAmount: -1 } }
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            clientSummary,
            totalClients: clientSummary.length
        }
    });
});

// Get aging report
exports.getAgingReport = catchAsync(async (req, res, next) => {
    const invoices = await Invoice.find({ status: 'pending' })
        .populate('building', 'name')
        .sort('dueDate');

    const agingReport = {
        current: [],
        pastDue: [],
        dueIn30Days: [],
        dueIn60Days: []
    };

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    invoices.forEach(invoice => {
        if (invoice.dueDate < now) {
            agingReport.pastDue.push(invoice);
        } else if (invoice.dueDate <= thirtyDaysFromNow) {
            agingReport.dueIn30Days.push(invoice);
        } else if (invoice.dueDate <= sixtyDaysFromNow) {
            agingReport.dueIn60Days.push(invoice);
        } else {
            agingReport.current.push(invoice);
        }
    });

    res.status(200).json({
        status: 'success',
        data: {
            agingReport,
            totals: {
                current: agingReport.current.reduce((sum, inv) => sum + inv.total, 0),
                pastDue: agingReport.pastDue.reduce((sum, inv) => sum + inv.total, 0),
                dueIn30Days: agingReport.dueIn30Days.reduce((sum, inv) => sum + inv.total, 0),
                dueIn60Days: agingReport.dueIn60Days.reduce((sum, inv) => sum + inv.total, 0)
            }
        }
    });
});
