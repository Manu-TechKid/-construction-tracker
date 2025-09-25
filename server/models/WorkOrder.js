const mongoose = require('mongoose');

const workOrderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Work order title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be longer than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building reference is required'],
  },
  apartmentNumber: {
    type: String,
    trim: true,
  },
  block: {
    type: String,
    trim: true,
  },
  workType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkType',
    required: [true, 'Work type is required'],
  },
  workSubType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkSubType',
    required: [true, 'Work sub-type is required'],
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'pending'
  },
  assignedTo: [{
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  scheduledDate: {
    type: Date,
    default: Date.now
  },
  estimatedCost: {
    type: Number,
    min: [0, 'Estimated cost cannot be negative'],
    default: 0
  },
  actualCost: {
    type: Number,
    min: [0, 'Actual cost cannot be negative'],
    default: 0
  },
  // New fields for better cost management
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    default: 0,
    comment: 'What we charge the customer'
  },
  cost: {
    type: Number,
    min: [0, 'Cost cannot be negative'],
    default: 0,
    comment: 'What it costs us (materials, labor, etc.)'
  },
  billingStatus: {
    type: String,
    enum: ['pending', 'invoiced', 'paid', 'cancelled'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  photos: [
    {
      url: { type: String, required: true },
      caption: { type: String, trim: true },
      type: { type: String, enum: ['before', 'during', 'after', 'issue', 'other'], default: 'other' },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  services: [
    {
      name: { type: String, required: true },
      description: { type: String },
      laborCost: { type: Number, default: 0 },
      materialCost: { type: Number, default: 0 },
      quantity: { type: Number, default: 1 },
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
      }
    }
  ],
}, {
  timestamps: true,
});

const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);

module.exports = WorkOrder;
