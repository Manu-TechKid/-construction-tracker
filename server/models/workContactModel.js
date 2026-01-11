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
  expertise: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
  }],
  responded: {
    type: Boolean,
    default: false
  },
  rating: {
    type: String,
    enum: ['good', 'bad', 'regular', 'unrated'],
    default: 'unrated'
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
