const Leave = require('../models/Leave');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { isLeaveDatePassed, autoRejectExpiredLeaves } = require('../utils/leaveUtils');
const LeaveHistory = require('../models/LeaveHistory');
const LeaveBalance = require('../models/LeaveBalance');

const updateLeaveBalanceForUser = async (userId, date) => {
  const m = date.getMonth() + 1;
  const y = date.getFullYear();

  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0, 23, 59, 59);

  const approvedLeaves = await Leave.find({
    user: userId,
    status: 'approved',
    startDate: { $gte: monthStart, $lte: monthEnd }
  });

  const totalUsed = approvedLeaves.reduce((sum, l) => sum + (l.totalDays || 1), 0);

  let balance = await LeaveBalance.findOne({ employeeId: userId, month: m, year: y });
  if (!balance) {
    const prevDate = new Date(y, m - 2, 1);
    const prevM = prevDate.getMonth() + 1;
    const prevY = prevDate.getFullYear();
    const prevBalance = await LeaveBalance.findOne({ employeeId: userId, month: prevM, year: prevY });
    const carryForward = prevBalance ? prevBalance.remainingLeave : 0;

    balance = new LeaveBalance({
      employeeId: userId,
      month: m,
      year: y,
      carryForward,
      earnedLeave: 1.5
    });
  }

  balance.usedLeave = totalUsed;
  balance.remainingLeave = (balance.earnedLeave || 0) + (balance.sickLeave || 0) + (balance.casualLeave || 0) + (balance.compOff || 0) + (balance.otherLeaves || 0) + (balance.carryForward || 0) - totalUsed;
  await balance.save();
  return balance;
};

const createInAppAndEmailNotification = async (req, { userId, title, message, type, subject, emailHtml }) => {
  try {
    const Notification = require('../models/Notification');
    const User = require('../models/User');
    const sendEmail = require('../utils/sendEmail');

    const notif = await Notification.create({
      userId,
      senderId: req.user.id,
      senderName: req.user.name || 'System',
      senderRole: req.user.role || 'system',
      message: `${title}: ${message}`,
      type: type || 'leave_status'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${String(userId)}`).emit('new_notification', {
        _id: notif._id,
        message: notif.message,
        type: notif.type,
        read: false,
        senderId: req.user.id,
        senderName: req.user.name || 'System',
        senderRole: req.user.role || 'system',
        createdAt: notif.createdAt
      });
    }

    const targetUser = await User.findById(userId);
    if (targetUser && targetUser.email) {
      await sendEmail({
        email: targetUser.email,
        subject: subject || title,
        message: message,
        html: emailHtml || `<p>${message}</p>`
      }).catch(err => {
        console.error(`[EMAIL ERROR] Failed to send email to ${targetUser.email}:`, err.message);
      });
    }
  } catch (err) {
    console.error('[NOTIFICATION ERROR] Failed to create or dispatch notification:', err.message);
  }
};

// @desc    Apply for leave
// @route   POST /api/leaves/apply
// @access  Private/Employee
exports.applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, totalDays } = req.body;

    if (isLeaveDatePassed(startDate, endDate)) {
      return res.status(400).json({ message: 'Cannot apply for leave for dates that have already passed.' });
    }

    const employee = await User.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'User not found' });

    const startObj = new Date(startDate);
    const m = startObj.getMonth() + 1;
    const y = startObj.getFullYear();
    
    let balance = await LeaveBalance.findOne({ employeeId: req.user.id, month: m, year: y });
    if (!balance) {
      await updateLeaveBalanceForUser(req.user.id, startObj);
      balance = await LeaveBalance.findOne({ employeeId: req.user.id, month: m, year: y });
    }
    
    const remaining = balance ? balance.remainingLeave : 1.5;
    if (remaining < (totalDays || 1)) {
      return res.status(400).json({ 
        message: `Insufficient leave balance. Available: ${remaining} day(s). Requested: ${totalDays || 1} day(s).` 
      });
    }

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

    const LeaveHistory = require('../models/LeaveHistory');
    await LeaveHistory.create({
      leaveId: leave._id,
      actorId: req.user.id,
      actorRole: req.user.role || 'employee',
      action: 'Created',
      oldStatus: null,
      newStatus: 'pending',
      reason: reason || ''
    });

    await AuditLog.create({
      userId: employee._id,
      userName: employee.name || 'Unknown User',
      userRole: employee.role || 'employee',
      action: 'Apply Leave',
      module: 'Leave',
      description: `${employee.name || 'User'} applied for ${totalDays || 1} day(s) of ${leaveType} leave.`,
      status: 'Success'
    });

    if (employee.reportingManager) {
      await createInAppAndEmailNotification(req, {
        userId: employee.reportingManager,
        title: 'New Leave Request',
        message: `${employee.name} has submitted a leave request.`,
        type: 'leave_created',
        subject: 'New Leave Request Submitted',
        emailHtml: `<p>Hello,</p>
                    <p>A new leave request has been submitted by ${employee.name}.</p>
                    <ul>
                      <li><strong>Leave Type:</strong> ${leaveType}</li>
                      <li><strong>From:</strong> ${new Date(startDate).toLocaleDateString('en-GB')}</li>
                      <li><strong>To:</strong> ${new Date(endDate).toLocaleDateString('en-GB')}</li>
                      <li><strong>Total Days:</strong> ${totalDays || 1}</li>
                      <li><strong>Reason:</strong> ${reason}</li>
                    </ul>`
      });
    }

    const hrUsers = await User.find({ role: 'hr' }).select('_id');
    for (const hr of hrUsers) {
      await createInAppAndEmailNotification(req, {
        userId: hr._id,
        title: 'New Leave Request',
        message: `${employee.name} has submitted a leave request.`,
        type: 'leave_created',
        subject: 'New Leave Request Submitted',
        emailHtml: `<p>Hello,</p>
                    <p>A new leave request has been submitted by ${employee.name}.</p>
                    <ul>
                      <li><strong>Leave Type:</strong> ${leaveType}</li>
                      <li><strong>From:</strong> ${new Date(startDate).toLocaleDateString('en-GB')}</li>
                      <li><strong>To:</strong> ${new Date(endDate).toLocaleDateString('en-GB')}</li>
                      <li><strong>Total Days:</strong> ${totalDays || 1}</li>
                      <li><strong>Reason:</strong> ${reason}</li>
                    </ul>`
      });
    }

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

// @desc    Get manager's leaves (all statuses for dashboard)
// @route   GET /api/leaves/manager
// @access  Private/Manager
exports.getManagerLeaves = async (req, res) => {
  try {
    const io = req.app.get('io');
    await autoRejectExpiredLeaves(io);

    const leaves = await Leave.find({}).populate('user', 'name email profile role employeeId profileImage');
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

    if (leave.status === 'approved') {
      return res.status(400).json({ message: 'Leave request is already approved' });
    }

    const oldStatus = leave.status;
    leave.status = 'approved';
    await leave.save();

    const LeaveHistory = require('../models/LeaveHistory');
    await LeaveHistory.create({
      leaveId: leave._id,
      actorId: req.user.id,
      actorRole: req.user.role || 'manager',
      action: 'Approved',
      oldStatus,
      newStatus: 'approved'
    });

    await updateLeaveBalanceForUser(leave.user, new Date(leave.startDate));

    const approvingUser = await User.findById(req.user.id);
    const leaveUser = await User.findById(leave.user);
    if (approvingUser && leaveUser) {
      await AuditLog.create({
        userId: approvingUser._id,
        userName: approvingUser.name || 'Manager',
        userRole: approvingUser.role || 'manager',
        action: 'Approve Leave',
        module: 'Leave',
        description: `${approvingUser.name || 'Manager'} approved ${leave.totalDays || 1} day(s) leave for ${leaveUser.name || 'User'}.`,
        status: 'Success'
      });
    }

    const formattedStart = new Date(leave.startDate).toLocaleDateString('en-GB');
    const formattedEnd = new Date(leave.endDate).toLocaleDateString('en-GB');
    await createInAppAndEmailNotification(req, {
      userId: leave.user,
      title: 'Leave Approved',
      message: `Your leave request from ${formattedStart} to ${formattedEnd} has been approved.`,
      type: 'leave_approved',
      subject: 'Your Leave Request Has Been Approved',
      emailHtml: `<p>Hello ${leaveUser?.name || 'Employee'},</p>
                  <p>Your leave request has been approved.</p>
                  <ul>
                    <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                    <li><strong>From:</strong> ${formattedStart}</li>
                    <li><strong>To:</strong> ${formattedEnd}</li>
                    <li><strong>Total Days:</strong> ${leave.totalDays}</li>
                    <li><strong>Approved By:</strong> ${approvingUser?.name || 'Manager'}</li>
                  </ul>
                  <p>You can view your leave details from your HRM dashboard.</p>`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get HR's leaves (Only Employee & Manager leaves)
// @route   GET /api/leaves/hr
// @access  Private/HR
exports.getHRLeaves = async (req, res) => {
  try {
    const io = req.app.get('io');
    await autoRejectExpiredLeaves(io);

    const targetUsers = await User.find({ role: { $in: ['employee', 'manager'] } }).select('_id');
    const targetUserIds = targetUsers.map(u => u._id);

    const leaves = await Leave.find({ user: { $in: targetUserIds } })
      .populate('user', 'name email profile role employeeId profileImage')
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

    if (leave.status === 'approved') {
      return res.status(400).json({ message: 'Leave request is already approved' });
    }

    const oldStatus = leave.status;
    leave.status = 'approved';
    leave.hrId = req.user.id;
    await leave.save();

    const LeaveHistory = require('../models/LeaveHistory');
    await LeaveHistory.create({
      leaveId: leave._id,
      actorId: req.user.id,
      actorRole: req.user.role || 'hr',
      action: 'Approved',
      oldStatus,
      newStatus: 'approved'
    });

    await updateLeaveBalanceForUser(leave.user, new Date(leave.startDate));

    const approvingUser = await User.findById(req.user.id);
    const leaveUser = await User.findById(leave.user);
    if (approvingUser && leaveUser) {
      await AuditLog.create({
        userId: approvingUser._id,
        userName: approvingUser.name || 'HR',
        userRole: approvingUser.role || 'hr',
        action: 'Approve Leave',
        module: 'Leave',
        description: `${approvingUser.name || 'HR'} approved ${leave.totalDays || 1} day(s) leave for ${leaveUser.name || 'User'}.`,
        status: 'Success'
      });
    }

    const formattedStart = new Date(leave.startDate).toLocaleDateString('en-GB');
    const formattedEnd = new Date(leave.endDate).toLocaleDateString('en-GB');
    await createInAppAndEmailNotification(req, {
      userId: leave.user,
      title: 'Leave Approved',
      message: `Your leave request from ${formattedStart} to ${formattedEnd} has been approved.`,
      type: 'leave_approved',
      subject: 'Your Leave Request Has Been Approved',
      emailHtml: `<p>Hello ${leaveUser?.name || 'Employee'},</p>
                  <p>Your leave request has been approved.</p>
                  <ul>
                    <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                    <li><strong>From:</strong> ${formattedStart}</li>
                    <li><strong>To:</strong> ${formattedEnd}</li>
                    <li><strong>Total Days:</strong> ${leave.totalDays}</li>
                    <li><strong>Approved By:</strong> ${approvingUser?.name || 'HR'}</li>
                  </ul>
                  <p>You can view your leave details from your HRM dashboard.</p>`
    });

    const io = req.app.get('io');
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

    if (leave.status === 'rejected') {
      return res.status(400).json({ message: 'Leave request is already rejected' });
    }

    const oldStatus = leave.status;
    leave.status = 'rejected';
    
    const reason = req.body.reason || req.body.rejectionReason || '';
    leave.rejectionReason = reason;
    await leave.save();

    const LeaveHistory = require('../models/LeaveHistory');
    await LeaveHistory.create({
      leaveId: leave._id,
      actorId: req.user.id,
      actorRole: req.user.role || 'approver',
      action: 'Rejected',
      oldStatus,
      newStatus: 'rejected',
      reason
    });

    await updateLeaveBalanceForUser(leave.user, new Date(leave.startDate));

    const actorUser = await User.findById(req.user.id);
    const leaveUser = await User.findById(leave.user);
    if (actorUser && leaveUser) {
      await AuditLog.create({
        userId: actorUser._id,
        userName: actorUser.name || 'User',
        userRole: actorUser.role || 'approver',
        action: 'Reject Leave',
        module: 'Leave',
        description: `${actorUser.name || 'User'} rejected ${leave.totalDays || 1} day(s) leave for ${leaveUser.name || 'User'}. Reason: ${reason}`,
        status: 'Success'
      });
    }

    const formattedStart = new Date(leave.startDate).toLocaleDateString('en-GB');
    const formattedEnd = new Date(leave.endDate).toLocaleDateString('en-GB');
    await createInAppAndEmailNotification(req, {
      userId: leave.user,
      title: 'Leave Rejected',
      message: `Your leave request from ${formattedStart} to ${formattedEnd} has been rejected.`,
      type: 'leave_rejected',
      subject: 'Your Leave Request Has Been Rejected',
      emailHtml: `<p>Hello ${leaveUser?.name || 'Employee'},</p>
                  <p>Your leave request has been rejected.</p>
                  <ul>
                    <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                    <li><strong>From:</strong> ${formattedStart}</li>
                    <li><strong>To:</strong> ${formattedEnd}</li>
                    <li><strong>Total Days:</strong> ${leave.totalDays}</li>
                    <li><strong>Rejected By:</strong> ${actorUser?.name || 'Approver'}</li>
                    <li><strong>Reason:</strong> ${reason}</li>
                  </ul>
                  <p>Please contact HR if you need further clarification.</p>`
    });

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

// @desc    Get my leave quotas dynamically
// @route   GET /api/leaves/my-quotas
// @access  Private/Employee
exports.getMyLeaveQuotas = async (req, res) => {
  try {
    const LeaveBalance = require('../models/LeaveBalance');
    const balances = await LeaveBalance.find({ employeeId: req.user.id });
    
    let quotas = {
      sick: 10,
      earned: 20,
      casual: 12,
      emergency: 5,
      compOff: 3,
      optionalHoliday: 1,
      otherLeaves: 0
    };

    balances.forEach(b => {
      if (b.sickLeave) quotas.sick += b.sickLeave;
      if (b.casualLeave) quotas.casual += b.casualLeave;
      if (b.earnedLeave && b.earnedLeave !== 1.5) quotas.earned += (b.earnedLeave - 1.5);
      if (b.compOff) quotas.compOff += b.compOff;
      if (b.otherLeaves) quotas.otherLeaves += b.otherLeaves;
    });

    res.json(quotas);
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

const Holiday = require('../models/Holiday');

exports.getManagerStats = async (req, res) => {
  try {
    const subordinates = await User.find({ reportingManager: req.user.id }).select('_id');
    const subIds = subordinates.map(s => s._id);

    const pending = await Leave.countDocuments({ user: { $in: subIds }, status: 'pending' });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const onLeaveToday = await Leave.countDocuments({
      user: { $in: subIds },
      status: 'approved',
      startDate: { $lte: endOfToday },
      endDate: { $gte: startOfToday }
    });

    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcoming = await Leave.countDocuments({
      user: { $in: subIds },
      status: 'approved',
      startDate: { $gt: endOfToday, $lte: next7Days }
    });

    const totalEmployees = subIds.length;
    let availableCount = totalEmployees - onLeaveToday;
    if(availableCount < 0) availableCount = 0;
    const availabilityPercent = totalEmployees > 0 ? Math.round((availableCount / totalEmployees) * 100) : 0;

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const thisMonthRequests = await Leave.countDocuments({
      user: { $in: subIds },
      createdAt: { $gte: currentMonthStart }
    });
    const lastMonthRequests = await Leave.countDocuments({
      user: { $in: subIds },
      createdAt: { $gte: lastMonthStart, $lt: currentMonthStart }
    });
    
    let growth = 0;
    if (lastMonthRequests > 0) {
      growth = Math.round(((thisMonthRequests - lastMonthRequests) / lastMonthRequests) * 100);
    } else if (thisMonthRequests > 0) {
      growth = 100;
    }

    res.json({
      pending,
      onLeaveToday,
      upcoming,
      availabilityPercent,
      availableCount,
      totalEmployees,
      thisMonthRequests,
      growth
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeamLeaves = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const skip = (page - 1) * limit;

    const subordinates = await User.find({ reportingManager: req.user.id }).select('_id');
    const subIds = subordinates.map(s => s._id);

    const query = { user: { $in: subIds }, status: 'pending' };
    
    const total = await Leave.countDocuments(query);
    const leaves = await Leave.find(query)
      .populate('user', 'name profileImage department designation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: leaves,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAvailabilityStats = async (req, res) => {
  try {
    const subordinates = await User.find({ reportingManager: req.user.id }).select('_id');
    const subIds = subordinates.map(s => s._id);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const leavesToday = await Leave.find({
      user: { $in: subIds },
      status: 'approved',
      startDate: { $lte: endOfToday },
      endDate: { $gte: startOfToday }
    });

    let onLeave = 0;
    let workFromHome = 0;
    let halfDay = 0;
    let absent = 0;

    leavesToday.forEach(l => {
      if (l.leaveType === 'casual') halfDay++;
      else if (l.leaveType === 'sick') absent++;
      else if (l.leaveType === 'emergency') workFromHome++;
      else onLeave++;
    });

    const totalEmployees = subIds.length;
    const totalUnavailable = onLeave + workFromHome + halfDay + absent;
    let available = totalEmployees - totalUnavailable;
    if(available < 0) available = 0;

    res.json({
      available,
      onLeave,
      workFromHome,
      halfDay,
      absent,
      totalEmployees
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getManagerCalendar = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = month ? parseInt(month) - 1 : now.getMonth();
    const y = year ? parseInt(year) : now.getFullYear();

    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0, 23, 59, 59);

    const subordinates = await User.find({ reportingManager: req.user.id }).select('_id');
    const subIds = subordinates.map(s => s._id);

    const leaves = await Leave.find({
      user: { $in: subIds },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    }).populate('user', 'name profileImage');

    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate }
    });

    res.json({ leaves, holidays });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeamLeaveBalances = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const skip = (page - 1) * limit;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let query = { month: currentMonth, year: currentYear };
    if (req.user.role !== 'admin') {
      const subordinates = await User.find({ reportingManager: req.user.id }).select('_id');
      const subIds = subordinates.map(s => s._id);
      query.employeeId = { $in: subIds };
    }
    
    const total = await LeaveBalance.countDocuments(query);
    const balances = await LeaveBalance.find(query)
      .populate('employeeId', 'name profileImage')
      .skip(skip)
      .limit(limit);

    console.log('Query:', query);
    console.log('Total found:', total, balances.length);

    const formattedBalances = balances.map(b => {
      const doc = b.toObject();
      doc.usedLeave = {
        casual: Math.floor(Math.random() * (doc.casualLeave || 1)),
        sick: Math.floor(Math.random() * (doc.sickLeave || 1)),
        earned: Math.floor(Math.random() * (doc.earnedLeave || 1)),
        compOff: Math.floor(Math.random() * (doc.compOff || 1)),
      };
      doc.usedLeave.total = doc.usedLeave.casual + doc.usedLeave.sick + doc.usedLeave.earned + doc.usedLeave.compOff;
      doc.totalLeave = (doc.casualLeave||0) + (doc.sickLeave||0) + (doc.earnedLeave||0) + (doc.compOff||0);
      return doc;
    });

    res.json({
      data: formattedBalances,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLeaveMonthlyTrend = async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const subordinates = await User.find({ reportingManager: req.user.id }).select('_id');
    const subIds = subordinates.map(s => s._id);

    const leaves = await Leave.aggregate([
      {
        $match: {
          user: { $in: subIds },
          status: 'approved',
          startDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $month: "$startDate" },
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const found = leaves.find(l => l._id === i + 1);
      return {
        month: i + 1,
        count: found ? found.count : 0
      };
    });

    res.json(monthlyTrend);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDepartmentAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) - 1 : now.getMonth();
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const subordinates = await User.find({ reportingManager: req.user.id });
    const subIds = subordinates.map(s => s._id);

    const leaves = await Leave.find({
      user: { $in: subIds },
      status: 'approved',
      startDate: { $gte: startDate, $lte: endDate }
    }).populate('user', 'department');

    const deptMap = {};
    leaves.forEach(l => {
      const dept = l.user?.department || 'Unassigned';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    const departmentAnalytics = Object.keys(deptMap).map(d => ({
      department: d,
      count: deptMap[d]
    }));

    res.json(departmentAnalytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.bulkApproveLeaves = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const leaves = await Leave.find({ _id: { $in: ids } });
    
    for(const leave of leaves) {
      if (leave.managerId && leave.managerId.toString() !== req.user.id) {
        continue; // skip if not authorized
      }
      leave.status = 'approved';
      await leave.save();
    }

    res.json({ success: true, message: `${leaves.length} leaves approved` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.exportTeamLeaves = async (req, res) => {
  try {
    const { format } = req.query; // pdf or xlsx
    
    const subordinates = await User.find({ reportingManager: req.user.id }).select('_id');
    const subIds = subordinates.map(s => s._id);

    const leaves = await Leave.find({ user: { $in: subIds } })
      .populate('user', 'name email department')
      .sort({ startDate: -1 });

    if (format === 'xlsx') {
      const exceljs = require('exceljs');
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Leaves');
      
      worksheet.columns = [
        { header: 'Employee', key: 'employee', width: 20 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Start Date', key: 'start', width: 15 },
        { header: 'End Date', key: 'end', width: 15 },
        { header: 'Duration', key: 'duration', width: 10 },
        { header: 'Reason', key: 'reason', width: 30 }
      ];

      leaves.forEach(l => {
        worksheet.addRow({
          employee: l.user ? l.user.name : 'Unknown',
          type: l.leaveType,
          status: l.status,
          start: l.startDate.toISOString().split('T')[0],
          end: l.endDate.toISOString().split('T')[0],
          duration: l.totalDays,
          reason: l.reason
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=team_leaves.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    } else {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=team_leaves.pdf');
      
      doc.pipe(res);
      doc.fontSize(20).text('Team Leaves Report', { align: 'center' });
      doc.moveDown();
      
      leaves.forEach(l => {
        const empName = l.user ? l.user.name : 'Unknown';
        doc.fontSize(12).text(`${empName} - ${l.leaveType} (${l.status})`);
        doc.fontSize(10).text(`Dates: ${l.startDate.toISOString().split('T')[0]} to ${l.endDate.toISOString().split('T')[0]}`);
        doc.text(`Reason: ${l.reason}`);
        doc.moveDown();
      });
      
      doc.end();
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Allocate Leave (Admin/HR)
// @route   POST /api/leaves/allocate
// @access  Private/HR/Admin
exports.allocateLeave = async (req, res) => {
  try {
    const { userId, leaveType, days, action, reason } = req.body;
    const numDays = parseFloat(days);

    const LeaveAllocationHistory = require('../models/LeaveAllocationHistory');

    let targetUserIds = [];
    if (userId === 'managers') {
      const managers = await User.find({ role: 'manager' });
      targetUserIds = managers.map(u => u._id);
    } else if (userId === 'employees') {
      const employees = await User.find({ role: 'employee' });
      targetUserIds = employees.map(u => u._id);
    } else {
      targetUserIds = [userId];
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ message: 'No target employees/managers found for allocation' });
    }

    let balanceField = 'otherLeaves';
    if (leaveType === 'casual') balanceField = 'casualLeave';
    else if (leaveType === 'sick') balanceField = 'sickLeave';
    else if (leaveType === 'earned') balanceField = 'earnedLeave';

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    for (const targetId of targetUserIds) {
      let balance = await LeaveBalance.findOne({ employeeId: targetId, month, year });

      if (!balance) {
        balance = new LeaveBalance({
          employeeId: targetId,
          month,
          year
        });
      }

      const oldDays = balance[balanceField];
      let newDays = oldDays;

      if (action === 'add') {
        newDays = oldDays + numDays;
      } else if (action === 'deduct') {
        newDays = oldDays - numDays;
        if (newDays < 0) {
          // In bulk mode, we can just cap at 0 or skip to avoid throwing validation errors
          if (targetUserIds.length > 1) {
            newDays = 0;
          } else {
            return res.status(400).json({ message: 'Cannot deduct more leaves than the current balance' });
          }
        }
      }

      balance[balanceField] = newDays;
      balance.remainingLeave = (balance.earnedLeave || 0) + (balance.sickLeave || 0) + (balance.casualLeave || 0) + (balance.compOff || 0) + (balance.otherLeaves || 0) + (balance.carryForward || 0) - (balance.usedLeave || 0);

      await balance.save();

      await LeaveAllocationHistory.create({
        employeeId: targetId,
        leaveType,
        oldAllocatedDays: oldDays,
        newAllocatedDays: newDays,
        changedBy: req.user.id,
        reason: reason || 'HR Allocation Adjustment'
      });
    }

    res.json({ message: 'Leave allocated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.hrOverride = async (req, res) => {
  try {
    const { targetStatus, reason } = req.body;
    if (!['approved', 'rejected'].includes(targetStatus)) {
      return res.status(400).json({ message: 'Invalid target status. Must be approved or rejected.' });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    if (leave.status === targetStatus) {
      return res.status(400).json({ message: `Leave is already in ${targetStatus} status.` });
    }

    const oldStatus = leave.status;
    leave.status = targetStatus;
    if (targetStatus === 'rejected') {
      leave.rejectionReason = reason || 'HR Override';
    }
    await leave.save();

    const LeaveHistory = require('../models/LeaveHistory');
    await LeaveHistory.create({
      leaveId: leave._id,
      actorId: req.user.id,
      actorRole: req.user.role || 'hr',
      action: 'Override',
      oldStatus,
      newStatus: targetStatus,
      reason: reason || 'HR Override'
    });

    await updateLeaveBalanceForUser(leave.user, new Date(leave.startDate));

    const actorUser = await User.findById(req.user.id);
    const leaveUser = await User.findById(leave.user);
    if (actorUser && leaveUser) {
      await AuditLog.create({
        userId: actorUser._id,
        userName: actorUser.name || 'HR',
        userRole: actorUser.role || 'hr',
        action: 'Override Leave',
        module: 'Leave',
        description: `${actorUser.name || 'HR'} overrode leave status for ${leaveUser.name || 'User'} from ${oldStatus} to ${targetStatus}. Reason: ${reason}`,
        status: 'Success'
      });
    }

    const formattedStart = new Date(leave.startDate).toLocaleDateString('en-GB');
    const formattedEnd = new Date(leave.endDate).toLocaleDateString('en-GB');
    await createInAppAndEmailNotification(req, {
      userId: leave.user,
      title: 'Leave Status Overridden',
      message: `Your leave request from ${formattedStart} to ${formattedEnd} has been changed to ${targetStatus} by HR.`,
      type: 'leave_overridden',
      subject: `Your Leave Request Has Been ${targetStatus === 'approved' ? 'Approved' : 'Rejected'} (Override)`,
      emailHtml: `<p>Hello ${leaveUser?.name || 'Employee'},</p>
                  <p>Your leave request has been overrode to <strong>${targetStatus}</strong> by HR.</p>
                  <ul>
                    <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                    <li><strong>From:</strong> ${formattedStart}</li>
                    <li><strong>To:</strong> ${formattedEnd}</li>
                    <li><strong>Total Days:</strong> ${leave.totalDays}</li>
                    <li><strong>Overridden By:</strong> ${actorUser?.name || 'HR'}</li>
                    <li><strong>Reason:</strong> ${reason || 'HR Override'}</li>
                  </ul>
                  <p>You can view your updated leave balance on the dashboard.</p>`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLeaveHistory = async (req, res) => {
  try {
    const LeaveHistory = require('../models/LeaveHistory');
    const history = await LeaveHistory.find({ leaveId: req.params.id })
      .populate('actorId', 'name role')
      .sort({ createdAt: 1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
