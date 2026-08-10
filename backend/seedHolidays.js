const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Holiday = require('./models/Holiday');

dotenv.config();

const holidays = [
  { name: 'Independence Day', date: new Date('2026-08-15'), type: 'National', applicableTo: ['All Employees'] },
  { name: 'Janmashtami', date: new Date('2026-08-27'), type: 'Festival', applicableTo: ['All Employees'] },
  { name: 'Ganesh Chaturthi', date: new Date('2026-09-05'), type: 'Festival', applicableTo: ['All Employees'] },
  { name: 'Gandhi Jayanti', date: new Date('2026-10-02'), type: 'National', applicableTo: ['All Employees'] },
  { name: 'Dussehra', date: new Date('2026-10-17'), type: 'Festival', applicableTo: ['All Employees'] }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms');
    console.log('Connected to DB');
    
    // Clear existing holidays
    await Holiday.deleteMany({});
    
    // Insert new holidays
    await Holiday.insertMany(holidays);
    console.log('Holidays seeded successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDB();
