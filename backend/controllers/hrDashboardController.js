const Employee = require('../models/Employee');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const LeaveBalance = require('../models/LeaveBalance');
const mongoose = require('mongoose');
const { autoRejectExpiredLeaves } = require('../utils/leaveUtils');

exports.getDashboardStats = async (req, res) => {
  try {
    const io = req.app.get('io');
    await autoRejectExpiredLeaves(io);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    // 1. Employee Stats
    const totalEmployees = await Employee.countDocuments({});
    const activeEmployeesCount = await Employee.countDocuments({ status: { $in: ['active', 'Active'] } });
    const newJoinersThisMonth = await Employee.countDocuments({ joinDate: { $gte: startOfMonth } });

    // 2. Leave Stats
    const pendingLeaveApprovals = await Leave.countDocuments({ status: { $regex: /^pending$/i } });
    const employeesOnLeaveToday = await Leave.countDocuments({
      status: { $regex: /^approved$/i },
      startDate: { $lte: endOfToday },
      endDate: { $gte: startOfToday }
    });

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const allLeavesList = await Leave.find({});

    const calcLeaveMetrics = (leaves) => {
      let total = leaves.length;
      let approved = 0;
      let rejected = 0;
      let cancelled = 0;
      let pending = 0;
      leaves.forEach(l => {
        const s = (l.status || '').toLowerCase();
        if (s === 'approved') approved++;
        else if (s === 'rejected') rejected++;
        else if (s === 'cancelled' || s === 'canceled') cancelled++;
        else if (s === 'pending') pending++;
      });
      return { total, approved, rejected, cancelled, pending };
    };

    const filterLeavesByDate = (start, end) => {
      return allLeavesList.filter(l => {
        const s = new Date(l.startDate);
        const e = new Date(l.endDate);
        const c = new Date(l.createdAt);
        return (s <= end && e >= start) || (c >= start && c <= end);
      });
    };

    const statsToday = calcLeaveMetrics(filterLeavesByDate(startOfToday, endOfToday));
    const statsThisWeek = calcLeaveMetrics(filterLeavesByDate(startOfWeek, endOfWeek));
    const statsThisMonth = calcLeaveMetrics(filterLeavesByDate(startOfMonth, endOfMonth));
    const statsThisYear = calcLeaveMetrics(filterLeavesByDate(startOfYear, endOfYear));
    const statsAllTime = calcLeaveMetrics(allLeavesList);

    // 3. Jobs Stats
    const openPositions = await Job.countDocuments({ status: { $regex: /^open$/i } });

    // 4. Payroll Summary
    const payrollStats = await Payroll.aggregate([
      { $match: { month: now.toLocaleString('default', { month: 'long', year: 'numeric' }) } },
      { $group: { _id: { $toLower: '$status' }, total: { $sum: '$netSalary' } } }
    ]);

    let processedPayroll = 0;
    let pendingPayroll = 0;
    payrollStats.forEach(stat => {
      if (stat._id === 'paid' || stat._id === 'processed') processedPayroll += stat.total;
      else pendingPayroll += stat.total;
    });

    // 5. Attendance Overview (Current Week: Mon - Sun)
    const attPeriod = req.query.attPeriod || 'This Week';
    const currentDayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 for Mon, 6 for Sun
    const startOfCurrentWeek = new Date(startOfToday);
    startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - currentDayOfWeek);
    
    if (attPeriod === 'Last Week') {
      startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - 7);
    }

    const startOfCurrentWeekStr = startOfCurrentWeek.toISOString().split('T')[0];

    const attRecords = await Attendance.aggregate([
      { $match: { date: { $gte: startOfCurrentWeekStr } } },
      {
        $group: {
          _id: "$date",
          present: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "late"] }, 1, 0] } },
          halfDay: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "half day"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const attendanceOverview = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfCurrentWeek);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const match = attRecords.find(r => r._id === dStr);

      let present = match ? match.present : 0;
      let absent = match ? match.absent : 0;
      let late = match ? match.late : 0;
      let halfDay = match ? match.halfDay : 0;

      attendanceOverview.push({
        name: weekDays[i],
        present,
        absent,
        late,
        halfDay
      });
    }

    // 6. Department & Gender Distribution
    const employees = await Employee.find().populate('userId');
    const departmentDistribution = {};
    const genderDistribution = {};

    employees.forEach(emp => {
      const role = emp.userId?.role || 'employee';
      const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
      departmentDistribution[formattedRole] = (departmentDistribution[formattedRole] || 0) + 1;

      const gen = emp.gender || 'Unknown';
      genderDistribution[gen] = (genderDistribution[gen] || 0) + 1;
    });

    const deptChart = Object.keys(departmentDistribution).map(k => ({
      name: k, value: departmentDistribution[k]
    }));
    const genderChart = Object.keys(genderDistribution).map(k => ({
      name: k, value: genderDistribution[k]
    }));

    // 7. Recent Joiners
    const recentJoiners = await Employee.find().sort({ joinDate: -1 }).limit(5).populate('userId', 'name email profile');

    // 8. Pending Approvals (Leaves)
    const currentUser = await User.findById(req.user.id);
    let pendingLeaveQuery = { status: { $regex: /^pending$/i } };
    
    if (currentUser.role === 'hr') {
      const allowedUsers = await User.find({ role: { $nin: ['admin', 'manager'] } }).select('_id');
      pendingLeaveQuery.user = { $in: allowedUsers.map(u => u._id) };
    } else if (currentUser.role === 'manager') {
      const allowedUsers = await User.find({ role: 'employee' }).select('_id');
      pendingLeaveQuery.user = { $in: allowedUsers.map(u => u._id) };
    }

    const pendingLeaves = await Leave.find(pendingLeaveQuery)
      .populate('user', 'name email role employeeId profileImage')
      .sort({ createdAt: -1 })
      .limit(10);

    // 9. Announcements & Latest Notifications from Database
    const rawAnnouncements = await Notification.find({
      $or: [
        { type: { $in: ['announcement', 'general', 'emergency', 'task', 'broadcast'] } },
        { userId: req.user.id },
        { senderId: req.user.id },
        { type: { $exists: false } }
      ]
    })
      .populate('senderId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();

    const announcements = [];
    const seenBatches = new Set();
    for (const item of rawAnnouncements) {
      if (item.type === 'birthday' || item.type === 'anniversary') continue;
      const key = item.batchId || String(item._id);
      if (!seenBatches.has(key)) {
        seenBatches.add(key);
        const sName = item.senderName || (item.senderId && typeof item.senderId === 'object' ? item.senderId.name : null) || (item.senderRole === 'admin' ? 'Admin' : 'HR Manager');
        const sRole = item.senderRole || (item.senderId && typeof item.senderId === 'object' ? item.senderId.role : null) || 'HR / Management';
        announcements.push({
          ...item,
          senderName: sName,
          senderRole: sRole
        });
      }
      if (announcements.length >= 3) break;
    }

    // 10. Birthdays & Anniversaries (Upcoming in 30 days)
    const upcomingCelebrations = [];
    const activeEmps = await Employee.find({ status: { $in: ['active', 'Active'] } }).populate('userId', 'name profile email role');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of day for accurate day diff

    const wishesToday = await Notification.find({
      senderId: req.user.id,
      type: { $in: ['birthday', 'anniversary'] },
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    }).select('userId type');

    const wishedSet = new Set(wishesToday.map(w => `${w.type}-${String(w.userId)}`));

    activeEmps.forEach(emp => {
      const uId = emp.userId?._id || emp.userId;
      // Check Birthday
      if (emp.dob) {
        let nextBirthday = new Date(today.getFullYear(), emp.dob.getMonth(), emp.dob.getDate());
        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1);
        }
        const diffDays = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          const isToday = diffDays === 0;
          const isWished = isToday ? wishedSet.has(`birthday-${String(uId)}`) : false;
          upcomingCelebrations.push({
            _id: `bday-${emp._id}`,
            employeeId: emp._id,
            userId: uId,
            name: emp.fullName || emp.userId?.name,
            profileImage: emp.profileImage,
            email: emp.email || emp.userId?.email,
            role: emp.role || emp.designation || 'Employee',
            type: 'Birthday',
            date: nextBirthday,
            diffDays,
            isToday,
            isWished
          });
        }
      }

      // Check Work Anniversary
      if (emp.joinDate) {
        let nextAnniversary = new Date(today.getFullYear(), emp.joinDate.getMonth(), emp.joinDate.getDate());
        if (nextAnniversary < today) {
          nextAnniversary.setFullYear(today.getFullYear() + 1);
        }
        const diffDays = Math.ceil((nextAnniversary - today) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          const years = nextAnniversary.getFullYear() - new Date(emp.joinDate).getFullYear();
          if (years > 0) {
            const isToday = diffDays === 0;
            const isWished = isToday ? wishedSet.has(`anniversary-${String(uId)}`) : false;
            upcomingCelebrations.push({
              _id: `anniv-${emp._id}`,
              employeeId: emp._id,
              userId: uId,
              name: emp.fullName || emp.userId?.name,
              profileImage: emp.profileImage,
              email: emp.email || emp.userId?.email,
              role: emp.role || emp.designation || 'Employee',
              type: `${years} Yr Anniversary`,
              date: nextAnniversary,
              diffDays,
              isToday,
              isWished
            });
          }
        }
      }
    });

    upcomingCelebrations.sort((a, b) => a.diffDays - b.diffDays);
    const topCelebrations = upcomingCelebrations.slice(0, 5);

    // 11. Calculate Quick Stats
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const upcomingHolidaysCount = await Holiday.countDocuments({
      date: { $gte: now, $lte: thirtyDaysFromNow }
    });

    const currentMonthBalances = await LeaveBalance.find({ month: now.getMonth() + 1, year: now.getFullYear() });
    let totalAllocatedDays = 0;
    currentMonthBalances.forEach(b => {
      totalAllocatedDays += (b.earnedLeave || 0) + (b.sickLeave || 0) + (b.casualLeave || 0) + (b.compOff || 0) + (b.otherLeaves || 0);
    });

    const compOffsApproved = await Leave.countDocuments({
      leaveType: { $regex: /comp/i },
      status: { $regex: /^approved$/i },
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const encashmentsPending = await Leave.countDocuments({
      leaveType: { $regex: /encashment/i },
      status: { $regex: /^pending$/i },
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const AuditLog = require('../models/AuditLog');
    const leaveAdjustments = await AuditLog.countDocuments({
      action: { $regex: /adjust/i },
      timestamp: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // 12. Compile the response
    res.json({
      success: true,
      data: {
        stats: {
          totalEmployees,
          activeEmployees: activeEmployeesCount,
          activeEmployeesPercent: totalEmployees > 0 ? ((activeEmployeesCount / totalEmployees) * 100).toFixed(2) : 0,
          newJoiners: newJoinersThisMonth,
          employeesOnLeave: employeesOnLeaveToday,
          employeesOnLeavePercent: totalEmployees > 0 ? ((employeesOnLeaveToday / totalEmployees) * 100).toFixed(2) : 0,
          pendingLeaveApprovals,
          openPositions,
          leaveBalanceAllocated: totalAllocatedDays,
          upcomingHolidays: upcomingHolidaysCount,
          quickStats: {
            bulkAllocationDays: totalAllocatedDays,
            importedEmployees: newJoinersThisMonth,
            leaveAdjustments,
            compOffsApproved,
            encashmentsPending
          }
        },
        charts: {
          attendanceOverview,
          departmentDistribution: deptChart,
          genderDistribution: genderChart
        },
        leaveOverview: {
          total: statsThisMonth.total,
          approved: statsThisMonth.approved,
          rejected: statsThisMonth.rejected,
          cancelled: statsThisMonth.cancelled,
          pending: statsThisMonth.pending,
          byPeriod: {
            'This Month': statsThisMonth,
            'This Week': statsThisWeek,
            'This Year': statsThisYear,
            'All Time': statsAllTime,
            'Today': statsToday
          }
        },
        payrollSummary: {
          processed: processedPayroll,
          pending: pendingPayroll,
          total: processedPayroll + pendingPayroll
        },
        recentJoiners: recentJoiners.map(r => ({
          _id: r._id,
          name: r.fullName || r.userId?.name,
          role: r.role,
          joinDate: r.joinDate,
          profileImage: r.profileImage || r.userId?.profile?.avatar
        })),
        pendingApprovals: pendingLeaves.map(l => {
          const diffDays = Math.max(1, Math.round((new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1);
          return {
            _id: l._id,
            type: 'Leave Request',
            subType: l.leaveType,
            name: l.user?.name || 'Employee',
            email: l.user?.email || '',
            role: l.user?.role || 'employee',
            employeeId: l.user?.employeeId || '',
            profileImage: l.user?.profileImage || '',
            startDate: l.startDate,
            endDate: l.endDate,
            totalDays: l.totalDays || diffDays,
            reason: l.reason || 'No reason provided',
            status: l.status || 'pending',
            date: l.createdAt,
            details: `${new Date(l.startDate).toLocaleDateString()} - ${new Date(l.endDate).toLocaleDateString()}`
          };
        }),
        announcements,
        upcomingCelebrations: topCelebrations
      }
    });
  } catch (error) {
    console.error('HR Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard data' });
  }
};

exports.getLeaveAllocations = async (req, res) => {
  try {
    const { filter } = req.query;
    let query = {};
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    if (filter === 'this_month') {
      query = { month: currentMonth, year: currentYear };
    } else if (filter === 'last_month') {
      const targetMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const targetYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      query = { month: targetMonth, year: targetYear };
    } else if (filter === 'last_2_months') {
      const targetMonth1 = currentMonth === 1 ? 12 : currentMonth - 1;
      const targetYear1 = currentMonth === 1 ? currentYear - 1 : currentYear;
      const targetMonth2 = targetMonth1 === 1 ? 12 : targetMonth1 - 1;
      const targetYear2 = targetMonth1 === 1 ? targetYear1 - 1 : targetYear1;
      query = {
        $or: [
          { month: targetMonth1, year: targetYear1 },
          { month: targetMonth2, year: targetYear2 }
        ]
      };
    } else if (filter === 'this_year') {
      query = { year: currentYear };
    }

    const balances = await LeaveBalance.find(query);
    let totalEL = 0, totalSL = 0, totalCL = 0, totalCO = 0, totalOther = 0;
    balances.forEach(b => {
      totalEL += b.earnedLeave || 0;
      totalSL += b.sickLeave || 0;
      totalCL += b.casualLeave || 0;
      totalCO += b.compOff || 0;
      totalOther += b.otherLeaves || 0;
    });

    const total = totalEL + totalSL + totalCL + totalCO + totalOther;

    res.json({
      success: true,
      data: [
        { name: 'Earned Leave (EL)', value: totalEL, color: '#059669' },
        { name: 'Sick Leave (SL)', value: totalSL, color: '#2563eb' },
        { name: 'Casual Leave (CL)', value: totalCL, color: '#ea580c' },
        { name: 'Comp Off (CO)', value: totalCO, color: '#7c3aed' },
        { name: 'Other Leaves', value: totalOther, color: '#ec4899' }
      ],
      totalDays: total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const CompanyShutdown = require('../models/CompanyShutdown');
exports.getCompanyShutdowns = async (req, res) => {
  try {
    const shutdowns = await CompanyShutdown.find().sort({ startDate: 1 });
    res.json({ success: true, data: shutdowns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAttendanceReconciliation = async (req, res) => {
  try {
    const employees = await Employee.find({ status: { $in: ['active', 'Active'] } }).populate('userId');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const userIds = employees.map(e => e.userId?._id).filter(Boolean);

    const attRecords = await Attendance.find({
      user: { $in: userIds },
      date: { $gte: startOfMonth }
    });

    const reconciledSet = new Set(attRecords.map(a => String(a.user)));

    const deptMap = {};

    employees.forEach(emp => {
      const role = emp.userId?.role || 'employee';
      const deptName = role.charAt(0).toUpperCase() + role.slice(1);
      
      if (!deptMap[deptName]) {
        deptMap[deptName] = { dept: deptName, total: 0, reconciled: 0, pending: 0, status: '' };
      }

      deptMap[deptName].total++;

      const isReconciled = reconciledSet.has(String(emp.userId?._id));
      if (isReconciled) {
        deptMap[deptName].reconciled++;
      } else {
        deptMap[deptName].pending++;
      }
    });

    const data = Object.values(deptMap).map(d => {
      if (d.pending === 0 && d.total > 0) d.status = 'Completed';
      else if (d.reconciled === 0) d.status = 'Pending';
      else d.status = 'In Progress';
      return d;
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLeaveAudits = async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    
    // Fetch real audit logs for the Leave module
    const logs = await AuditLog.find({ 
      $or: [
        { module: { $regex: /leave/i } },
        { action: { $regex: /leave/i } }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(5);
    
    // Format them for the frontend
    const formattedLogs = logs.map(log => {
      // Calculate time ago string
      const seconds = Math.floor((new Date() - new Date(log.timestamp)) / 1000);
      let timeStr = 'Just now';
      if (seconds > 86400) timeStr = Math.floor(seconds / 86400) + ' days ago';
      else if (seconds > 3600) timeStr = Math.floor(seconds / 3600) + ' hours ago';
      else if (seconds > 60) timeStr = Math.floor(seconds / 60) + ' minutes ago';

      let displayStatus = 'Completed';
      if (log.status === 'Warning' || log.status === 'Failed') displayStatus = 'Issues Found';
      else if (log.action.includes('Processing')) displayStatus = 'In Progress';

      return {
        img: `https://ui-avatars.com/api/?name=${encodeURIComponent(log.userName)}&background=random`,
        text: log.description,
        time: timeStr,
        status: displayStatus
      };
    });

    res.json({ success: true, data: formattedLogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
