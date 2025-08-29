const mongoose = require('mongoose');

const taskItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  completed: {
    type: Boolean,
    default: false
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  },
  completedAt: Date,
  notes: String
});

const workOrderSchema = new mongoose.Schema({
    building: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Building',
        required: true
    },
    apartmentNumber: {
        type: String,
        required: true
    },
    block: {
        type: String,
        required: true
    },
    workType: {
        type: String,
        required: [true, 'Work type is required'],
        enum: ['painting', 'cleaning', 'repair', 'maintenance', 'inspection', 'other']
    },
    workSubType: {
        type: String,
        required: [true, 'Work sub-type is required']
    },
    roomsAffected: {
        type: Number,
        min: 0,
        default: 1
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    assignedTo: [{
        worker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Worker'
        },
        assignedDate: {
            type: Date,
            default: Date.now
        },
        scheduledDate: Date,
        scheduledTime: String,
        hoursWorked: Number,
        paymentType: {
            type: String,
            enum: ['hourly', 'contract'],
            default: 'hourly'
        },
        hourlyRate: Number,
        contractAmount: Number
    }],
    taskChecklist: [taskItemSchema],
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    startDate: Date,
    completedDate: Date,
    estimatedCost: {
        type: Number,
        min: 0
    },
    actualCost: {
        type: Number,
        min: 0
    },
    laborCost: {
        type: Number,
        min: 0
    },
    materialsCost: {
        type: Number,
        min: 0
    },
    totalCost: {
        type: Number,
        min: 0
    },
    notes: [{
        content: {
            type: String,
            required: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        isPrivate: {
            type: Boolean,
            default: false
        }
    }],
    photos: [{
        url: String,
        description: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
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
    timestamps: true
});

// Pre-save middleware to calculate total cost
workOrderSchema.pre('save', function(next) {
    if (this.laborCost || this.materialsCost) {
        this.totalCost = (this.laborCost || 0) + (this.materialsCost || 0);
    }
    next();
});

// Indexes
workOrderSchema.index({ building: 1, status: 1 });
workOrderSchema.index({ assignedTo: 1 });
workOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WorkOrder', workOrderSchema);
