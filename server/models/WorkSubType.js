const mongoose = require('mongoose');

const workSubTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Work sub-type name is required'],
    trim: true,
    maxlength: [50, 'Work sub-type name cannot be longer than 50 characters']
  },
  code: {
    type: String,
    required: [true, 'Work sub-type code is required'],
    trim: true,
    lowercase: true,
    maxlength: [20, 'Work sub-type code cannot be longer than 20 characters']
  },
  workType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkType',
    required: [true, 'Work type reference is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot be longer than 200 characters']
  },
  estimatedDuration: {
    type: Number, // in hours
    min: [0, 'Estimated duration cannot be negative'],
    default: 1
  },
  estimatedCost: {
    type: Number,
    min: [0, 'Estimated cost cannot be negative'],
    default: 0
  },
  skillsRequired: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
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
  timestamps: true
});

// Compound index for work type and sub-type combination
workSubTypeSchema.index({ workType: 1, code: 1 }, { unique: true });
workSubTypeSchema.index({ workType: 1, isActive: 1, sortOrder: 1 });

const WorkSubType = mongoose.model('WorkSubType', workSubTypeSchema);

module.exports = WorkSubType;
