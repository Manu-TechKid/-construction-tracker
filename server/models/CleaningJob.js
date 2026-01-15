const mongoose = require('mongoose');

const cleaningJobSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  serviceDate: {
    type: Date,
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true,
  },
  unit: {
    type: String,
  },
  subcategory: {
    type: String,
  },
  worker: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  cost: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    default: 0,
  },
  observations: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

const CleaningJob = mongoose.model('CleaningJob', cleaningJobSchema);

module.exports = CleaningJob;
