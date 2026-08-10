const fs = require('fs');

const code = `
const Holiday = require('../models/Holiday');
const LeaveBalance = require('../models/LeaveBalance');

exports.getManagerStats = async (req, res) => {
  try {
    const subordinates = await User.find({ reportingManager: req.user._id }).select('_id');
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

    const subordinates = await User.find({ reportingManager: req.user._id }).select('_id');
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
    const subordinates = await User.find({ reportingManager: req.user._id }).select('_id');
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

    const subordinates = await User.find({ reportingManager: req.user._id }).select('_id');
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

    const subordinates = await User.find({ reportingManager: req.user._id }).select('_id');
    const subIds = subordinates.map(s => s._id);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const query = { employeeId: { $in: subIds }, month: currentMonth, year: currentYear };
    
    const total = await LeaveBalance.countDocuments(query);
    const balances = await LeaveBalance.find(query)
      .populate('employeeId', 'name profileImage')
      .skip(skip)
      .limit(limit);

    res.json({
      data: balances,
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

    const subordinates = await User.find({ reportingManager: req.user._id }).select('_id');
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

    const subordinates = await User.find({ reportingManager: req.user._id });
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

    res.json({ success: true, message: \`\${leaves.length} leaves approved\` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.exportTeamLeaves = async (req, res) => {
  try {
    const { format } = req.query; // pdf or xlsx
    
    const subordinates = await User.find({ reportingManager: req.user._id }).select('_id');
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
        doc.fontSize(12).text(\`\${empName} - \${l.leaveType} (\${l.status})\`);
        doc.fontSize(10).text(\`Dates: \${l.startDate.toISOString().split('T')[0]} to \${l.endDate.toISOString().split('T')[0]}\`);
        doc.text(\`Reason: \${l.reason}\`);
        doc.moveDown();
      });
      
      doc.end();
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
`;

fs.appendFileSync('controllers/leaveController.js', code);
console.log('Appended to leaveController.js');
