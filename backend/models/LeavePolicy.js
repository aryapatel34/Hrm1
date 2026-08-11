const mongoose = require('mongoose');

const leavePolicySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  applicableTo: { type: [String], default: ['All Employees'] },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  type: { type: String, default: 'paid' },
  annualAllowance: { type: Number, required: true, default: 0 },
  carryForwardLimit: { type: Number, default: 0 },
  requiresApproval: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('LeavePolicy', leavePolicySchema);
