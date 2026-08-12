const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hrms';
console.log('Connecting to', mongoUri);

mongoose.connect(mongoUri).then(async () => {
  const User = require('../backend/models/User');
  const Employee = require('../backend/models/Employee');
  
  const employees = await Employee.find({})
    .populate('userId', 'name email status role')
    .populate('managerId', 'name email');
    
  console.log('Total employees in DB:', employees.length);
  const rishi = await User.findOne({ name: 'Rishi Patel' });
  if (rishi) {
    console.log('Rishi Patel User ID:', rishi._id);
    const managedByRishi = await Employee.find({
      $or: [
        { managerId: rishi._id },
        { reportingManager: rishi._id }
      ]
    });
    console.log('Employees managed by Rishi:', managedByRishi.length);
    managedByRishi.forEach(emp => {
      console.log(`- ${emp.fullName}, managerId: ${emp.managerId}, reportingManager: ${emp.reportingManager}`);
    });
  } else {
    console.log('Rishi Patel not found');
  }
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
