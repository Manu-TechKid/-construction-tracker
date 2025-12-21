const mongoose = require('mongoose');

const timeLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ['clock-in', 'clock-out'],
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
    },
  },
  workOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder',
  },
  notes: {
    type: String,
    trim: true,
  },
  signature: {
    type: String, // To store base64 signature string
  },
}, { timestamps: true });

timeLogSchema.index({ location: '2dsphere' });

const TimeLog = mongoose.model('TimeLog', timeLogSchema);

module.exports = TimeLog;
