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
        required: true,
        enum: ['painting', 'repair', 'cleaning', 'carpentry', 'electrical', 'plumbing', 'other']
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
        required: true
    }
});

module.exports = mongoose.model('WorkOrder', workOrderSchema);
