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

// @desc    Create invoice from work orders with flexible tax calculation
// @route   POST /api/v1/invoices
// @access  Private
exports.createInvoice = catchAsync(async (req, res, next) => {
    const {
        buildingId,
        workOrderIds,
        dueDate,
        notes,
        invoiceNumber,
        subtotal,
        taxRate = 0,
        isTaxExempt = true,
        taxType = 'none'
    } = req.body;

    console.log('createInvoice called with:', {
        buildingId,
        workOrderIds,
        dueDate,
        notes,
        invoiceNumber,
        subtotal,
        taxRate,
        isTaxExempt,
        taxType
    });

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

    // Calculate totals using either services or estimated/actual costs
    let calculatedSubtotal = 0;
    const invoiceWorkOrders = workOrders.map(wo => {
        let totalPrice = 0;

        // Try to calculate from services first
        if (wo.services && wo.services.length > 0) {
            totalPrice = wo.services.reduce((sum, service) => {
                return sum + (service.laborCost || 0) + (service.materialCost || 0);
            }, 0);
        } else {
            // Fall back to estimated or actual cost
            totalPrice = wo.actualCost || wo.estimatedCost || 0;
        }

        calculatedSubtotal += totalPrice;

        return {
            workOrder: wo._id,
            description: `${wo.title || 'Work Order'} (Apt: ${wo.apartmentNumber || 'N/A'})`,
            quantity: 1,
            unitPrice: totalPrice,
            totalPrice: totalPrice
        };
    });

    // Use provided subtotal or calculated subtotal
    const finalSubtotal = subtotal !== undefined ? subtotal : calculatedSubtotal;

    // Create invoice with tax calculation
    const invoiceData = {
        building: buildingId,
        workOrders: invoiceWorkOrders,
        subtotal: finalSubtotal,
        taxRate: taxRate,
        isTaxExempt: isTaxExempt,
        taxType: taxType,
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

// @desc    Update invoice with tax calculation support
// @route   PATCH /api/v1/invoices/:id
// @access  Private
exports.updateInvoice = catchAsync(async (req, res, next) => {
    const { subtotal, taxRate, isTaxExempt, taxType, notes, status, dueDate } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        return next(new AppError('No invoice found with that ID', 404));
    }

    // Prepare update data
    const updateData = {};

    if (subtotal !== undefined) updateData.subtotal = subtotal;
    if (taxRate !== undefined) updateData.taxRate = taxRate;
    if (isTaxExempt !== undefined) updateData.isTaxExempt = isTaxExempt;
    if (taxType !== undefined) updateData.taxType = taxType;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = dueDate;

    // Update invoice (this will trigger the pre-save hook to recalculate tax and total)
    const updatedInvoice = await Invoice.findByIdAndUpdate(
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
        data: {
            invoice: updatedInvoice
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
