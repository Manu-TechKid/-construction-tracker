const mongoose = require('mongoose');

const workTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Work type name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Work type name cannot be longer than 50 characters']
  },
  code: {
    type: String,
    required: [true, 'Work type code is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [20, 'Work type code cannot be longer than 20 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot be longer than 200 characters']
  },
  color: {
    type: String,
    default: '#1976d2',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  icon: {
    type: String,
    trim: true,
    default: 'work'
  },
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

// Index for better performance
workTypeSchema.index({ isActive: 1, sortOrder: 1 });
workTypeSchema.index({ code: 1 });

const WorkType = mongoose.model('WorkType', workTypeSchema);

module.exports = WorkType;
