const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    unique: true
  },
  skills: [{
    type: String,
    enum: [
      'painting', 'plumbing', 'electrical', 'carpentry', 'cleaning',
      'hvac', 'roofing', 'flooring', 'landscaping', 'masonry',
      'welding', 'tiling', 'drywall', 'insulation', 'windows',
      'doors', 'kitchen', 'bathroom', 'general_maintenance'
    ]
  }],
  hourlyRate: {
    type: Number,
    min: 0,
    default: 0
  },
  availability: {
    type: String,
    enum: ['available', 'busy', 'unavailable', 'on_leave'],
    default: 'available'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'suspended', 'inactive'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  metadata: {
    totalJobsCompleted: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    joinedDate: {
      type: Date,
      default: Date.now
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
workerSchema.index({ user: 1 });
workerSchema.index({ status: 1 });
workerSchema.index({ availability: 1 });
workerSchema.index({ skills: 1 });

// Virtual for worker's full name (from user)
workerSchema.virtual('fullName').get(function() {
  return this.user ? `${this.user.firstName} ${this.user.lastName}` : '';
});

// Static method to get worker statistics
workerSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalWorkers: { $sum: 1 },
        approvedWorkers: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        pendingWorkers: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        availableWorkers: {
          $sum: { $cond: [{ $eq: ['$availability', 'available'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalWorkers: 0,
    approvedWorkers: 0,
    pendingWorkers: 0,
    availableWorkers: 0
  };
};

const Worker = mongoose.model('Worker', workerSchema);

module.exports = Worker;
