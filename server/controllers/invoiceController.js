const Invoice = require('../models/Invoice');
const WorkOrder = require('../models/WorkOrder');
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
    const { buildingId, workOrderIds, dueDate, notes, invoiceNumber, totalAmount } = req.body;

    console.log('createInvoice called with:', { buildingId, workOrderIds, dueDate, notes, invoiceNumber, totalAmount });

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

    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    // Create invoice with manual number if provided
    const invoiceData = {
        building: buildingId,
        workOrders: invoiceWorkOrders,
        subtotal,
        tax,
        total,
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
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

    // Build the query object
    const query = {
        building: buildingId,
        // Only get work orders that can be invoiced
        $or: [
            { billingStatus: { $exists: false } },
            { billingStatus: 'pending' },
            { billingStatus: null }
        ]
    };

    // Add date range filter
    if (startDate || endDate) {
        query.scheduledDate = {};
        if (startDate) {
            query.scheduledDate.$gte = new Date(startDate);
        }
        if (endDate) {
            query.scheduledDate.$lte = new Date(endDate);
        }
    }

    // Add work type filter
    if (workType) {
        query.workType = workType;
    }

    // Add work sub type filter
    if (workSubType) {
        query.workSubType = workSubType;
    }

    // Add status filter
    if (status) {
        query.status = status;
    }

    console.log('Final query:', JSON.stringify(query, null, 2));

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
