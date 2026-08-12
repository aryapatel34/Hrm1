const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hrms';
mongoose.connect(mongoUri).then(async () => {
  const User = require('../backend/models/User');
  const Employee = require('../backend/models/Employee');
  
  // Fetch exactly like the controller does for HR (or admin)
  const employees = await Employee.find({ role: { $ne: 'admin' } })
    .populate('userId', 'name email status role')
    .populate('managerId', 'name email');
    
  console.log('Total fetched:', employees.length);
  
  const managers = employees.filter(emp => {
    const r = (emp.userId?.role || emp.role || '').toLowerCase();
    const d = (emp.designation || '').toLowerCase();
    const isMatch = r === 'manager' || d.includes('manager');
    console.log(`Checking manager: name=${emp.fullName}, userId.role=${emp.userId?.role}, emp.role=${emp.role}, designation=${emp.designation}, r=${r}, d=${d}, isMatch=${isMatch}`);
    return isMatch;
  });
  
  const regularEmployees = employees.filter(emp => {
    const r = (emp.userId?.role || emp.role || '').toLowerCase();
    const d = (emp.designation || '').toLowerCase();
    const isMatch = r !== 'manager' && !d.includes('manager');
    console.log(`Checking employee: name=${emp.fullName}, userId.role=${emp.userId?.role}, emp.role=${emp.role}, designation=${emp.designation}, r=${r}, d=${d}, isMatch=${isMatch}`);
    return isMatch;
  });

  console.log('Managers count:', managers.length);
  console.log('Employees count:', regularEmployees.length);
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
