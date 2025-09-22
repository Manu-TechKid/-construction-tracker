const mongoose = require('mongoose');

const timeSessionSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder',
    required: false
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: false
  },
  clockInTime: {
    type: Date,
    required: true
  },
  clockOutTime: {
    type: Date,
    required: false
  },
  totalHours: {
    type: Number,
    default: 0
  },
  breakTime: {
    type: Number, // Minutes
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  },
  location: {
    clockIn: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: { type: Number },
      address: { type: String },
      timestamp: { type: Date, default: Date.now }
    },
    clockOut: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      address: { type: String },
      timestamp: { type: Date }
    }
  },
  photos: [{
    url: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['clock-in', 'clock-out', 'progress', 'break'],
      required: true 
    },
    description: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  notes: { type: String },
  progressUpdates: [{
    timestamp: { type: Date, default: Date.now },
    progress: { 
      type: Number, 
      min: 0, 
      max: 100 
    },
    notes: { type: String },
    photos: [{ type: String }]
  }],
  breaks: [{
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number }, // Minutes
    reason: { type: String },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String }
    }
  }],
  // Admin approval fields
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  }
}, {
  timestamps: true
});

// Calculate total hours when clockOutTime is set
timeSessionSchema.pre('save', function(next) {
  if (this.clockOutTime && this.clockInTime) {
    const diffMs = this.clockOutTime - this.clockInTime;
    this.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
  }
  next();
});

// Index for efficient queries
timeSessionSchema.index({ worker: 1, clockInTime: -1 });
timeSessionSchema.index({ building: 1, clockInTime: -1 });
timeSessionSchema.index({ workOrder: 1 });
timeSessionSchema.index({ status: 1 });
timeSessionSchema.index({ isApproved: 1 });

module.exports = mongoose.model('TimeSession', timeSessionSchema);
