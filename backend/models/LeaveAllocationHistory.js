const mongoose = require('mongoose');

const leaveAllocationHistorySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leaveType: {
    type: String,
    required: true
  },
  oldAllocatedDays: {
    type: Number,
    required: true
  },
  newAllocatedDays: {
    type: Number,
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('LeaveAllocationHistory', leaveAllocationHistorySchema);