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
  
  // Shift timing
  shiftStart: {
    type: Date,
    required: true
  },
  shiftEnd: {
    type: Date,
    required: false
  },
  
  // Legacy support - map to shift times
  clockInTime: {
    type: Date,
    required: false
  },
  clockOutTime: {
    type: Date,
    required: false
  },
  
  // Calculated hours
  totalHours: {
    type: Number,
    default: 0
  },
  totalPaidHours: {
    type: Number, // Total hours minus unpaid breaks
    default: 0
  },
  breakTime: {
    type: Number, // Total break minutes
    default: 0
  },
  unpaidBreakTime: {
    type: Number, // Unpaid break minutes
    default: 0
  },
  
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'pending_approval', 'approved', 'rejected'],
    default: 'active'
  },
  location: {
    clockIn: {
      latitude: { type: Number, required: false }, // Made optional to prevent errors
      longitude: { type: Number, required: false }, // Made optional to prevent errors
      accuracy: { type: Number },
      address: { type: String },
      timestamp: { type: Date, default: Date.now },
      geofenceValidated: { type: Boolean, default: false },
      geofenceMessage: { type: String },
      geofenceDistance: { type: Number }
    },
    clockOut: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      address: { type: String },
      timestamp: { type: Date },
      geofenceValidated: { type: Boolean, default: false },
      geofenceMessage: { type: String },
      geofenceDistance: { type: Number }
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
    isPaid: { type: Boolean, default: false }, // Whether break is paid or unpaid
    reason: { type: String },
    notes: { type: String },
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
  },
  
  // Admin hour corrections
  originalHours: {
    type: Number // Store original calculated hours
  },
  correctedHours: {
    type: Number // Admin-corrected hours
  },
  correctionReason: {
    type: String // Why hours were corrected
  },
  correctedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  correctedAt: {
    type: Date
  },
  
  // Payment calculation
  hourlyRate: {
    type: Number,
    default: 0 // Rate per hour for this session
  },
  calculatedPay: {
    type: Number,
    default: 0 // Total payment for this session
  },
  
  // Work details for reporting
  apartmentNumber: {
    type: String // Which apartment worked on
  },
  workType: {
    type: String // Type of work performed
  },
  workDescription: {
    type: String // Description of work done
  }
}, {
  timestamps: true
});

// Calculate total hours when shift ends
timeSessionSchema.pre('save', function(next) {
  // Sync legacy fields with shift fields
  if (this.shiftStart && !this.clockInTime) {
    this.clockInTime = this.shiftStart;
  }
  if (this.shiftEnd && !this.clockOutTime) {
    this.clockOutTime = this.shiftEnd;
  }
  
  // Calculate hours if shift has ended
  const endTime = this.shiftEnd || this.clockOutTime;
  const startTime = this.shiftStart || this.clockInTime;
  
  if (endTime && startTime) {
    const diffMs = endTime - startTime;
    const calculatedHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
    
    // Store original hours if not already stored
    if (!this.originalHours) {
      this.originalHours = calculatedHours;
    }
    
    // Use corrected hours if available, otherwise use calculated hours
    this.totalHours = this.correctedHours || calculatedHours;
    
    // Calculate total break time
    let totalBreakMinutes = 0;
    let unpaidBreakMinutes = 0;
    
    if (this.breaks && this.breaks.length > 0) {
      this.breaks.forEach(breakItem => {
        if (breakItem.duration) {
          totalBreakMinutes += breakItem.duration;
          if (!breakItem.isPaid) {
            unpaidBreakMinutes += breakItem.duration;
          }
        }
      });
    }
    
    this.breakTime = totalBreakMinutes;
    this.unpaidBreakTime = unpaidBreakMinutes;
    
    // Calculate paid hours (total hours minus unpaid break time)
    const unpaidBreakHours = unpaidBreakMinutes / 60;
    this.totalPaidHours = Math.max(0, Math.round((this.totalHours - unpaidBreakHours) * 100) / 100);
    
    // Calculate payment based on paid hours
    if (this.hourlyRate > 0) {
      this.calculatedPay = Math.round(this.totalPaidHours * this.hourlyRate * 100) / 100;
    }
  }
  next();
});

// Virtual field to get effective hours (corrected or original)
timeSessionSchema.virtual('effectiveHours').get(function() {
  return this.correctedHours || this.totalHours;
});

// Virtual field to check if hours were corrected
timeSessionSchema.virtual('wasCorrected').get(function() {
  return this.correctedHours !== null && this.correctedHours !== undefined;
});

// Index for efficient queries
timeSessionSchema.index({ worker: 1, clockInTime: -1 });
timeSessionSchema.index({ building: 1, clockInTime: -1 });
timeSessionSchema.index({ workOrder: 1 });
timeSessionSchema.index({ status: 1 });
timeSessionSchema.index({ isApproved: 1 });
timeSessionSchema.index({ worker: 1, building: 1, clockInTime: -1 });

const TimeSession = mongoose.model('TimeSession', timeSessionSchema);

module.exports = TimeSession;
