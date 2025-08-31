const mongoose = require('mongoose');

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

const workOrderSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building reference is required']
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
    required: [true, 'Apartment status is required'],
    enum: {
      values: ['vacant', 'occupied', 'under_renovation', 'reserved'],
      message: 'Apartment status must be one of: vacant, occupied, under_renovation, reserved'
    },
    default: 'vacant',
    lowercase: true
  },
  services: [serviceSchema],
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
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
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending'
    },
    completedAt: Date,
    notes: String
  }],
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value >= this.startDate;
      },
      message: 'End date must be after start date'
    }
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
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
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

// Virtual for work order title
workOrderSchema.virtual('title').get(function() {
  return `WO-${this.services[0].type.toUpperCase().substring(0, 3)}-${this._id.toString().substring(18, 24)}`;
});

// Query middleware to filter out deleted work orders
workOrderSchema.pre(/^find/, function(next) {
  if (this.getFilter().isDeleted === undefined) {
    this.find({ isDeleted: { $ne: true } });
  }
  next();
});

// Static method to get work order statistics
workOrderSchema.statics.getStats = async function(buildingId) {
  const stats = await this.aggregate([
    {
      $match: {
        building: buildingId,
        isDeleted: { $ne: true }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalCost: { $sum: '$estimatedCost' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return stats;
};

const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);

module.exports = WorkOrder;
