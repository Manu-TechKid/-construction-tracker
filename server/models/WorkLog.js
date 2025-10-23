const mongoose = require('mongoose');

const workLogSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timeSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeSession',
    required: true
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: false
  },
  workOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder',
    required: false
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  // What the worker accomplished today
  workCompleted: {
    type: String,
    required: true,
    maxlength: 1000
  },
  // Issues encountered
  issues: {
    type: String,
    maxlength: 500
  },
  // Materials used
  materialsUsed: [{
    item: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true } // e.g., 'pieces', 'meters', 'liters'
  }],
  // Progress photos
  photos: [{
    url: { type: String, required: true },
    description: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  // Admin/Manager feedback
  adminFeedback: {
    type: String,
    maxlength: 500
  },
  adminFeedbackBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminFeedbackAt: {
    type: Date
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'approved', 'needs_revision'],
    default: 'pending'
  },
  // Visibility - workers can see admin comments
  isVisible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
workLogSchema.index({ worker: 1, date: -1 });
workLogSchema.index({ building: 1, date: -1 });
workLogSchema.index({ timeSession: 1 });
workLogSchema.index({ status: 1 });

// Virtual to get formatted date
workLogSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString();
});

module.exports = mongoose.model('WorkLog', workLogSchema);
