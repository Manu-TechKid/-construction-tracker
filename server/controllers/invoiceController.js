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

// Create invoice from completed work orders
exports.createInvoice = catchAsync(async (req, res, next) => {
    const { buildingId, workOrderIds, dueDate, notes } = req.body;

    // Get completed work orders that haven't been invoiced
    const workOrders = await WorkOrder.find({
        _id: { $in: workOrderIds },
        building: buildingId,
        status: 'completed',
        billingStatus: 'pending'
    }).populate('building', 'name address');

    if (workOrders.length === 0) {
        return next(new AppError('No eligible work orders found for invoicing', 400));
    }

    // Calculate totals
    let subtotal = 0;
    const invoiceWorkOrders = workOrders.map(wo => {
        // Calculate total cost from services
        const totalPrice = wo.services?.reduce((sum, service) => {
            return sum + (service.laborCost || 0) + (service.materialCost || 0);
        }, 0) || 0;
        subtotal += totalPrice;
        
        return {
            workOrder: wo._id,
            description: `${wo.title || 'Work Order'} (Apt: ${wo.apartmentNumber || 'N/A'})`,
            quantity: 1,
            unitPrice: totalPrice,
            totalPrice: totalPrice
        };
    });

    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    // Create invoice
    const invoice = await Invoice.create({
        building: buildingId,
        workOrders: invoiceWorkOrders,
        subtotal,
        tax,
        total,
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        notes,
        createdBy: req.user ? req.user._id : null
    });

    // Update work orders billing status
    await WorkOrder.updateMany(
        { _id: { $in: workOrderIds } },
        { billingStatus: 'invoiced' }
    );

    const populatedInvoice = await Invoice.findById(invoice._id)
        .populate('building', 'name address')
        .populate('workOrders.workOrder', 'title description apartmentNumber');

    res.status(201).json({
        status: 'success',
        data: {
            invoice: populatedInvoice
        }
    });
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

// Get unbilled work orders for a building
exports.getUnbilledWorkOrders = catchAsync(async (req, res, next) => {
    const { buildingId } = req.params;

    const workOrders = await WorkOrder.find({
        building: buildingId,
        status: 'completed',
        billingStatus: 'pending'
    }).populate('building', 'name address');

    res.status(200).json({
        status: 'success',
        results: workOrders.length,
        data: {
            workOrders
        }
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
