const mongoose = require('mongoose');
const User = require('./models/User');
const Leave = require('./models/Leave');
const LeaveBalance = require('./models/LeaveBalance');
const Holiday = require('./models/Holiday');

async function seedManagerData() {
  await mongoose.connect('mongodb://127.0.0.1:27017/hrms');
  
  const manager = await User.findOne({ role: 'manager' });
  if (!manager) {
    console.log('No manager found');
    process.exit(1);
  }

  // Create 5 subordinates
  const names = ['Sneha Patel', 'Karan Mehta', 'Neha Singh', 'Aman Verma', 'Pooja Shah'];
  const depts = ['IT', 'HR', 'Sales', 'Finance', 'Marketing', 'Operations', 'Support'];
  
  await User.deleteMany({ name: { $in: names } });
  
  const subs = [];
  for (let i=0; i<names.length; i++) {
    const u = await User.create({
      name: names[i],
      email: `${names[i].split(' ')[0].toLowerCase()}@fluidhr.com`,
      password: 'password123',
      role: 'employee',
      employeeId: `EMP00${i+1}`,
      department: depts[i],
      reportingManager: manager._id
    });
    subs.push(u);
  }

  await Leave.deleteMany({ user: { $in: subs.map(s => s._id) } });
  await LeaveBalance.deleteMany({ employeeId: { $in: subs.map(s => s._id) } });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Create Leave Balances
  for (let i=0; i<subs.length; i++) {
    await LeaveBalance.create({
      employeeId: subs[i]._id,
      month: currentMonth,
      year: currentYear,
      casualLeave: 10,
      sickLeave: 10,
      earnedLeave: 20,
      compOff: 5,
      usedLeave: Math.floor(Math.random() * 20),
      remainingLeave: 25
    });
  }

  // Create Pending Leaves (for table)
  const types = ['casual', 'sick', 'earned', 'emergency'];
  for (let i=0; i<18; i++) {
    const sDate = new Date();
    sDate.setDate(sDate.getDate() + i + 1);
    const eDate = new Date(sDate);
    eDate.setDate(sDate.getDate() + Math.floor(Math.random() * 3));
    
    await Leave.create({
      user: subs[i % subs.length]._id,
      managerId: manager._id,
      leaveType: types[i % types.length],
      startDate: sDate,
      endDate: eDate,
      totalDays: Math.floor((eDate - sDate) / (1000 * 60 * 60 * 24)) + 1,
      reason: 'Personal work ' + i,
      status: 'pending'
    });
  }

  // Create Approved Leaves for today (for Donut Chart)
  await Leave.create({
    user: subs[0]._id, managerId: manager._id, leaveType: 'casual', // half day
    startDate: new Date(), endDate: new Date(), reason: 'Half day', status: 'approved'
  });
  await Leave.create({
    user: subs[1]._id, managerId: manager._id, leaveType: 'sick', // absent
    startDate: new Date(), endDate: new Date(), reason: 'Sick', status: 'approved'
  });
  await Leave.create({
    user: subs[2]._id, managerId: manager._id, leaveType: 'emergency', // wfh
    startDate: new Date(), endDate: new Date(), reason: 'WFH', status: 'approved'
  });
  await Leave.create({
    user: subs[3]._id, managerId: manager._id, leaveType: 'earned', // on leave
    startDate: new Date(), endDate: new Date(), reason: 'Trip', status: 'approved'
  });

  // Create historical leaves for trends and analytics
  for(let m=0; m<12; m++) {
    const numLeaves = Math.floor(Math.random() * 20) + 5;
    for(let l=0; l<numLeaves; l++) {
      const sDate = new Date(currentYear, m, Math.floor(Math.random() * 28) + 1);
      await Leave.create({
        user: subs[Math.floor(Math.random() * subs.length)]._id,
        managerId: manager._id,
        leaveType: 'casual',
        startDate: sDate,
        endDate: sDate,
        totalDays: 1,
        reason: 'Past leave',
        status: 'approved'
      });
    }
  }

  console.log('Seed Manager Data Done!');
  process.exit(0);
}

seedManagerData();
