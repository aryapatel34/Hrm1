const mongoose = require('mongoose');
require('dotenv').config();
const TimeTrack = require('./models/TimeTrack');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hrms').then(async () => {
  const dStr = new Date().toISOString().split('T')[0];
  const tracks = await TimeTrack.find({ date: dStr }).populate('employeeId');
  for (let t of tracks) {
    console.log(`User: ${t.employeeId?.name || t.employeeId?.fullName}, ActiveTime: ${t.activeTime}`);
  }
  process.exit(0);
});
