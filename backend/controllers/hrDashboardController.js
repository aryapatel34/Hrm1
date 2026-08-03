const Employee = require('../models/Employee');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const mongoose = require('mongoose');

exports.getDashboardStats = async (req, res) => {
  try {
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

    // 5. Attendance Overview (Last 7 days)
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const attRecords = await Attendance.aggregate([
      { $match: { date: { $gte: sevenDaysAgoStr } } },
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

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const attendanceOverview = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const match = attRecords.find(r => r._id === dStr);
      
      let present = match ? match.present : 0;
      let absent = match ? match.absent : 0;
      let late = match ? match.late : 0;
      let halfDay = match ? match.halfDay : 0;

      attendanceOverview.push({
        name: weekDays[d.getDay()],
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
    const pendingLeaves = await Leave.find({ status: { $regex: /^pending$/i } })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // 9. Announcements
    const announcements = await Notification.find({ type: 'announcement', userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(3);

    // 10. Birthdays & Anniversaries (Upcoming in 30 days)
    const upcomingCelebrations = [];
    const activeEmps = await Employee.find({ status: { $in: ['active', 'Active'] } }).populate('userId', 'name profile');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of day for accurate day diff

    activeEmps.forEach(emp => {
      // Check Birthday
      if (emp.dob) {
        let nextBirthday = new Date(today.getFullYear(), emp.dob.getMonth(), emp.dob.getDate());
        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1);
        }
        const diffDays = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          upcomingCelebrations.push({
            _id: `bday-${emp._id}`,
            name: emp.fullName || emp.userId?.name,
            profileImage: emp.profileImage,
            type: 'Birthday',
            date: nextBirthday,
            diffDays
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
            upcomingCelebrations.push({
              _id: `anniv-${emp._id}`,
              name: emp.fullName || emp.userId?.name,
              profileImage: emp.profileImage,
              type: `${years} Yr Anniversary`,
              date: nextAnniversary,
              diffDays
            });
          }
        }
      }
    });

    upcomingCelebrations.sort((a, b) => a.diffDays - b.diffDays);
    const topCelebrations = upcomingCelebrations.slice(0, 5);

    // 11. Compile the response
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
          openPositions
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
        pendingApprovals: pendingLeaves.map(l => ({
          _id: l._id,
          type: 'Leave Request',
          subType: l.leaveType,
          name: l.user?.name,
          date: l.createdAt,
          details: `${new Date(l.startDate).toLocaleDateString()} - ${new Date(l.endDate).toLocaleDateString()}`
        })),
        announcements,
        upcomingCelebrations: topCelebrations
      }
    });
  } catch (error) {
    console.error('HR Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard data' });
  }
};
