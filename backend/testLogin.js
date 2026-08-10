const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://127.0.0.1:27017/hrms')
  .then(async () => {
    const user = await User.findOne({ email: 'hr@fluidhr.com' });
    if (!user) {
      console.log('User not found!');
      process.exit(1);
    }
    console.log('User found:', user.email);
    console.log('Hashed Password in DB:', user.password);

    const isMatch = await bcrypt.compare('admin123', user.password);
    console.log('Does admin123 match?', isMatch);
    
    // Check if it's double hashed 'admin123'
    const singleHash = await bcrypt.hash('admin123', 10);
    // Actually we can't easily check double hash unless we double hash and compare, but bcrypt uses salt.
    
    process.exit(0);
  });
