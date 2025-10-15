const mongoose = require('mongoose');

// Counter for automatic invoice numbering
const invoiceCounterSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  count: { type: Number, default: 0 }
});

const InvoiceCounter = mongoose.model('InvoiceCounter', invoiceCounterSchema);

// Simplified Invoice schema that matches the controller expectations
const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        unique: true,
        trim: true,
        uppercase: true
    },
    
    building: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Building',
        required: true
    },
    
    // Work orders included in this invoice
    workOrders: [{
        workOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WorkOrder',
            required: true
        },
        description: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: 0.01
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    
    // Financial totals
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    
    tax: {
        type: Number,
        default: 0,
        min: 0
    },
    
    total: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Dates
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
    
    // Payment information
    status: {
        type: String,
        enum: ['draft', 'pending', 'paid', 'overdue', 'cancelled'],
        default: 'pending'
    },
    
    paidDate: Date,
    
    paymentMethod: {
        type: String,
        enum: ['cash', 'check', 'credit_card', 'bank_transfer', 'other']
    },
    
    amountPaid: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Notes
    notes: String,
    
    // User tracking
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Pre-save hook to generate invoice number
invoiceSchema.pre('save', async function(next) {
    if (this.isNew && !this.invoiceNumber) {
        try {
            const currentYear = new Date().getFullYear();
            
            // Find or create counter for current year
            let counter = await InvoiceCounter.findOneAndUpdate(
                { year: currentYear },
                { $inc: { count: 1 } },
                { new: true, upsert: true }
            );
            
            // Generate invoice number: YEAR-NNNNNN
            const paddedCount = String(counter.count).padStart(6, '0');
            this.invoiceNumber = `${currentYear}-${paddedCount}`;
        } catch (error) {
            console.error('Error generating invoice number:', error);
            return next(error);
        }
    }
    next();
});

// Virtual for calculating overdue status
invoiceSchema.virtual('isOverdue').get(function() {
    return this.status === 'pending' && this.dueDate < new Date();
});

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function() {
    if (this.status !== 'pending') return 0;
    const today = new Date();
    const diffTime = today - this.dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
});

// Method to mark as paid
invoiceSchema.methods.markAsPaid = function(paymentData = {}) {
    this.status = 'paid';
    this.paidDate = paymentData.paidDate || new Date();
    this.paymentMethod = paymentData.paymentMethod;
    this.amountPaid = this.total;
    return this.save();
};

// Method to calculate totals
invoiceSchema.methods.calculateTotals = function() {
    this.subtotal = this.workOrders.reduce((sum, wo) => sum + wo.totalPrice, 0);
    this.total = this.subtotal + this.tax;
    return {
        subtotal: this.subtotal,
        tax: this.tax,
        total: this.total
    };
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = { Invoice, InvoiceCounter };
