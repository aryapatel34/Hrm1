const mongoose = require('mongoose');
const User = require('./models/User');
const LeaveBalance = require('./models/LeaveBalance');

mongoose.connect('mongodb://127.0.0.1:27017/hrms').then(async () => {
  const manager = await User.findOne({ role: 'manager' });
  console.log('Manager ID:', manager._id);
  
  const subordinates = await User.find({ reportingManager: manager._id }).select('_id name');
  console.log('Subordinates:', subordinates);
  
  const subIds = subordinates.map(s => s._id);
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  console.log('Query:', { employeeId: { $in: subIds }, month: currentMonth, year: currentYear });
  
  const balances = await LeaveBalance.find({ employeeId: { $in: subIds }, month: currentMonth, year: currentYear });
  console.log('Balances found:', balances.length);
  process.exit();
});
