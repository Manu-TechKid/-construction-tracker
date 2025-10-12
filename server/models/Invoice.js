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
    invoiceDate: {
        type: Date,
        required: true,
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
            this.invoiceNumber = `INV-${new Date().getTime()}`;
        }
    } else {
        // Format the invoice number to ensure consistency
        this.invoiceNumber = this.invoiceNumber.trim().toUpperCase();
    }
    next();
});

// Calculate due date based on invoice date and building payment terms
invoiceSchema.pre('save', async function(next) {
    if (!this.isNew && !this.isModified('invoiceDate') && !this.isModified('building')) return next();

    try {
        // If invoiceDate is being set, calculate dueDate based on building's payment terms
        if (this.invoiceDate && this.building) {
            const Building = mongoose.model('Building');
            const building = await Building.findById(this.building);

            if (building && building.paymentTerms) {
                const graceDays = this.getGraceDaysFromPaymentTerms(building.paymentTerms);
                const dueDate = new Date(this.invoiceDate);
                dueDate.setDate(dueDate.getDate() + graceDays);
                this.dueDate = dueDate;
            }
        }
    } catch (error) {
        console.error('Error calculating due date:', error);
    }

    next();
});

// Helper function to get grace days from payment terms
invoiceSchema.methods.getGraceDaysFromPaymentTerms = function(paymentTerms) {
    switch (paymentTerms) {
        case 'net_15': return 15;
        case 'net_30': return 30;
        case 'net_60': return 60;
        case 'net_90': return 90;
        default: return 30; // Default to 30 days
    }
};

module.exports = mongoose.model('Invoice', invoiceSchema);
