const { Invoice } = require('../models/Invoice');
const WorkOrder = require('../models/WorkOrder');
const WorkType = require('../models/WorkType');
const WorkSubType = require('../models/WorkSubType');
const ProjectEstimate = require('../models/ProjectEstimate');
const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Debug: Check and fix invoice number issue
exports.debugInvoiceNumber = catchAsync(async (req, res, next) => {
    const { invoiceNumber } = req.params;
    
    console.log('=== DEBUG: Checking invoice number ===');
    console.log('Looking for invoice number:', invoiceNumber);
    
    // Check with deleted filter
    const withDeletedFilter = await Invoice.findOne({ 
        invoiceNumber: invoiceNumber.toUpperCase()
    });
    
    console.log('With pre-find hook (should exclude deleted):', withDeletedFilter ? {
        id: withDeletedFilter._id,
        number: withDeletedFilter.invoiceNumber,
        deleted: withDeletedFilter.deleted,
        status: withDeletedFilter.status
    } : 'NOT FOUND');
    
    // Check without any filter (raw query)
    const allInvoices = await Invoice.collection.find({ 
        invoiceNumber: invoiceNumber.toUpperCase()
    }).toArray();
    
    console.log('All invoices with this number (raw query):', allInvoices.length);
    allInvoices.forEach((inv, idx) => {
        console.log(`  ${idx + 1}. ID: ${inv._id}, deleted: ${inv.deleted}, status: ${inv.status}`);
    });
    
    res.status(200).json({
        invoiceNumber,
        withPreFindHook: withDeletedFilter,
        allInvoices,
        message: 'Debug info retrieved'
    });
});

// Admin: Force delete all draft invoices with a specific number
exports.forceDeleteDraftInvoice = catchAsync(async (req, res, next) => {
    const { invoiceNumber } = req.params;
    
    console.log('=== FORCE DELETE: Marking draft invoices as deleted ===');
    console.log('Invoice number:', invoiceNumber);
    
    // Find all draft invoices with this number
    const draftInvoices = await Invoice.collection.find({
        invoiceNumber: invoiceNumber.toUpperCase(),
        status: 'draft',
        deleted: { $ne: true }
    }).toArray();
    
    console.log('Found draft invoices:', draftInvoices.length);
    
    if (draftInvoices.length === 0) {
        return res.status(200).json({
            message: 'No draft invoices found to delete',
            deleted: 0
        });
    }
    
    // Mark them as deleted
    const result = await Invoice.collection.updateMany(
        {
            invoiceNumber: invoiceNumber.toUpperCase(),
            status: 'draft',
            deleted: { $ne: true }
        },
        {
            $set: {
                deleted: true,
                deletedAt: new Date(),
                status: 'cancelled'
            }
        }
    );
    
    console.log('Deleted invoices:', result.modifiedCount);
    
    res.status(200).json({
        message: `Successfully marked ${result.modifiedCount} draft invoice(s) as deleted`,
        deleted: result.modifiedCount
    });
});

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

  // Search filter - search in invoice number OR service manager name
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    
    // Check if search looks like an invoice number (contains digits)
    const isInvoiceNumberSearch = /\d/.test(search);
    
    if (isInvoiceNumberSearch) {
      // If searching by invoice number, ONLY search by invoice number, ignore other filters
      filter.invoiceNumber = searchRegex;
    } else {
      // If not an invoice number, search by service manager name
      const matchingBuildings = await require('../models/Building').find({
        $or: [
          { serviceManagerName: searchRegex },
          { maintenanceManagerName: searchRegex },
          { generalManagerName: searchRegex },
          { thirdContactName: searchRegex }
        ]
      }).select('_id');
      
      const buildingIds = matchingBuildings.map(b => b._id);
      
      // Search by service manager (through building)
      if (buildingIds.length > 0) {
        filter.building = { $in: buildingIds };
      }
    }
  } else {
    // Only apply other filters if NOT searching by invoice number
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
  }

  console.log('Invoice filter applied:', filter);

  const invoices = await Invoice.find(filter)
    .populate('building', 'name address serviceManagerName serviceManagerEmail serviceManagerPhone generalManagerName generalManagerEmail generalManagerPhone maintenanceManagerName maintenanceManagerEmail maintenanceManagerPhone thirdContactName thirdContactEmail thirdContactPhone')
    .populate('workOrders.workOrder', 'title description apartmentNumber status price')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort('-createdAt');

  // Recalculate totals for all invoices to ensure consistency
  for (const invoice of invoices) {
    if (invoice && typeof invoice.calculateTotals === 'function') {
      const oldTotal = invoice.total;
      invoice.calculateTotals();
      // If total changed, save it back to database
      if (invoice.total !== oldTotal) {
        console.log(`Invoice ${invoice.invoiceNumber}: Correcting total from ${oldTotal} to ${invoice.total}`);
        await invoice.save();
      }
    }
  }

  // Auto-mark overdue invoices
  const now = new Date();
  for (const invoice of invoices) {
    if (invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.dueDate) {
      const dueDate = new Date(invoice.dueDate);
      if (now > dueDate && invoice.status !== 'overdue') {
        invoice.status = 'overdue';
        if (!invoice.statusHistory) invoice.statusHistory = [];
        invoice.statusHistory.push({
          status: 'overdue',
          timestamp: new Date(),
          notes: 'Automatically marked as overdue - due date passed'
        });
        await invoice.save();
      }
    }
  }

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
        .populate('workOrders.workOrder', 'title description apartmentNumber status price cost scheduledDate');

    if (!invoice) {
        return next(new AppError('No invoice found with that ID', 404));
    }

    // Recalculate totals to ensure consistency
    if (invoice && typeof invoice.calculateTotals === 'function') {
        const oldTotal = invoice.total;
        invoice.calculateTotals();
        // If total changed, save it back to database
        if (invoice.total !== oldTotal) {
            console.log(`Invoice ${invoice.invoiceNumber}: Correcting total from ${oldTotal} to ${invoice.total}`);
            await invoice.save();
        }
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
    }).populate('building', 'name address');

    console.log('Found work orders for invoice:', workOrders.length);
    console.log('Work orders:', workOrders);
    
    if (workOrders.length < workOrderIds.length) {
        console.log('Warning: Not all work orders found. Requested:', workOrderIds.length, 'Found:', workOrders.length);
        const foundIds = workOrders.map(wo => wo._id.toString());
        const missingIds = workOrderIds.filter(id => !foundIds.includes(id.toString()));
        console.log('Missing work order IDs:', missingIds);
    }

    if (workOrders.length === 0) {
        return next(new AppError('No eligible work orders found for invoicing. Work orders may already be invoiced.', 400));
    }

    // Calculate totals using consistent logic with frontend
    let subtotal = 0;
    const invoiceWorkOrders = workOrders.map((wo, index) => {
        let totalPrice = 0;

        console.log(`Processing work order ${index + 1}:`, {
            id: wo._id,
            title: wo.title,
            services: wo.services?.length || 0,
            price: wo.price,
            actualCost: wo.actualCost,
            estimatedCost: wo.estimatedCost
        });

        // Priority 1: Calculate from services if available
        if (wo.services && wo.services.length > 0) {
            totalPrice = wo.services.reduce((sum, service) => {
                return sum + (service.laborCost || 0) + (service.materialCost || 0);
            }, 0);
            console.log(`  → Using services total: ${totalPrice}`);
        }
        // Priority 2: Use price field (what customer pays)
        else if (wo.price && wo.price > 0) {
            totalPrice = wo.price;
            console.log(`  → Using price field: ${totalPrice}`);
        }
        // Priority 3: Fall back to actual cost
        else if (wo.actualCost && wo.actualCost > 0) {
            totalPrice = wo.actualCost;
            console.log(`  → Using actualCost: ${totalPrice}`);
        }
        // Priority 4: Use estimated cost
        else {
            totalPrice = wo.estimatedCost || 0;
            console.log(`  → Using estimatedCost: ${totalPrice}`);
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
    
    console.log('Calculated subtotal:', subtotal);
    console.log('Invoice work orders:', invoiceWorkOrders);

    // Use the total amount calculated from the frontend
    const tax = 0; // Tax is always 0 for now
    const total = totalAmount || subtotal;

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
        createdBy: req.user.id
    };

    // Add manual invoice number if provided
    if (invoiceNumber && invoiceNumber.trim()) {
        // Check if invoice number already exists (excluding soft-deleted invoices)
        const normalizedNumber = invoiceNumber.trim().toUpperCase();
        console.log('Checking for existing invoice with number:', normalizedNumber);

        // Only consider invoices that are not soft-deleted
        const existingInvoice = await Invoice.findOne({
            invoiceNumber: normalizedNumber,
            deleted: { $ne: true }
        });

        console.log('Existing invoice check result:', existingInvoice ? 'FOUND' : 'NOT FOUND');
        if (existingInvoice) {
            console.log('Invoice number conflict - found active invoice:', {
                id: existingInvoice._id,
                number: existingInvoice.invoiceNumber,
                deleted: existingInvoice.deleted,
                status: existingInvoice.status
            });
            return next(
                new AppError(
                    `An invoice with this invoiceNumber already exists (status: ${existingInvoice.status || 'unknown'}). ` +
                    `Please delete or change the existing invoice before reusing this number.`,
                    400
                )
            );
        }
        invoiceData.invoiceNumber = normalizedNumber;
    }
    // If no invoice number provided, the pre-save hook will generate one

    console.log('=== CREATING INVOICE ===');
    console.log('Invoice data to be saved:', JSON.stringify(invoiceData, null, 2));

    try {
        const invoice = await Invoice.create(invoiceData);
        console.log('Invoice created successfully:', invoice._id);
        console.log('Generated invoice number:', invoice.invoiceNumber);

        // Update work orders billing status
        const updateResult = await WorkOrder.updateMany(
            { _id: { $in: workOrderIds } },
            { billingStatus: 'invoiced', invoice: invoice._id }
        );
        console.log('Work orders updated:', updateResult);

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
        console.error('Error code:', error.code);
        console.error('Error name:', error.name);

        if (error.name === 'ValidationError') {
            console.error('Validation errors:', error.errors);
            const validationMessages = Object.entries(error.errors)
                .map(([field, err]) => `${field}: ${err.message}`)
                .join('; ');
            return next(new AppError(`Validation failed: ${validationMessages}`, 400));
        }

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return next(new AppError(`An invoice with this ${field} already exists`, 400));
        }

        if (error.message) {
            return next(new AppError(`Failed to create invoice: ${error.message}`, 400));
        }

        return next(new AppError('Failed to create invoice', 500));
    }
});

// Update invoice
exports.updateInvoice = catchAsync(async (req, res, next) => {
    // First, fetch the invoice to check its current status
    const existingInvoice = await Invoice.findById(req.params.id);
    
    if (!existingInvoice) {
        return next(new AppError('No invoice found with that ID', 404));
    }
    
    // Prevent editing of paid invoices
    if (existingInvoice.status === 'paid') {
        return next(new AppError('Cannot edit a paid invoice. Please contact an administrator if you need to make changes.', 400));
    }
    
    // Allow updating: status, invoiceDate, dueDate, notes
    const allowedFields = ['status', 'invoiceDate', 'dueDate', 'notes'];
    const updateData = {};
    
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            updateData[field] = req.body[field];
        }
    });
    
    updateData.updatedBy = req.user.id;
    
    console.log('Updating invoice with:', updateData);

    const invoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
            new: true,
            runValidators: true
        }
    ).populate('building', 'name address')
     .populate('workOrders.workOrder', 'title description apartmentNumber');

    res.status(200).json({
        status: 'success',
        message: '✅ Invoice updated successfully',
        data: {
            invoice
        }
    });
});

// Add work orders to existing invoice
exports.addWorkOrdersToInvoice = catchAsync(async (req, res, next) => {
    const { workOrderIds } = req.body;
    
    if (!workOrderIds || !Array.isArray(workOrderIds) || workOrderIds.length === 0) {
        return next(new AppError('Please provide work order IDs to add', 400));
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        return next(new AppError('Invoice not found', 404));
    }

    // Fetch work orders with full details using proper billing status check
    // Also ensure they belong to the same building as the invoice
    const workOrders = await WorkOrder.find({ 
        _id: { $in: workOrderIds },
        building: invoice.building,
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
    }).populate('workType workSubType');

    console.log('Found work orders to add:', workOrders.length);
    console.log('Invoice building:', invoice.building);
    console.log('Requested work order IDs:', workOrderIds);
    
    if (workOrders.length === 0) {
        return next(new AppError('No unbilled work orders found to add', 400));
    }

    // Add work orders to invoice
    let addedCount = 0;
    workOrders.forEach(wo => {
        // Check if work order is already in invoice
        const exists = invoice.workOrders.some(
            item => item.workOrder.toString() === wo._id.toString()
        );
        
        if (!exists) {
            // Calculate price using same priority as createInvoice
            let totalPrice = 0;
            if (wo.services && wo.services.length > 0) {
                totalPrice = wo.services.reduce((sum, service) => {
                    return sum + (service.laborCost || 0) + (service.materialCost || 0);
                }, 0);
            } else if (wo.price && wo.price > 0) {
                totalPrice = wo.price;
            } else if (wo.actualCost && wo.actualCost > 0) {
                totalPrice = wo.actualCost;
            } else {
                totalPrice = wo.estimatedCost || 0;
            }
            
            invoice.workOrders.push({
                workOrder: wo._id,
                description: `${wo.title || 'Work Order'} (Apt: ${wo.apartmentNumber || 'N/A'})`,
                quantity: 1,
                unitPrice: Number(totalPrice.toFixed(2)),
                totalPrice: Number(totalPrice.toFixed(2))
            });
            addedCount++;
        }
    });

    // Recalculate totals
    invoice.subtotal = invoice.workOrders.reduce((sum, wo) => sum + (wo.totalPrice || 0), 0);
    invoice.total = invoice.subtotal + (invoice.tax || 0) - (invoice.discount || 0);

    await invoice.save();

    // Update work orders billing status
    await WorkOrder.updateMany(
        { _id: { $in: workOrderIds } },
        { billingStatus: 'invoiced', invoice: invoice._id }
    );

    const updatedInvoice = await Invoice.findById(invoice._id)
        .populate('building', 'name address')
        .populate('workOrders.workOrder', 'title description apartmentNumber price');

    res.status(200).json({
        status: 'success',
        message: `${addedCount} work order(s) added to invoice`,
        data: { invoice: updatedInvoice }
    });
});

// Remove work orders from invoice
exports.removeWorkOrdersFromInvoice = catchAsync(async (req, res, next) => {
    const { workOrderIds } = req.body;
    
    if (!workOrderIds || !Array.isArray(workOrderIds) || workOrderIds.length === 0) {
        return next(new AppError('Please provide work order IDs to remove', 400));
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        return next(new AppError('Invoice not found', 404));
    }

    // Remove work orders from invoice
    invoice.workOrders = invoice.workOrders.filter(
        item => !workOrderIds.includes(item.workOrder.toString())
    );

    // Recalculate totals
    invoice.subtotal = invoice.workOrders.reduce((sum, wo) => sum + (wo.total || 0), 0);
    invoice.total = invoice.subtotal + (invoice.tax || 0) - (invoice.discount || 0);

    await invoice.save();

    // Reset work orders billing status
    await WorkOrder.updateMany(
        { _id: { $in: workOrderIds } },
        { billingStatus: 'pending', invoice: null }
    );

    const updatedInvoice = await Invoice.findById(invoice._id)
        .populate('building', 'name address')
        .populate('workOrders.workOrder', 'title description apartmentNumber price');

    res.status(200).json({
        status: 'success',
        message: `${workOrderIds.length} work order(s) removed from invoice`,
        data: { invoice: updatedInvoice }
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
      .populate('workType', 'name')
      .populate('workSubType', 'name')
      .sort('-createdAt');

    console.log('Found unbilled work orders:', workOrders.length);
    if (workOrders.length > 0) {
        console.log('First work order sample:', {
            id: workOrders[0]._id,
            title: workOrders[0].title,
            billingStatus: workOrders[0].billingStatus,
            invoice: workOrders[0].invoice,
            status: workOrders[0].status
        });
    }

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
    
    console.log('Deleting invoice:', req.params.id);
    console.log('Work order IDs to reset:', workOrderIds);
    
    if (workOrderIds.length > 0) {
        const updateResult = await WorkOrder.updateMany(
            { _id: { $in: workOrderIds } },
            { 
                $set: {
                    billingStatus: 'pending',
                    invoice: null
                }
            }
        );
        console.log('Work orders updated:', updateResult);
    }

    // Perform a soft delete instead of a hard delete
    invoice.deleted = true;
    invoice.deletedBy = req.user.id;
    invoice.deletedAt = new Date();
    invoice.status = 'cancelled'; // Also mark as cancelled
    await invoice.save();
    
    console.log('Invoice marked as deleted:', invoice._id);

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

// Helper function to generate CLEAN PROFESSIONAL HTML for PDF (matching image 3 style)
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
    if (!date) return 'N/A';
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
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-size: 11px;
          line-height: 1.4;
          color: #333;
          background-color: #fff;
          padding: 30px;
        }
        .invoice-container {
          max-width: 850px;
          margin: 0 auto;
        }
        
        /* HEADER: Company Info LEFT + Logo RIGHT */
        .header {
          display: table;
          width: 100%;
          margin-bottom: 30px;
        }
        .header-left {
          display: table-cell;
          width: 70%;
          vertical-align: top;
        }
        .header-right {
          display: table-cell;
          width: 30%;
          text-align: right;
          vertical-align: top;
        }
        .company-name {
          font-size: 11px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }
        .company-info {
          font-size: 9px;
          color: #666;
          line-height: 1.5;
        }
        .logo-img {
          width: 80px;
          height: 80px;
          object-fit: contain;
        }
        
        /* INVOICE TITLE */
        .invoice-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 20px;
        }
        
        /* BILL TO + PAYMENT BOXES */
        .info-section {
          display: table;
          width: 100%;
          margin-bottom: 20px;
        }
        .bill-to {
          display: table-cell;
          width: 50%;
          vertical-align: top;
        }
        .payment-boxes {
          display: table-cell;
          width: 50%;
          text-align: right;
          vertical-align: top;
        }
        .section-label {
          font-size: 10px;
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 5px;
        }
        .bill-to-content {
          font-size: 9px;
          color: #666;
          line-height: 1.5;
        }
        .bill-to-name {
          font-size: 10px;
          font-weight: 600;
          color: #333;
          margin-bottom: 3px;
        }
        
        /* PAYMENT INFO BOXES */
        .payment-box {
          display: inline-block;
          padding: 10px;
          border-radius: 4px;
          min-width: 90px;
          text-align: center;
          margin-left: 5px;
          vertical-align: top;
        }
        .box-light {
          background-color: #E3F2FD;
        }
        .box-blue {
          background-color: #1976d2;
          color: #ffffff;
        }
        .box-label {
          font-size: 8px;
          margin-bottom: 4px;
        }
        .box-value {
          font-size: 10px;
          font-weight: 600;
        }
        
        /* SERVICES TABLE */
        .services-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          border: 1px solid #e0e0e0;
        }
        .services-table thead {
          background-color: #2C3E50;
        }
        .services-table th {
          color: #ffffff;
          font-size: 10px;
          font-weight: 600;
          padding: 12px 10px;
          text-align: left;
        }
        .services-table th:nth-child(4),
        .services-table th:nth-child(5),
        .services-table th:nth-child(6) {
          text-align: right;
        }
        .services-table td {
          font-size: 9px;
          padding: 12px 10px;
          border-bottom: 1px solid #e0e0e0;
        }
        .services-table td:nth-child(4),
        .services-table td:nth-child(5),
        .services-table td:nth-child(6) {
          text-align: right;
        }
        .services-table tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        /* TOTALS */
        .totals-section {
          width: 250px;
          margin-left: auto;
          margin-top: 20px;
        }
        .totals-row {
          display: table;
          width: 100%;
          margin-bottom: 8px;
        }
        .totals-label {
          display: table-cell;
          font-size: 10px;
          color: #666;
        }
        .totals-value {
          display: table-cell;
          font-size: 10px;
          color: #333;
          text-align: right;
        }
        .totals-final {
          border-top: 2px solid #2C3E50;
          padding-top: 10px;
          margin-top: 5px;
        }
        .totals-final .totals-label,
        .totals-final .totals-value {
          font-size: 12px;
          font-weight: 600;
        }
        .totals-final .totals-value {
          color: #1976d2;
        }
        
        /* PAYMENT TERMS */
        .payment-terms {
          background-color: #FFF9E6;
          border: 1px solid #FFE082;
          padding: 12px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .payment-terms-title {
          font-size: 9px;
          font-weight: 600;
          color: #666;
          margin-bottom: 4px;
        }
        .payment-terms-text {
          font-size: 9px;
          color: #666;
          line-height: 1.5;
        }
        
        /* FOOTER */
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }
        .footer-title {
          font-size: 11px;
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 5px;
        }
        .footer-text {
          font-size: 8px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        
        <!-- HEADER: Company Info LEFT + Logo RIGHT -->
        <div class="header">
          <div class="header-left">
            <div class="company-name">DSJ Construction & Services LLC</div>
            <div class="company-info">
              651 Pullman Pl<br>
              McLean, VA 22102<br>
              Phone: (555) 123-4567<br>
              Email: info@dsjconstruction.com
            </div>
          </div>
          <div class="header-right">
            <img src="https://res.cloudinary.com/dwqxiigpd/image/upload/v1756186310/dsj-logo_mb3npa.jpg" 
                 alt="DSJ Logo" 
                 class="logo-img"
                 onerror="this.style.display='none';" />
          </div>
        </div>
        
        <!-- INVOICE TITLE -->
        <div class="invoice-title">INVOICE ${invoice.invoiceNumber || 'N/A'}</div>
        
        <!-- BILL TO + PAYMENT BOXES -->
        <div class="info-section">
          <div class="bill-to">
            <div class="section-label">BILL TO</div>
            <div class="bill-to-name">${invoice.building?.name || 'N/A'}</div>
            <div class="bill-to-content">
              ${invoice.building?.address || ''}<br>
              ${invoice.building?.city ? `${invoice.building.city}, ${invoice.building.state || ''} ${invoice.building.zipCode || ''}` : ''}
            </div>
          </div>
          <div class="payment-boxes">
            <div class="payment-box box-light">
              <div class="box-label">DATE ISSUED</div>
              <div class="box-value">${formatDate(invoice.invoiceDate)}</div>
            </div>
            <div class="payment-box box-blue">
              <div class="box-label" style="color:#ffffff;">PLEASE PAY</div>
              <div class="box-value" style="color:#ffffff;">${formatCurrency(invoice.total)}</div>
            </div>
            <div class="payment-box box-light">
              <div class="box-label">DUE DATE</div>
              <div class="box-value">${formatDate(invoice.dueDate)}</div>
            </div>
          </div>
        </div>
        
        <!-- SERVICES TABLE -->
        <table class="services-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>ACTIVITY</th>
              <th>DESCRIPTION</th>
              <th>QTY</th>
              <th>RATE</th>
              <th>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems.length > 0 ? lineItems.map(item => `
              <tr>
                <td>${formatDate(item.date || invoice.invoiceDate)}</td>
                <td>${item.activity || item.service || 'Service'}</td>
                <td>${item.description || item.serviceSubcategory || ''}</td>
                <td>${item.quantity || 1}</td>
                <td>${formatCurrency(item.unitPrice || item.price || 0)}</td>
                <td>${formatCurrency(item.totalPrice || ((item.quantity || 1) * (item.unitPrice || item.price || 0)))}</td>
              </tr>
            `).join('') : '<tr><td colspan="6">No services listed</td></tr>'}
          </tbody>
        </table>
        
        <!-- TOTALS -->
        <div class="totals-section">
          <div class="totals-row">
            <div class="totals-label">SUBTOTAL</div>
            <div class="totals-value">${formatCurrency(invoice.subtotal)}</div>
          </div>
          ${invoice.tax ? `
            <div class="totals-row">
              <div class="totals-label">TAX</div>
              <div class="totals-value">${formatCurrency(invoice.tax)}</div>
            </div>
          ` : ''}
          <div class="totals-row totals-final">
            <div class="totals-label">TOTAL DUE</div>
            <div class="totals-value">${formatCurrency(invoice.total)}</div>
          </div>
        </div>
        
        <!-- PAYMENT TERMS -->
        <div class="payment-terms">
          <div class="payment-terms-title">Payment Terms:</div>
          <div class="payment-terms-text">
            Payment is due within 30 days of the invoice date. Thank you for your business!
          </div>
        </div>
        
        <!-- FOOTER -->
        <div class="footer">
          <div class="footer-title">THANK YOU FOR YOUR BUSINESS!</div>
          <div class="footer-text">
            For questions about this invoice, please contact info@dsjconstruction.com
          </div>
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
