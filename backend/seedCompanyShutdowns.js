const mongoose = require('mongoose');
const dotenv = require('dotenv');
const CompanyShutdown = require('./models/CompanyShutdown');

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms');
    console.log('Connected to DB');
    
    // Clear existing
    await CompanyShutdown.deleteMany({});
    
    const shutdowns = [
      {
        name: 'Year End Shutdown',
        startDate: new Date('2026-12-31'),
        endDate: new Date('2027-01-02'),
        days: 3,
        reason: 'Company Closure',
        applicableTo: ['All Employees']
      },
      {
        name: 'Summer Shutdown',
        startDate: new Date('2027-05-15'),
        endDate: new Date('2027-05-17'),
        days: 3,
        reason: 'Maintenance',
        applicableTo: ['All Employees']
      }
    ];
    
    await CompanyShutdown.insertMany(shutdowns);
    console.log('Company shutdowns seeded successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDB();
