const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: false, // Made optional since pre-save hook generates it
        unique: true,
        trim: true,
        uppercase: true,
        match: [/^[A-Z0-9-]+$/, 'Invoice number can only contain letters, numbers and hyphens']
    },
    building: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Building',
        required: true
    },
    workOrders: [{
        workOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WorkOrder',
            required: true
        },
        description: String,
        quantity: {
            type: Number,
            default: 1
        },
        unitPrice: {
            type: Number,
            required: true
        },
        totalPrice: {
            type: Number,
            required: true
        }
    }],
    subtotal: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        default: 0
    },
    taxRate: {
        type: Number,
        default: 0,
        min: [0, 'Tax rate cannot be negative'],
        max: [1, 'Tax rate cannot exceed 100%'],
        comment: 'Tax rate as decimal (e.g., 0.10 for 10%)'
    },
    taxType: {
        type: String,
        enum: ['none', 'commercial', 'residential'],
        default: 'none',
        comment: 'Type of tax applied - none for commercial, residential for residential properties'
    },
    isTaxExempt: {
        type: Boolean,
        default: true,
        comment: 'True for commercial properties (no tax), false for residential (with tax)'
    },
    total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
        default: 'draft'
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    paidDate: Date,
    paymentMethod: {
        type: String,
        enum: ['cash', 'check', 'credit_card', 'bank_transfer', 'other'],
        required: false, // Made optional since payment method may not be known at creation
        default: undefined
    },
    paymentDate: Date,
    amountPaid: {
        type: Number,
        default: 0
    },
    paymentNotes: String,
    notes: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    timestamps: true
});

// Generate invoice number if not provided
invoiceSchema.pre('save', async function(next) {
    if (!this.isNew) return next();
    
    if (!this.invoiceNumber) {
        try {
            // Find the highest invoice number and increment
            const lastInvoice = await this.constructor.findOne(
                { invoiceNumber: { $regex: '^INV-' } },
                { invoiceNumber: 1 },
                { sort: { createdAt: -1 } }
            ).lean();
            
            let nextNumber = 1;
            if (lastInvoice && lastInvoice.invoiceNumber) {
                const matches = lastInvoice.invoiceNumber.match(/(\d+)$/);
                if (matches && matches[1]) {
                    nextNumber = parseInt(matches[1], 10) + 1;
                }
            }
            
            this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;
        } catch (err) {
            // Fallback to timestamp if there's an error
        }
    } else {
        // Format the invoice number to ensure consistency
        this.invoiceNumber = this.invoiceNumber.trim().toUpperCase();
    }
    next();
});

// Pre-save hook to calculate totals based on tax settings
invoiceSchema.pre('save', function(next) {
    // Calculate tax if tax rate is set and not tax exempt
    if (this.taxRate > 0 && !this.isTaxExempt) {
        this.tax = this.subtotal * this.taxRate;
        this.taxType = 'residential';
    } else {
        this.tax = 0;
        this.taxType = 'none';
        this.taxRate = 0;
    }

    // Calculate total
    this.total = this.subtotal + this.tax;

    next();
});
