const mongoose = require('mongoose');

const buildingActivityLogSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building is required']
  },
  activityType: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: [
      'parking_cleaning',
      'common_area_cleaning',
      'landscaping',
      'maintenance',
      'inspection',
      'repair',
      'painting',
      'other'
    ],
    default: 'other'
  },
  customActivityName: {
    type: String,
    trim: true,
    maxlength: [100, 'Custom activity name cannot exceed 100 characters']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  time: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time in HH:MM format'],
    default: '09:00'
  },
  duration: {
    type: Number,
    min: [0, 'Duration cannot be negative'],
    default: 1
  },
  durationUnit: {
    type: String,
    enum: ['minutes', 'hours', 'days'],
    default: 'hours'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'pending'],
    default: 'scheduled'
  },
  completedAt: {
    type: Date
  },
  assignedWorkers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
buildingActivityLogSchema.index({ building: 1, date: -1 });
buildingActivityLogSchema.index({ activityType: 1, date: -1 });
buildingActivityLogSchema.index({ date: -1 });
buildingActivityLogSchema.index({ status: 1 });
buildingActivityLogSchema.index({ createdBy: 1 });

// Virtual for formatted date
buildingActivityLogSchema.virtual('formattedDate').get(function() {
  return this.date ? this.date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : '';
});

// Virtual for formatted time
buildingActivityLogSchema.virtual('formattedTime').get(function() {
  if (!this.time) return '';
  const [hours, minutes] = this.time.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
});

const BuildingActivityLog = mongoose.model('BuildingActivityLog', buildingActivityLogSchema);

module.exports = BuildingActivityLog;
