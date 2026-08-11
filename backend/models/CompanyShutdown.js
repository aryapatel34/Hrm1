const mongoose = require('mongoose');

const companyShutdownSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number, required: true },
  reason: { type: String, required: true },
  applicableTo: { type: [String], default: ['All Employees'] },
}, { timestamps: true });

module.exports = mongoose.model('CompanyShutdown', companyShutdownSchema);
