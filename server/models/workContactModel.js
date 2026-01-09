const mongoose = require('mongoose');

const workContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A contact must have a name'],
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  expertise: {
    type: String,
    trim: true
  },
  responded: {
    type: Boolean,
    default: false
  },
  observations: {
    type: String,
    trim: true
  },
  deleted: {
    type: Boolean,
    default: false,
    select: false
  }
}, { timestamps: true });

// Middleware for soft delete
workContactSchema.pre(/^find/, function(next) {
  this.find({ deleted: { $ne: true } });
  next();
});

const WorkContact = mongoose.model('WorkContact', workContactSchema);

module.exports = WorkContact;
