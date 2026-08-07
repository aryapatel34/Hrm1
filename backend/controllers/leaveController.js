const Leave = require('../models/Leave');
const User = require('../models/User');
const { isLeaveDatePassed, autoRejectExpiredLeaves } = require('../utils/leaveUtils');

// @desc    Apply for leave
// @route   POST /api/leaves/apply
// @access  Private/Employee
exports.applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, totalDays } = req.body;

    // Prevent applying for dates that have already passed
    if (isLeaveDatePassed(startDate, endDate)) {
      return res.status(400).json({ message: 'Cannot apply for leave for dates that have already passed.' });
    }

    // Find employee's manager
    const employee = await User.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'User not found' });

    const leave = await Leave.create({
      user: req.user.id,
      managerId: employee.reportingManager,
      leaveType: leaveType.toLowerCase(),
      startDate,
      endDate,
      reason,
      totalDays: totalDays || 1,
      status: 'pending'
    });
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.status(201).json(leave);
  } catch (error) {
    console.error('Apply Leave Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get manager's pending leaves
// @route   GET /api/leaves/manager
// @access  Private/Manager
exports.getManagerLeaves = async (req, res) => {
  try {
    const io = req.app.get('io');
    await autoRejectExpiredLeaves(io);

    const leaves = await Leave.find({
      managerId: req.user.id,
      status: 'pending'
    }).populate('user', 'name email profile');
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Manager Approve (FINAL)
// @route   PUT /api/leaves/manager-approve/:id
// @access  Private/Manager
exports.managerApprove = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    if (leave.managerId && leave.managerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to approve this leave' });
    }

    const io = req.app.get('io');

    // Auto-reject if the leave date has already passed
    if (isLeaveDatePassed(leave.startDate, leave.endDate)) {
      leave.status = 'rejected';
      leave.rejectionReason = 'Auto-rejected: Leave period expired (date passed without approval)';
      await leave.save();
      if (io) {
        io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
      }
      return res.status(400).json({ message: 'Cannot approve leave request. The requested leave date has already passed.' });
    }

    leave.status = 'approved';
    await leave.save();
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get HR's approved leaves (for tracking)
// @route   GET /api/leaves/hr
// @access  Private/HR
exports.getHRLeaves = async (req, res) => {
  try {
    const io = req.app.get('io');
    await autoRejectExpiredLeaves(io);

    const leaves = await Leave.find({
      status: 'approved'
    }).populate('user', 'name email profile')
      .populate('managerId', 'name email');
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    HR Direct Approve (Alternative)
// @route   PUT /api/leaves/hr-approve/:id
// @access  Private/HR
exports.hrApprove = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    const io = req.app.get('io');

    // Auto-reject if the leave date has already passed
    if (isLeaveDatePassed(leave.startDate, leave.endDate)) {
      leave.status = 'rejected';
      leave.rejectionReason = 'Auto-rejected: Leave period expired (date passed without approval)';
      await leave.save();
      if (io) {
        io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
      }
      return res.status(400).json({ message: 'Cannot approve leave request. The requested leave date has already passed.' });
    }

    leave.status = 'approved';
    leave.hrId = req.user.id;
    await leave.save();
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject Leave
// @route   PUT /api/leaves/reject/:id
// @access  Private/Manager/HR
exports.rejectLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    leave.status = 'rejected';
    if (req.body.reason || req.body.rejectionReason) {
      leave.rejectionReason = req.body.reason || req.body.rejectionReason;
    }
    await leave.save();
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel Leave
// @route   PUT /api/leaves/cancel/:id
// @access  Private/Employee
exports.cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    // Verify ownership
    if (leave.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this request' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot cancel an already processed request' });
    }

    leave.status = 'cancelled';
    await leave.save();
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my leaves
// @route   GET /api/leaves/my
// @access  Private/Employee
exports.getMyLeaves = async (req, res) => {
  try {
    const io = req.app.get('io');
    await autoRejectExpiredLeaves(io);

    const leaves = await Leave.find({ user: req.user.id });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all leaves (Admin)
// @route   GET /api/leaves
// @access  Private/Admin
exports.getAllLeaves = async (req, res) => {
  try {
    const io = req.app.get('io');
    await autoRejectExpiredLeaves(io);

    const leaves = await Leave.find().populate('user', 'name email profile');
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
