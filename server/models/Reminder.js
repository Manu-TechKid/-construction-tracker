const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.ObjectId,
    ref: 'Building',
    required: [true, 'Reminder must belong to a building']
  },
  apartment: {
    number: {
      type: String,
      required: [
        function() { return this.type === 'apartment'; },
        'Apartment number is required for apartment reminders'
      ]
    },
    _id: {
      type: mongoose.Schema.ObjectId,
      ref: 'Building.apartments',
      required: [
        function() { return this.type === 'apartment'; },
        'Apartment reference is required for apartment reminders'
      ]
    }
  },
  type: {
    type: String,
    enum: ['building', 'apartment'],
    default: 'building',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please provide a title for the reminder']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description']
  },
  dueDate: {
    type: Date,
    required: [true, 'Please provide a due date']
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'overdue'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  completedAt: Date,
  notes: [
    {
      text: String,
      createdAt: {
        type: Date,
        default: Date.now
      },
      createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    }
  ],
  photos: [
    {
      url: { type: String, required: true },
      caption: { type: String, trim: true },
      type: { type: String, enum: ['before', 'during', 'after', 'issue', 'other'], default: 'other' },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  category: {
    type: String,
    enum: ['maintenance', 'inspection', 'repair', 'update', 'other'],
    default: 'other'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
reminderSchema.index({ building: 1, status: 1, dueDate: 1 });

// Virtual for checking if reminder is due soon
reminderSchema.virtual('isDueSoon').get(function() {
  const daysUntilDue = Math.ceil((this.dueDate - Date.now()) / (1000 * 60 * 60 * 24));
  return daysUntilDue <= 3 && daysUntilDue >= 0; // Due in next 3 days
});

// Update status to overdue if past due date
reminderSchema.pre('save', function(next) {
  if (this.isModified('dueDate') || this.isNew) {
    if (this.dueDate < Date.now() && this.status !== 'completed') {
      this.status = 'overdue';
    }
  }
  next();
});

const Reminder = mongoose.model('Reminder', reminderSchema);

module.exports = Reminder;
