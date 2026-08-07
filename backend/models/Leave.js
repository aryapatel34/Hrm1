const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hrId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  leaveType: {
    type: String,
    required: true,
    enum: ['sick', 'casual', 'earned', 'emergency']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  totalDays: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);
