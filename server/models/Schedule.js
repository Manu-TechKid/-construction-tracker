const mongoose = require('mongoose');

const scheduleItemSchema = new mongoose.Schema({
  workOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder',
    required: true
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // Format: "HH:MM" in 24-hour format
    required: true
  },
  endTime: {
    type: String, // Format: "HH:MM" in 24-hour format
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  notes: String,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: String
  },
  checkIn: {
    time: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number],
      address: String
    }
  },
  checkOut: {
    time: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number],
      address: String
    },
    notes: String
  }
}, { timestamps: true });

// Indexes for better query performance
scheduleItemSchema.index({ worker: 1, date: 1 });
scheduleItemSchema.index({ date: 1 });
scheduleItemSchema.index({ status: 1 });

// Create a compound index for location-based queries
scheduleItemSchema.index({ 'location.coordinates': '2dsphere' });

// Pre-save hook to validate times
scheduleItemSchema.pre('save', function(next) {
  // Validate time format (HH:MM in 24-hour format)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timeRegex.test(this.startTime) || !timeRegex.test(this.endTime)) {
    return next(new Error('Invalid time format. Use HH:MM in 24-hour format.'));
  }
  
  // Convert times to minutes for comparison
  const [startHours, startMins] = this.startTime.split(':').map(Number);
  const [endHours, endMins] = this.endTime.split(':').map(Number);
  
  const startTotal = startHours * 60 + startMins;
  const endTotal = endHours * 60 + endMins;
  
  if (startTotal >= endTotal) {
    return next(new Error('End time must be after start time'));
  }
  
  next();
});

// Static method to get worker's schedule for a date range
scheduleItemSchema.statics.getWorkerSchedule = async function(workerId, startDate, endDate) {
  return this.find({
    worker: workerId,
    date: { $gte: startDate, $lte: endDate }
  }).populate('workOrder', 'title description priority')
    .sort({ date: 1, startTime: 1 });
};

// Static method to get work order schedule
scheduleItemSchema.statics.getWorkOrderSchedule = async function(workOrderId) {
  return this.find({ workOrder: workOrderId })
    .populate('worker', 'name email phone')
    .sort({ date: 1, startTime: 1 });
};

// Instance method to check in a worker
scheduleItemSchema.methods.checkInWorker = async function(location, notes = '') {
  if (this.status !== 'scheduled') {
    throw new Error('Cannot check in to a non-scheduled task');
  }
  
  this.checkIn = {
    time: new Date(),
    location: {
      type: 'Point',
      coordinates: [location.longitude, location.latitude],
      address: location.address || ''
    },
    notes
  };
  
  this.status = 'in_progress';
  return this.save();
};

// Instance method to check out a worker
scheduleItemSchema.methods.checkOutWorker = async function(location, notes = '') {
  if (this.status !== 'in_progress') {
    throw new Error('Cannot check out from a task that is not in progress');
  }
  
  this.checkOut = {
    time: new Date(),
    location: {
      type: 'Point',
      coordinates: [location.longitude, location.latitude],
      address: location.address || ''
    },
    notes
  };
  
  this.status = 'completed';
  return this.save();
};

const Schedule = mongoose.model('Schedule', scheduleItemSchema);

module.exports = Schedule;
