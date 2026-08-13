require('dotenv').config();
const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');

async function updateDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms');
    console.log('Connected to MongoDB');

    const result = await Attendance.updateMany(
      { totalHours: { $lt: 7.5, $ne: null }, status: { $ne: 'Half Day' } },
      { $set: { status: 'Half Day' } }
    );

    console.log(`Successfully updated ${result.modifiedCount} records to Half Day.`);
    
    // Also, find those that are over 7.5 and might be marked Half Day incorrectly? Not requested, but good to know.
    // The user just requested those less than 7:30 to be marked as half day.

    process.exit(0);
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
}

updateDatabase();
