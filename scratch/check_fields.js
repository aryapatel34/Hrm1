const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hrms';
mongoose.connect(mongoUri).then(async () => {
  const User = require('../backend/models/User');
  const Employee = require('../backend/models/Employee');
  const employees = await Employee.find({}).populate('userId');
  console.log('Total:', employees.length);
  employees.forEach((emp, index) => {
    console.log(`[${index}] name: ${emp.fullName}, userId: ${emp.userId ? emp.userId._id : 'null'}, role: ${emp.role}, designation: ${emp.designation}`);
  });
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
