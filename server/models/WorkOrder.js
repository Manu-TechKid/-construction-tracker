const mongoose = require('mongoose');

// Task item schema for work order tasks/checklist
const taskItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Task name is required'],
    trim: true,
    maxlength: [100, 'Task name cannot be longer than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be longer than 500 characters']
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: Date,
  notes: [{
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

// Service schema for work order services
const serviceSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Service type is required'],
    enum: [
      'painting', 'cleaning', 'repair', 'plumbing', 
      'electrical', 'hvac', 'flooring', 'roofing', 'carpentry', 'other'
    ]
  },
  description: {
    type: String,
    required: [true, 'Service description is required']
  },
  laborCost: {
    type: Number,
    default: 0,
    min: [0, 'Labor cost cannot be negative']
  },
  materialCost: {
    type: Number,
    default: 0,
    min: [0, 'Material cost cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'],
    default: 'pending'
  },
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Main work order schema
const workOrderSchema = new mongoose.Schema({
  // Basic work order information
  title: {
    type: String,
    required: [true, 'Work order title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be longer than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  // Building reference - required
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building reference is required'],
    index: true
  },
  apartmentNumber: {
    type: String,
    trim: true,
    maxlength: [20, 'Apartment number cannot be longer than 20 characters']
  },
  block: {
    type: String,
    trim: true,
    maxlength: [50, 'Block cannot be longer than 50 characters']
  },
  apartmentStatus: {
    type: String,
    enum: {
      values: ['vacant', 'occupied', 'under_renovation', 'reserved'],
      message: 'Apartment status must be one of: vacant, occupied, under_renovation, reserved'
    },
    default: 'occupied',
    lowercase: true
  },
  // Array of services with details and costs
  services: [{
    ...serviceSchema.obj,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'],
      default: 'pending'
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: [{
      content: String,
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      isPrivate: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'pending'
  },
  // Workers assigned to this work order
  assignedTo: [{
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Worker reference is required']
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned by user reference is required']
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'rejected'],
      default: 'pending'
    },
    completedAt: Date,
    notes: String,
    // Track time spent on the task
    timeSpent: {
      hours: { type: Number, default: 0 },
      minutes: { type: Number, default: 0 }
    },
    // Materials used
    materials: [{
      name: String,
      quantity: Number,
      unit: String,
      cost: Number,
      notes: String
    }]
  }],
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required'],
    default: Date.now
  },
  estimatedCost: {
    type: Number,
    min: [0, 'Estimated cost cannot be negative'],
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  actualCost: {
    type: Number,
    min: [0, 'Actual cost cannot be negative'],
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  estimatedCompletionDate: Date,
  actualCompletionDate: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator user reference is required']
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  photos: [{
    url: {
      type: String,
      required: [true, 'Photo URL is required'],
      trim: true
    },
    description: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: [{
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tasks: [taskItemSchema],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
workOrderSchema.index({ building: 1 });
workOrderSchema.index({ status: 1 });
workOrderSchema.index({ 'assignedTo.worker': 1 });
workOrderSchema.index({ 'assignedTo.status': 1 });
workOrderSchema.index({ scheduledDate: 1 });

// Virtual for work order title and other computed properties
workOrderSchema.virtual('title').get(function() {
  const prefix = this.services?.[0]?.type ? this.services[0].type.toUpperCase().substring(0, 3) : 'WO';
  return `${prefix}-${this._id.toString().substring(18, 24)}`;
});

// Calculate total estimated cost
workOrderSchema.virtual('totalEstimatedCost').get(function() {
  if (!this.services || !this.services.length) return 0;
  return this.services.reduce((total, service) => {
    return total + (service.laborCost || 0) + (service.materialCost || 0);
  }, 0);
});

// Calculate total actual cost
workOrderSchema.virtual('totalActualCost').get(function() {
  if (!this.services || !this.services.length) return 0;
  return this.services.reduce((total, service) => {
    return total + (service.actualLaborCost || 0) + (service.actualMaterialCost || 0);
  }, 0);
});

// Query middleware to filter out deleted work orders and populate common fields
workOrderSchema.pre(/^find/, function(next) {
  // Only apply to non-query operations that don't explicitly set isDeleted
  if (this.getFilter().isDeleted === undefined) {
    this.find({ isDeleted: { $ne: true } });
  }
  
  // Populate commonly used fields
  this.populate({
    path: 'building',
    select: 'name address city state zipCode'
  })
  .populate({
    path: 'assignedTo.worker',
    select: 'name email phone'
  })
  .populate({
    path: 'createdBy',
    select: 'name email'
  });
  
  next();
});

// Add a pre-save hook to update timestamps and status
workOrderSchema.pre('save', function(next) {
  // Update timestamps
  const now = new Date();
  this.updatedAt = now;
  
  // If status is being set to completed and completedAt is not set
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = now;
  }
  
  // If all services are completed, mark work order as completed
  if (this.services && this.services.every(s => s.status === 'completed') && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = now;
  }
  
  next();
});

/**
 * Get work order statistics for a building
 * @param {ObjectId} buildingId - The building ID
 * @param {ObjectId} [userId] - Optional user ID to filter by assigned worker
 * @returns {Object} Statistics object with counts and costs by status
 */
workOrderSchema.statics.getStats = async function(buildingId, userId = null) {
  const match = {
    building: buildingId,
    isDeleted: { $ne: true }
  };

  // If user ID is provided, only count work orders assigned to this user
  if (userId) {
    match['assignedTo.worker'] = userId;
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEstimatedCost: { $sum: '$estimatedCost' },
        totalActualCost: { $sum: '$actualCost' },
        // Calculate average time to complete (in days)
        avgCompletionTime: {
          $avg: {
            $cond: [
              { $eq: ['$status', 'completed'] },
              { $divide: [
                { $subtract: ['$completedAt', '$createdAt'] },
                1000 * 60 * 60 * 24 // Convert ms to days
              ]},
              null
            ]
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Calculate overall stats
  const result = {
    byStatus: {},
    total: 0,
    totalEstimatedCost: 0,
    totalActualCost: 0,
    completionRate: 0
  };

  // Process each status group
  stats.forEach(stat => {
    result.byStatus[stat._id] = {
      count: stat.count,
      estimatedCost: stat.totalEstimatedCost || 0,
      actualCost: stat.totalActualCost || 0,
      avgCompletionDays: stat.avgCompletionTime ? Math.round(stat.avgCompletionTime * 10) / 10 : null
    };
    
    result.total += stat.count;
    result.totalEstimatedCost += stat.totalEstimatedCost || 0;
    result.totalActualCost += stat.totalActualCost || 0;
  });

  // Calculate completion rate (percentage of completed work orders)
  if (result.total > 0) {
    const completedCount = result.byStatus.completed?.count || 0;
    result.completionRate = Math.round((completedCount / result.total) * 100);
  }

  return result;
};

/**
 * Get worker productivity statistics
 * @param {ObjectId} buildingId - The building ID
 * @param {Date} startDate - Start date for the report
 * @param {Date} endDate - End date for the report
 * @returns {Array} Array of worker productivity stats
 */
workOrderSchema.statics.getWorkerProductivity = async function(buildingId, startDate, endDate) {
  return this.aggregate([
    // Match work orders in the date range and building
    {
      $match: {
        building: buildingId,
        isDeleted: { $ne: true },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    // Unwind the assignedTo array to process each assignment
    { $unwind: '$assignedTo' },
    // Lookup worker details
    {
      $lookup: {
        from: 'users',
        localField: 'assignedTo.worker',
        foreignField: '_id',
        as: 'workerInfo'
      }
    },
    { $unwind: '$workerInfo' },
    // Group by worker
    {
      $group: {
        _id: '$assignedTo.worker',
        workerName: { $first: '$workerInfo.name' },
        totalAssigned: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        },
        inProgress: {
          $sum: {
            $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0]
          }
        },
        pending: {
          $sum: {
            $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
          }
        },
        // Calculate total time spent in hours
        totalHours: {
          $sum: {
            $add: [
              { $ifNull: [{ $multiply: ['$assignedTo.timeSpent.hours', 1] }, 0] },
              { $divide: [{ $ifNull: ['$assignedTo.timeSpent.minutes', 0] }, 60] }
            ]
          }
        },
        // Calculate total cost (time * rate + materials)
        totalCost: {
          $sum: {
            $add: [
              { $multiply: ['$assignedTo.timeSpent.hours', '$workerInfo.hourlyRate'] },
              { $multiply: [{ $divide: ['$assignedTo.timeSpent.minutes', 60] }, '$workerInfo.hourlyRate'] },
              {
                $reduce: {
                  input: '$assignedTo.materials',
                  initialValue: 0,
                  in: { $add: ['$$value', { $multiply: ['$$this.quantity', '$$this.cost'] }] }
                }
              }
            ]
          }
        }
      }
    },
    // Calculate completion rate and average time per work order
    {
      $addFields: {
        completionRate: {
          $cond: [
            { $eq: ['$totalAssigned', 0] },
            0,
            { $multiply: [{ $divide: ['$completed', '$totalAssigned'] }, 100] }
          ]
        },
        avgTimePerWorkOrder: {
          $cond: [
            { $eq: ['$completed', 0] },
           null,
           { $divide: ['$totalHours', '$completed'] }
          ]
        }
      }
    },
    // Project final fields
    {
      $project: {
        _id: 0,
        workerId: '$_id',
        workerName: 1,
        totalAssigned: 1,
        completed: 1,
        inProgress: 1,
        pending: 1,
        completionRate: { $round: ['$completionRate', 2] },
        totalHours: { $round: ['$totalHours', 2] },
        avgTimePerWorkOrder: { $ifNull: [{ $round: ['$avgTimePerWorkOrder', 2] }, 'N/A'] },
        totalCost: { $round: ['$totalCost', 2] }
      }
    },
    // Sort by total completed work orders (descending)
    { $sort: { completed: -1 } }
  ]);
};

const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);

module.exports = WorkOrder;
