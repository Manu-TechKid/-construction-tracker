const mongoose = require('mongoose');

// Counter for automatic invoice numbering
const invoiceCounterSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  count: { type: Number, default: 0 }
});

const InvoiceCounter = mongoose.model('InvoiceCounter', invoiceCounterSchema);

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: false, // Made optional since pre-save hook generates it
        unique: true,
        trim: true,
        uppercase: true,
        match: [/^[A-Z0-9-]+$/, 'Invoice number can only contain letters, numbers and hyphens']
    },
    
    // Enhanced invoice structure for professional templates
    template: {
        type: String,
        enum: ['standard', 'professional', 'detailed'],
        default: 'professional'
    },
    
    // Client/Company information
    client: {
        companyName: {
            type: String,
            required: false, // Made optional to allow legacy invoices
            trim: true
        },
        contactName: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            trim: true
        },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String
        }
    },
    
    // Reference to client pricing for this building
    clientPricing: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientPricing'
    },
    
    // Reference to project estimate if converted
    projectEstimate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectEstimate'
    },
    building: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Building',
        required: true
    },
    // Enhanced line items structure
    lineItems: [{
        // Reference to work order (optional)
        workOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WorkOrder'
        },
        
        // Service details
        serviceCategory: {
            type: String,
            enum: ['painting', 'cleaning', 'repairs', 'remodeling', 'other'],
            required: true
        },
        
        serviceSubcategory: {
            type: String,
            required: true
        },
        
        // Item details
        description: {
            type: String,
            required: true,
            trim: true
        },
        
        quantity: {
            type: Number,
            required: true,
            min: 0.01,
            default: 1
        },
        
        unitType: {
            type: String,
            enum: ['per_room', 'per_sqft', 'per_apartment', 'per_hour', 'fixed'],
            default: 'fixed'
        },
        
        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },
        
        discount: {
            type: Number,
            default: 0,
            min: 0
        },
        
        discountType: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'percentage'
        },
        
        totalPrice: {
            type: Number,
            required: true,
            min: 0
        },
        
        // Tax information
        taxable: {
            type: Boolean,
            default: true
        },
        
        taxRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    }],

    // Work order summaries stored with the invoice (matches controller expectations)
    workOrders: [{
        workOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WorkOrder'
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: 0.01
        },
        unitPrice: {
            type: Number,
            default: 0,
            min: 0
        },
        totalPrice: {
            type: Number,
            default: 0,
            min: 0
        },
        costBreakdown: {
            services: {
                type: Number,
                default: 0
            },
            price: {
                type: Number,
                default: 0
            },
            actualCost: {
                type: Number,
                default: 0
            },
            estimatedCost: {
                type: Number,
                default: 0
            },
            calculatedFrom: {
                type: String,
                default: 'estimatedCost'
            }
        }
    }],
    // Enhanced financial calculations
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    
    totalDiscount: {
        type: Number,
        default: 0,
        min: 0
    },
    
    tax: {
        type: Number,
        default: 0,
        min: 0
    },
    
    taxRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    
    shippingCharge: {
        type: Number,
        default: 0,
        min: 0
    },
    
    total: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['open', 'pending', 'sent', 'viewed', 'accepted', 'paid', 'overdue', 'cancelled', 'refunded'],
        default: 'open'
    },
    
    // Enhanced status tracking
    statusHistory: [{
        status: {
            type: String,
            enum: ['open', 'pending', 'sent', 'viewed', 'accepted', 'paid', 'overdue', 'cancelled', 'refunded'],
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        notes: String,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    issueDate: {
        type: Date,
        default: Date.now
    },
    invoiceDate: {
        type: Date,
        required: false, // Made optional to allow legacy invoices
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: false, // Made optional to allow legacy invoices
        default: function() {
            return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        }
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
    
    // Enhanced notes and terms
    notes: String,
    
    internalNotes: {
        type: String,
        trim: true
    },
    
    termsAndConditions: {
        type: String,
        default: 'Payment is due within 30 days of invoice date. Late payments may incur additional charges.'
    },
    
    // Additional invoice features
    isRecurring: {
        type: Boolean,
        default: false
    },
    
    recurringSchedule: {
        frequency: {
            type: String,
            enum: ['weekly', 'monthly', 'quarterly', 'annually']
        },
        nextDueDate: Date,
        endDate: Date
    },
    
    // Client acceptance tracking
    clientAcceptance: {
        accepted: {
            type: Boolean,
            default: false
        },
        acceptedAt: Date,
        acceptedBy: String, // Client name or email
        acceptanceMethod: {
            type: String,
            enum: ['email', 'portal', 'phone', 'in_person']
        },
        clientSignature: String, // Base64 encoded signature
        ipAddress: String
    },
    
    // Email tracking
    emailTracking: {
        sent: {
            type: Boolean,
            default: false
        },
        sentAt: Date,
        sentTo: [String], // Array of email addresses
        opened: {
            type: Boolean,
            default: false
        },
        openedAt: Date,
        openCount: {
            type: Number,
            default: 0
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    timestamps: true
});

// Generate consecutive invoice number
invoiceSchema.pre('save', async function(next) {
    if (!this.isNew) {
        // Add status history entry for existing invoices
        if (this.isModified('status')) {
            this.statusHistory.push({
                status: this.status,
                timestamp: new Date(),
                updatedBy: this.updatedBy || this.createdBy
            });
        }
        return next();
    }

    if (!this.invoiceNumber) {
        try {
            const currentYear = new Date().getFullYear();
            
            // Find or create counter for current year
            let counter = await InvoiceCounter.findOne({ year: currentYear });
            if (!counter) {
                // Check if there are any existing invoices to determine starting number
                const lastInvoice = await this.constructor.findOne(
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
            
            // Increment counter
            counter.count += 1;
            await counter.save();
            
            // Generate consecutive invoice number
            this.invoiceNumber = String(counter.count).padStart(6, '0');
            
        } catch (err) {
            console.error('Error generating invoice number:', err);
            // Fallback to timestamp-based number
            this.invoiceNumber = `${new Date().getTime()}`;
        }
    } else {
        // Format the invoice number to ensure consistency
        this.invoiceNumber = this.invoiceNumber.trim().toUpperCase();
    }
    
    // Add initial status to history
    this.statusHistory.push({
        status: this.status,
        timestamp: new Date(),
        updatedBy: this.createdBy
    });
    
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

// Method to calculate totals from line items
invoiceSchema.methods.calculateTotals = function() {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    
    const hasWorkOrders = Array.isArray(this.workOrders) && this.workOrders.length > 0;
    const items = hasWorkOrders
        ? this.workOrders
        : Array.isArray(this.lineItems) ? this.lineItems : [];

    items.forEach(item => {
        const quantity = item.quantity || 1;
        const unitPrice = item.unitPrice || 0;
        const existingTotal = typeof item.totalPrice === 'number' ? item.totalPrice : null;

        if (hasWorkOrders) {
            const calculatedTotal = existingTotal !== null ? existingTotal : quantity * unitPrice;
            subtotal += calculatedTotal;
            item.totalPrice = calculatedTotal;
        } else {
            const itemSubtotal = quantity * unitPrice;
            subtotal += itemSubtotal;

            // Calculate discount
            let itemDiscount = 0;
            if (item.discount > 0) {
                if (item.discountType === 'percentage') {
                    itemDiscount = itemSubtotal * (item.discount / 100);
                } else {
                    itemDiscount = item.discount;
                }
            }
            totalDiscount += itemDiscount;

            // Calculate tax
            if (item.taxable && item.taxRate > 0) {
                const taxableAmount = itemSubtotal - itemDiscount;
                totalTax += taxableAmount * (item.taxRate / 100);
            }

            item.totalPrice = itemSubtotal - itemDiscount;
        }
    });

    this.subtotal = subtotal;
    this.totalDiscount = totalDiscount;
    this.tax = totalTax;
    this.total = subtotal - totalDiscount + totalTax + (this.shippingCharge || 0);
    
    return {
        subtotal: this.subtotal,
        totalDiscount: this.totalDiscount,
        tax: this.tax,
        shippingCharge: this.shippingCharge || 0,
        total: this.total
    };
};

// Method to mark invoice as sent
invoiceSchema.methods.markAsSent = function(emailAddresses = [], userId = null) {
    this.status = 'sent';
    this.emailTracking.sent = true;
    this.emailTracking.sentAt = new Date();
    this.emailTracking.sentTo = emailAddresses;
    
    this.statusHistory.push({
        status: 'sent',
        timestamp: new Date(),
        notes: `Sent to: ${emailAddresses.join(', ')}`,
        updatedBy: userId
    });
    
    return this.save();
};

// Method to mark invoice as accepted by client
invoiceSchema.methods.markAsAccepted = function(acceptanceData = {}) {
    this.status = 'accepted';
    this.clientAcceptance.accepted = true;
    this.clientAcceptance.acceptedAt = new Date();
    this.clientAcceptance.acceptedBy = acceptanceData.acceptedBy;
    this.clientAcceptance.acceptanceMethod = acceptanceData.method || 'email';
    this.clientAcceptance.clientSignature = acceptanceData.signature;
    this.clientAcceptance.ipAddress = acceptanceData.ipAddress;
    
    this.statusHistory.push({
        status: 'accepted',
        timestamp: new Date(),
        notes: `Accepted by: ${acceptanceData.acceptedBy}`,
        updatedBy: null
    });
    
    return this.save();
};

// Method to convert from project estimate
invoiceSchema.statics.createFromEstimate = async function(estimate, additionalData = {}) {
    const invoice = new this({
        projectEstimate: estimate._id,
        building: estimate.building,
        client: {
            companyName: additionalData.companyName || estimate.building?.name || 'Client',
            contactName: additionalData.contactName,
            email: additionalData.email,
            phone: additionalData.phone,
            address: additionalData.address
        },
        lineItems: [{
            serviceCategory: 'other',
            serviceSubcategory: 'project_work',
            description: estimate.description,
            quantity: 1,
            unitType: 'fixed',
            unitPrice: estimate.estimatedPrice || 0,
            totalPrice: estimate.estimatedPrice || 0,
            taxable: true
        }],
        subtotal: estimate.estimatedPrice || 0,
        total: estimate.estimatedPrice || 0,
        invoiceDate: new Date(),
        notes: estimate.notes,
        createdBy: additionalData.createdBy || estimate.createdBy,
        ...additionalData
    });
    
    // Calculate due date
    const building = await mongoose.model('Building').findById(estimate.building);
    if (building && building.paymentTerms) {
        const graceDays = invoice.getGraceDaysFromPaymentTerms(building.paymentTerms);
        const dueDate = new Date(invoice.invoiceDate);
        dueDate.setDate(dueDate.getDate() + graceDays);
        invoice.dueDate = dueDate;
    }
    
    return invoice;
};

// Indexes for better performance
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ building: 1, status: 1 });
invoiceSchema.index({ 'client.companyName': 1 });
invoiceSchema.index({ invoiceDate: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ projectEstimate: 1 });
invoiceSchema.index({ createdAt: -1 });

module.exports = {
    Invoice: mongoose.model('Invoice', invoiceSchema),
    InvoiceCounter: InvoiceCounter
};
