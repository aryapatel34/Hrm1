const mongoose = require('mongoose');

const leaveHistorySchema = new mongoose.Schema({
  leaveId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Leave',
    required: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actorRole: {
    type: String,
    required: true,
    enum: ['employee', 'manager', 'hr', 'admin']
  },
  action: {
    type: String,
    required: true,
    enum: ['Created', 'Approved', 'Rejected', 'Override', 'Cancellation Approved', 'Cancellation Rejected', 'Cancellation Requested']
  },
  oldStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'cancellation_pending', null],
    default: null
  },
  newStatus: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'cancellation_pending']
  },
  reason: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('LeaveHistory', leaveHistorySchema);
