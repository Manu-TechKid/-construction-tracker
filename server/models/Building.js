const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const buildingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Building name is required'],
        trim: true
    },
    address: {
        type: String,
        required: [true, 'Address is required']
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
    },
    apartments: [{
        number: {
            type: String,
            required: [true, 'Apartment number is required'],
            trim: true
        },
        block: {
            type: String,
            required: [true, 'Block is required'],
            trim: true
        },
        floor: {
            type: String,
            required: [true, 'Floor is required'],
            trim: true
        },
        status: {
            type: String,
            enum: ['vacant', 'occupied', 'under_renovation', 'reserved'],
            default: 'vacant'
        },
        type: {
            type: String,
            enum: ['standard', 'studio', 'loft', 'duplex', 'penthouse', 'other'],
            default: 'standard'
        },
        area: {
            type: Number,
            min: 0
        },
        bedrooms: {
            type: Number,
            min: 0,
            default: 0
        },
        bathrooms: {
            type: Number,
            min: 1,
            default: 1
        },
        notes: {
            type: String,
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
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
                ref: 'User',
                required: true
            },
            uploadedAt: {
                type: Date,
                default: Date.now
            },
            isPrimary: {
                type: Boolean,
                default: false
            }
        }]
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
    updatedAt: {
        type: Date,
        default: Date.now
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

// Virtual for reminders
buildingSchema.virtual('reminders', {
    ref: 'Reminder',
    localField: '_id',
    foreignField: 'building',
    justOne: false
});

// Indexes for better query performance
buildingSchema.index({ name: 'text', address: 'text', city: 'text' });

// Compound index for unique apartment numbers within a building and block
buildingSchema.index(
  { _id: 1, 'apartments.number': 1, 'apartments.block': 1 },
  { unique: true, partialFilterExpression: { 'apartments.number': { $exists: true } } }
);

// Index for faster apartment lookups
buildingSchema.index({ 'apartments._id': 1 });

// Index for status-based queries
buildingSchema.index({ 'apartments.status': 1 });

// Index for floor-based queries
buildingSchema.index({ 'apartments.floor': 1 });

// Index for type-based queries
buildingSchema.index({ 'apartments.type': 1 });

module.exports = mongoose.model('Building', buildingSchema);
