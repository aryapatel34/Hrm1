const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hrms';
mongoose.connect(mongoUri).then(async () => {
  const { allocateLeave } = require('../backend/controllers/leaveController');
  
  // Mock req and res for HR user allocating 1 day of optional holiday to all employees
  const req = {
    user: {
      id: '69eaf76da69aadba6bbce615', // System Admin (Admin)
      role: 'admin'
    },
    body: {
      userId: 'employees',
      leaveType: 'optional',
      days: '1',
      action: 'add',
      reason: 'Test Optional Holiday allocation'
    }
  };
  
  const res = {
    json: (data) => {
      console.log('SUCCESS! Response:', JSON.stringify(data));
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
    console.log('Calling allocateLeave...');
    await allocateLeave(req, res);
  } catch (err) {
    console.error('Controller threw error:', err);
    process.exit(1);
  }
}).catch(err => {
  console.error(err);
  process.exit(1);
});
