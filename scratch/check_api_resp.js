const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hrms';
mongoose.connect(mongoUri).then(async () => {
  const User = require('../backend/models/User');
  const hrUser = await User.findOne({ role: 'hr' });
  if (!hrUser) {
    console.log('No HR user found');
    process.exit(1);
  }
  
  const token = jwt.sign({ id: hrUser._id, role: hrUser.role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
  console.log('Token created for HR user:', hrUser.email);
  
  // Since backend runs on port 5000 (according to .env), let's call it:
  try {
    const res = await axios.get('http://127.0.0.1:4000/api/employees', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Response status:', res.status);
    console.log('Response data type:', typeof res.data, Array.isArray(res.data) ? 'is Array' : 'is NOT Array');
    if (Array.isArray(res.data)) {
      console.log('Array length:', res.data.length);
      console.log('First element keys:', Object.keys(res.data[0] || {}));
      console.log('First element userId:', res.data[0]?.userId);
    } else {
      console.log('Response data:', res.data);
    }
  } catch (err) {
    console.error('Request failed:', err.message);
  }
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
