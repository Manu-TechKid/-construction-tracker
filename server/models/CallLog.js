const mongoose = require('mongoose');

const prospectSchema = new mongoose.Schema({
  companyName: { type: String, trim: true },
  contactName: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  source: { type: String, trim: true },
  status: { type: String, enum: ['new', 'in_progress', 'won', 'lost', 'on_hold'], default: 'new' }
}, { _id: false });

const nextActionSchema = new mongoose.Schema({
  date: { type: Date },
  type: { type: String, enum: ['phone', 'in_person', 'whatsapp', 'email', 'call', 'visit'] },
  note: { type: String, trim: true }
}, { _id: false });

const callLogSchema = new mongoose.Schema({
  building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building' },
  isProspect: { type: Boolean, default: false },
  prospect: { type: prospectSchema },

  contactName: { type: String, trim: true },
  contactRole: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  contactEmail: { type: String, trim: true, lowercase: true },

  type: { type: String, enum: ['phone', 'in_person', 'whatsapp', 'email'], required: true },
  direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
  purpose: { type: String, trim: true },
  outcome: { 
    type: String, 
    enum: [
      'no_answer', 'left_message', 'not_interested', 'interested',
      'meeting_scheduled', 'requested_estimate', 'existing_client_request'
    ],
    required: true
  },
  notes: { type: String, trim: true },

  nextAction: { type: nextActionSchema },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

callLogSchema.index({ building: 1, createdAt: -1 });
callLogSchema.index({ createdBy: 1, createdAt: -1 });
callLogSchema.index({ 'prospect.companyName': 'text', notes: 'text', contactName: 'text' });

module.exports = mongoose.model('CallLog', callLogSchema);
