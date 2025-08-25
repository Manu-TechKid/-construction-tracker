const mongoose = require('mongoose');

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
        enum: ['pending', 'in_progress', 'completed', 'on_hold'],
        default: 'pending'
    },
    assignedTo: [{
        worker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Worker'
        },
        hoursWorked: Number,
        paymentType: {
            type: String,
            enum: ['hourly', 'contract'],
            default: 'hourly'
        },
        rate: Number
    }],
    startDate: {
        type: Date,
        default: Date.now
    },
    completionDate: Date,
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    notes: [{
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    issues: [{
        description: String,
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reportedAt: {
            type: Date,
            default: Date.now
        },
        resolved: {
            type: Boolean,
            default: false
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    photos: [{
        url: {
            type: String,
            required: true
        },
        caption: {
            type: String,
            trim: true
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        type: {
            type: String,
            enum: ['before', 'during', 'after', 'issue', 'other'],
            default: 'other'
        }
    }],
    billingStatus: {
        type: String,
        enum: ['pending', 'invoiced', 'paid'],
        default: 'pending'
    },
    laborCost: {
        type: Number,
        default: 0,
        min: 0
    },
    materialsCost: {
        type: Number,
        default: 0,
        min: 0
    },
    totalCost: {
        type: Number,
        default: 0,
        min: 0
    },
    notes: [{
        type: {
            type: String,
            enum: ['progress', 'incident', 'info'],
            default: 'progress'
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium'
        },
        author: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
});

module.exports = mongoose.model('WorkOrder', workOrderSchema);
