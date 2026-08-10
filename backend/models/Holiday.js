const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['National', 'Festival', 'Optional', 'mandatory', 'optional'], default: 'National' },
  applicableTo: { type: [String], default: ['All Employees'] }
}, { timestamps: true });

module.exports = mongoose.model('Holiday', holidaySchema);
