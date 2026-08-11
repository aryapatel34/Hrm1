const mongoose = require('mongoose');
const User = require('./models/User');
const Leave = require('./models/Leave');
const LeaveBalance = require('./models/LeaveBalance');

mongoose.connect('mongodb://127.0.0.1:27017/hrms').then(async () => {
  const manager = await User.findOne({ role: 'manager' });
  if (!manager) {
    console.log('No manager found');
    process.exit(1);
  }

  // Get some real existing employees
  const employees = await User.find({ role: 'employee' }).limit(6);
  if (employees.length === 0) {
    console.log('No employees found in the available database');
    process.exit(1);
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Assign them to the manager and create realistic data
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    emp.reportingManager = manager._id;
    await emp.save();

    // Check if balance exists
    let bal = await LeaveBalance.findOne({ employeeId: emp._id, month: currentMonth, year: currentYear });
    if (!bal) {
      await LeaveBalance.create({
        employeeId: emp._id,
        month: currentMonth,
        year: currentYear,
        casualLeave: 6,
        sickLeave: 4,
        earnedLeave: 12,
        compOff: 2
      });
    }

    // Create a pending leave for this employee to show in Pending Approvals
    // Only if they don't already have one
    const pendingLeave = await Leave.findOne({ user: emp._id, status: 'pending' });
    if (!pendingLeave) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + i + 1);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (i % 3));

      const types = ['casual', 'sick', 'earned', 'emergency'];
      await Leave.create({
        user: emp._id,
        managerId: manager._id,
        leaveType: types[i % 4],
        startDate,
        endDate,
        reason: `Family function ${i+1}`,
        status: 'pending',
        totalDays: (i % 3) + 1,
        appliedOn: new Date()
      });
    }
    
    // Create an approved leave to show in calendar/availability
    const approvedLeave = await Leave.findOne({ user: emp._id, status: 'approved' });
    if (!approvedLeave) {
      const pastStart = new Date();
      pastStart.setDate(pastStart.getDate() - (i + 2));
      const pastEnd = new Date(pastStart);
      pastEnd.setDate(pastEnd.getDate() + 1);
      
      await Leave.create({
        user: emp._id,
        managerId: manager._id,
        leaveType: 'sick',
        startDate: pastStart,
        endDate: pastEnd,
        reason: 'Fever',
        status: 'approved',
        totalDays: 2,
        appliedOn: new Date(new Date().setDate(now.getDate() - 10))
      });
    }
  }

  console.log(`Successfully assigned ${employees.length} existing employees to Manager Lead and generated leave data for them!`);
  process.exit();
});
