const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Skill name is required'],
    unique: true,
    trim: true,
  },
  color: {
    type: String,
    required: [true, 'Color is required'],
    default: '#FFFFFF',
  },
}, {
  timestamps: true,
});

const Skill = mongoose.model('Skill', skillSchema);

module.exports = Skill;
