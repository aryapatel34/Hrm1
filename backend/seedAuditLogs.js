const mongoose = require('mongoose');
const User = require('./models/User');
const AuditLog = require('./models/AuditLog');

mongoose.connect('mongodb://127.0.0.1:27017/hrms').then(async () => {
  const admin = await User.findOne({ role: 'admin' });
  const hr = await User.findOne({ role: 'hr' });
  
  if (!admin || !hr) {
    console.log('Admin or HR user not found, aborting.');
    process.exit(1);
  }

  // Clear existing dummy leave logs if any
  await AuditLog.deleteMany({ module: 'Leave' });

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const logsToInsert = [
    {
      userId: admin._id,
      userName: admin.name,
      userRole: 'Admin',
      action: 'Leave Processing',
      module: 'Leave',
      description: 'System identified 3 employees with negative leave balances.',
      status: 'Warning',
      timestamp: twoHoursAgo
    },
    {
      userId: hr._id,
      userName: hr.name,
      userRole: 'HR Manager',
      action: 'Bulk Allocation',
      module: 'Leave',
      description: 'Monthly bulk leave allocation successfully executed for 150 employees.',
      status: 'Success',
      timestamp: yesterday
    },
    {
      userId: admin._id,
      userName: 'Audit Bot',
      userRole: 'System',
      action: 'Scanning',
      module: 'Leave',
      description: 'Scanning overlapping leave requests in Engineering department...',
      status: 'Success',
      timestamp: new Date(now.getTime() - 5 * 60 * 1000) // 5 mins ago
    },
    {
      userId: hr._id,
      userName: hr.name,
      userRole: 'HR Manager',
      action: 'Leave Adjustment',
      module: 'Leave',
      description: 'Adjusted sick leave balance for 5 employees.',
      status: 'Success',
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    }
  ];

  await AuditLog.insertMany(logsToInsert);
  console.log('AuditLog seeded with 4 realistic records!');
  process.exit();
});
