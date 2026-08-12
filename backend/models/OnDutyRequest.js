const mongoose = require('mongoose');

const onDutyRequestSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isFullDay: {
    type: Boolean,
    default: true
  },
  fromTime: {
    type: String
  },
  toTime: {
    type: String
  },
  reason: {
    type: String,
    required: true
  },
  location: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('OnDutyRequest', onDutyRequestSchema);
