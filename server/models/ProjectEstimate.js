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
    default: 0
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
    enum: ['draft', 'submitted', 'pending', 'approved', 'rejected', 'converted'],
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
    comment: 'Set when converted directly to invoice'
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

// Index for efficient queries
projectEstimateSchema.index({ building: 1, status: 1 });
projectEstimateSchema.index({ targetYear: 1, status: 1 });
projectEstimateSchema.index({ createdBy: 1, status: 1 });
projectEstimateSchema.index({ visitDate: 1 });

// Pre-save middleware
projectEstimateSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'submitted' && !this.submittedAt) {
      this.submittedAt = new Date();
    }
    if (this.status === 'approved' && !this.approvedAt) {
      this.approvedAt = new Date();
    }
  }
  next();
});

const ProjectEstimate = mongoose.model('ProjectEstimate', projectEstimateSchema);

module.exports = ProjectEstimate;
