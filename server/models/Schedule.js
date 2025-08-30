const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Schedule title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building is required']
  },
  apartment: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['painting', 'cleaning', 'repairs', 'maintenance', 'inspection'],
    default: 'painting'
  },
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'completed', 'cancelled'],
    default: 'planned'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  assignedWorkers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  }],
  estimatedCost: {
    type: Number,
    min: 0
  },
  actualCost: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
scheduleSchema.index({ building: 1, startDate: 1 });
scheduleSchema.index({ status: 1 });
scheduleSchema.index({ assignedWorkers: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
