const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hrms';
mongoose.connect(mongoUri).then(async () => {
  const { getEmployees } = require('../backend/controllers/employeeController');
  
  // Mock req and res for HR user
  const req = {
    user: {
      id: '69eaf76da69aadba6bbce615', // System Admin (Admin)
      role: 'admin'
    }
  };
  
  const res = {
    json: (data) => {
      console.log('SUCCESS! Returned items:', data.length);
      if (data.length > 0) {
        console.log('First item:', JSON.stringify(data[0]));
      }
      process.exit(0);
    },
    status: function(code) {
      console.log('STATUS:', code);
      return this;
    },
    send: (msg) => {
      console.log('SEND:', msg);
      process.exit(1);
    }
  };
  
  try {
    await getEmployees(req, res);
  } catch (err) {
    console.error('Controller threw error:', err);
    process.exit(1);
  }
}).catch(err => {
  console.error(err);
  process.exit(1);
});
