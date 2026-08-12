const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['National', 'Festival', 'Optional', 'mandatory', 'optional', 'public'], default: 'National' },
  description: { type: String },
  applicableTo: { type: [String], default: ['All Employees'] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Holiday', holidaySchema);
