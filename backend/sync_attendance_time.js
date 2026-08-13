const mongoose = require('mongoose');
require('dotenv').config();
const Attendance = require('./models/Attendance');
const TimeTrack = require('./models/TimeTrack');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hrms';

mongoose.connect(MONGO_URI).then(async () => {
  const tracks = await TimeTrack.find({});
  let updated = 0;
  for(let t of tracks) {
    if(t.activeTime) {
      const att = await Attendance.findOne({ user: t.employeeId, date: t.date });
      if (att) { 
        att.totalHours = parseFloat((t.activeTime / 3600).toFixed(4)); 
        await att.save(); 
        updated++; 
      }
    }
  }
  console.log('Updated to 4 decimals', updated); 
  process.exit(0);
}).catch(console.error);
