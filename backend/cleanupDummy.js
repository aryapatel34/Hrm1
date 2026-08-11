const mongoose = require('mongoose');
const User = require('./models/User');
const Leave = require('./models/Leave');
const LeaveBalance = require('./models/LeaveBalance');

mongoose.connect('mongodb://127.0.0.1:27017/hrms').then(async () => {
  const dummyNames = ['Sneha Patel', 'Karan Mehta', 'Neha Singh', 'Aman Verma', 'Pooja Shah', 'Dummy IT', 'Dummy HR', 'Dummy Sales', 'Dummy Finance', 'Dummy Marketing', 'Dummy Operations', 'Dummy Support'];
  
  const dummyUsers = await User.find({ name: { $in: dummyNames } });
  const dummyIds = dummyUsers.map(u => u._id);
  
  console.log('Dummy users found:', dummyIds.length);
  
  if (dummyIds.length > 0) {
    const resL = await Leave.deleteMany({ user: { $in: dummyIds } });
    const resB = await LeaveBalance.deleteMany({ employeeId: { $in: dummyIds } });
    const resU = await User.deleteMany({ _id: { $in: dummyIds } });
    
    console.log('Deleted Leaves:', resL.deletedCount);
    console.log('Deleted Balances:', resB.deletedCount);
    console.log('Deleted Users:', resU.deletedCount);
  } else {
    console.log('No dummy users found.');
  }
  
  // Now verify who the manager's remaining subordinates are
  const manager = await User.findOne({ role: 'manager' });
  if (manager) {
    const subs = await User.find({ reportingManager: manager._id }).select('name email');
    console.log('Real existing subordinates:', subs.map(s => s.name));
  }
  
  process.exit();
});
