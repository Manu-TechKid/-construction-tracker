const mongoose = require('mongoose');

const projectEstimateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building is required']
  },
  apartmentNumber: {
    type: String,
    trim: true
  },
  estimatedCost: {
    type: Number,
    min: [0, 'Estimated cost cannot be negative'],
    default: 0,
    required: false // Make optional as requested
  },
  estimatedPrice: {
    type: Number,
    min: [0, 'Estimated price cannot be negative'],
    default: 0
  },
  estimatedDuration: {
    type: Number,
    min: [1, 'Duration must be at least 1 day'],
    default: 1,
    comment: 'Duration in days'
  },
  visitDate: {
    type: Date,
    default: Date.now
  },
  proposedStartDate: {
    type: Date
  },
  targetYear: {
    type: Number,
    default: () => new Date().getFullYear(),
    min: [2024, 'Year must be 2024 or later']
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'pending', 'approved', 'rejected', 'converted_to_workorder', 'converted_to_invoice', 'client_accepted', 'client_rejected'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  photos: [{
    url: { 
      type: String, 
      required: true 
    },
    caption: { 
      type: String, 
      trim: true 
    },
    type: { 
      type: String, 
      enum: ['site_visit', 'before', 'reference', 'damage', 'measurement', 'other'], 
      default: 'site_visit' 
    },
    uploadedAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  notes: {
    type: String,
    trim: true
  },
  clientNotes: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  workOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder',
    comment: 'Set when converted to work order'
  },
  
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    comment: 'Set when converted to invoice'
  },
  
  // Enhanced line items for detailed estimates
  lineItems: [{
    serviceDate: {
      type: Date,
      default: Date.now
    },
    
    productService: {
      type: String,
      required: true,
      trim: true
    },
    
    description: {
      type: String,
      required: true,
      trim: true
    },
    
    qty: {
      type: Number,
      required: true,
      min: 0.01,
      default: 1
    },
    
    rate: {
      type: Number,
      required: true,
      min: 0
    },
    
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    
    class: {
      type: String,
      trim: true,
      comment: 'Hidden from client view - for internal classification'
    },
    
    tax: {
      type: Number,
      min: 0,
      default: 0,
      comment: 'Tax amount or percentage'
    },
    
    taxType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    
    // Keep for backward compatibility and internal cost tracking
    estimatedCost: {
      type: Number,
      min: 0,
      default: 0
    },
    
    notes: {
      type: String,
      trim: true
    }
  }],
  
  // Client interaction tracking
  clientInteraction: {
    sentToClient: {
      type: Boolean,
      default: false
    },
    
    sentAt: Date,
    
    clientViewed: {
      type: Boolean,
      default: false
    },
    
    viewedAt: Date,
    
    clientAccepted: {
      type: Boolean,
      default: false
    },
    
    acceptedAt: Date,
    
    acceptedBy: {
      type: String,
      trim: true
    },
    
    clientRejected: {
      type: Boolean,
      default: false
    },
    
    rejectedAt: Date,
    
    clientRejectionReason: {
      type: String,
      trim: true
    },
    
    clientSignature: {
      type: String // Base64 encoded signature
    },
    
    ipAddress: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  submittedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for profit calculation
projectEstimateSchema.virtual('estimatedProfit').get(function() {
  return (this.estimatedPrice || 0) - (this.estimatedCost || 0);
});

// Virtual for profit margin
projectEstimateSchema.virtual('estimatedProfitMargin').get(function() {
  if (!this.estimatedPrice || this.estimatedPrice === 0) return 0;
  return ((this.estimatedProfit / this.estimatedPrice) * 100).toFixed(1);
});

// Virtual for line items total (including tax)
projectEstimateSchema.virtual('lineItemsTotal').get(function() {
  if (!this.lineItems || this.lineItems.length === 0) return this.estimatedPrice || 0;
  
  let subtotal = 0;
  let totalTax = 0;
  
  this.lineItems.forEach(item => {
    const itemAmount = item.amount || 0;
    subtotal += itemAmount;
    
    if (item.tax > 0) {
      if (item.taxType === 'percentage') {
        totalTax += (itemAmount * item.tax) / 100;
      } else {
        totalTax += item.tax;
      }
    }
  });
  
  return subtotal + totalTax;
});

// Virtual for line items cost
projectEstimateSchema.virtual('lineItemsCost').get(function() {
  if (!this.lineItems || this.lineItems.length === 0) return this.estimatedCost || 0;
  return this.lineItems.reduce((total, item) => total + (item.estimatedCost || 0), 0);
});

// Index for efficient queries
projectEstimateSchema.index({ building: 1, status: 1 });
projectEstimateSchema.index({ targetYear: 1, status: 1 });
projectEstimateSchema.index({ createdBy: 1, status: 1 });
projectEstimateSchema.index({ visitDate: 1 });
projectEstimateSchema.index({ invoiceId: 1 });
projectEstimateSchema.index({ 'clientInteraction.sentToClient': 1 });
projectEstimateSchema.index({ 'clientInteraction.clientAccepted': 1 });

// Pre-save middleware
projectEstimateSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'submitted' && !this.submittedAt) {
      this.submittedAt = new Date();
    }
    if (this.status === 'approved' && !this.approvedAt) {
      this.approvedAt = new Date();
    }
    if (this.status === 'client_accepted' && !this.clientInteraction.acceptedAt) {
      this.clientInteraction.clientAccepted = true;
      this.clientInteraction.acceptedAt = new Date();
    }
    if (this.status === 'client_rejected' && !this.clientInteraction.rejectedAt) {
      this.clientInteraction.clientRejected = true;
      this.clientInteraction.rejectedAt = new Date();
    }
  }
  
  // Update totals based on line items if they exist
  if (this.lineItems && this.lineItems.length > 0) {
    this.estimatedPrice = this.lineItemsTotal;
    this.estimatedCost = this.lineItemsCost;
  }
  
  next();
});

// Method to send estimate to client
projectEstimateSchema.methods.sendToClient = function(clientEmail, userId = null) {
  this.status = 'pending';
  this.clientInteraction.sentToClient = true;
  this.clientInteraction.sentAt = new Date();
  
  if (!this.submittedAt) {
    this.submittedAt = new Date();
  }
  
  return this.save();
};

// Method to mark as viewed by client
projectEstimateSchema.methods.markAsViewed = function(ipAddress = null) {
  this.clientInteraction.clientViewed = true;
  this.clientInteraction.viewedAt = new Date();
  this.clientInteraction.ipAddress = ipAddress;
  
  return this.save();
};

// Method to accept estimate
projectEstimateSchema.methods.acceptByClient = function(acceptanceData = {}) {
  this.status = 'client_accepted';
  this.clientInteraction.clientAccepted = true;
  this.clientInteraction.acceptedAt = new Date();
  this.clientInteraction.acceptedBy = acceptanceData.acceptedBy;
  this.clientInteraction.clientSignature = acceptanceData.signature;
  this.clientInteraction.ipAddress = acceptanceData.ipAddress;
  
  return this.save();
};

// Method to reject estimate
projectEstimateSchema.methods.rejectByClient = function(rejectionData = {}) {
  this.status = 'client_rejected';
  this.clientInteraction.clientRejected = true;
  this.clientInteraction.rejectedAt = new Date();
  this.clientInteraction.clientRejectionReason = rejectionData.reason;
  this.clientInteraction.ipAddress = rejectionData.ipAddress;
  
  return this.save();
};

// Method to convert to invoice
projectEstimateSchema.methods.convertToInvoice = async function(additionalData = {}) {
  const { Invoice } = require('./Invoice');
  
  // Create invoice from estimate
  const invoice = await Invoice.createFromEstimate(this, additionalData);
  await invoice.save();
  
  // Update estimate status
  this.status = 'converted_to_invoice';
  this.invoiceId = invoice._id;
  await this.save();
  
  return invoice;
};

// Method to add line item
projectEstimateSchema.methods.addLineItem = function(itemData) {
  const qty = itemData.qty || 1;
  const rate = itemData.rate || 0;
  const amount = itemData.amount || (qty * rate);
  
  this.lineItems.push({
    serviceDate: itemData.serviceDate || new Date(),
    productService: itemData.productService,
    description: itemData.description,
    qty: qty,
    rate: rate,
    amount: amount,
    class: itemData.class,
    tax: itemData.tax || 0,
    taxType: itemData.taxType || 'percentage',
    estimatedCost: itemData.estimatedCost || 0,
    notes: itemData.notes
  });
  
  return this;
};

// Method to calculate line item totals with tax
projectEstimateSchema.methods.calculateTotals = function() {
  if (this.lineItems && this.lineItems.length > 0) {
    let subtotal = 0;
    let totalTax = 0;
    
    this.lineItems.forEach(item => {
      const itemAmount = item.amount || 0;
      subtotal += itemAmount;
      
      if (item.tax > 0) {
        if (item.taxType === 'percentage') {
          totalTax += (itemAmount * item.tax) / 100;
        } else {
          totalTax += item.tax;
        }
      }
    });
    
    this.estimatedPrice = subtotal + totalTax;
    this.estimatedCost = this.lineItems.reduce((total, item) => total + (item.estimatedCost || 0), 0);
  }
  
  return {
    estimatedPrice: this.estimatedPrice,
    estimatedCost: this.estimatedCost,
    estimatedProfit: this.estimatedProfit,
    estimatedProfitMargin: this.estimatedProfitMargin
  };
};

const ProjectEstimate = mongoose.model('ProjectEstimate', projectEstimateSchema);

module.exports = ProjectEstimate;
