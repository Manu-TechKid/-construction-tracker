const mongoose = require('mongoose');

const workerScheduleSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Worker ID is required']
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required']
  },
  task: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
workerScheduleSchema.index({ workerId: 1, date: 1 });
workerScheduleSchema.index({ buildingId: 1, date: 1 });
workerScheduleSchema.index({ date: 1, startTime: 1 });
workerScheduleSchema.index({ status: 1 });

// Pre-save validation
workerScheduleSchema.pre('save', function(next) {
  // Ensure end time is after start time
  if (this.endTime <= this.startTime) {
    return next(new Error('End time must be after start time'));
  }
  
  // Ensure start time and end time are on the same date as the schedule date
  const scheduleDate = new Date(this.date);
  const startDate = new Date(this.startTime);
  const endDate = new Date(this.endTime);
  
  // Set the date part to match the schedule date
  startDate.setFullYear(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());
  endDate.setFullYear(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());
  
  this.startTime = startDate;
  this.endTime = endDate;
  
  next();
});

// Virtual for duration in hours
workerScheduleSchema.virtual('durationHours').get(function() {
  if (this.startTime && this.endTime) {
    return (this.endTime - this.startTime) / (1000 * 60 * 60);
  }
  return 0;
});

// Virtual for formatted time range
workerScheduleSchema.virtual('timeRange').get(function() {
  if (this.startTime && this.endTime) {
    const start = this.startTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    const end = this.endTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    return `${start} - ${end}`;
  }
  return '';
});

const WorkerSchedule = mongoose.model('WorkerSchedule', workerScheduleSchema);

module.exports = WorkerSchedule;
