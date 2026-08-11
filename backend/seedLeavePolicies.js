const mongoose = require('mongoose');
const dotenv = require('dotenv');
const LeavePolicy = require('./models/LeavePolicy');

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms');
    console.log('Connected to DB');
    
    // Clear existing
    await LeavePolicy.deleteMany({});
    
    const policies = [
      {
        name: 'Earned Leave (EL)',
        defaultDays: 18,
        isCarryForward: true,
        maxCarryForwardDays: 45
      },
      {
        name: 'Sick Leave (SL)',
        defaultDays: 12,
        isCarryForward: true,
        maxCarryForwardDays: 30
      },
      {
        name: 'Casual Leave (CL)',
        defaultDays: 10,
        isCarryForward: false,
        maxCarryForwardDays: 0
      },
      {
        name: 'Comp Off (CO)',
        defaultDays: 0,
        isCarryForward: false,
        maxCarryForwardDays: 0
      },
      {
        name: 'Maternity Leave',
        defaultDays: 180,
        isCarryForward: false,
        maxCarryForwardDays: 0
      }
    ];
    
    await LeavePolicy.insertMany(policies);
    console.log('Leave policies seeded successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDB();
