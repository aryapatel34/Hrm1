const mongoose = require('mongoose');
const User = require('./models/User');
const Employee = require('./models/Employee');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const initUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hrms');
        
        const defaultPassword = 'admin123';
        
        const defaultUsers = [
            { email: 'hr@fluidhr.com', name: 'HR Manager', role: 'hr' },
            { email: 'manager@fluidhr.com', name: 'Manager Lead', role: 'manager' },
            { email: 'employee@fluidhr.com', name: 'Staff Member', role: 'employee' }
        ];

        for (const u of defaultUsers) {
            let user = await User.findOne({ email: u.email });
            if (!user) {
                user = new User({
                    name: u.name,
                    email: u.email,
                    password: defaultPassword,
                    role: u.role,
                    status: 'active'
                });
                await user.save();
                console.log(`Created ${u.role}: ${u.email}`);
            } else {
                user.password = defaultPassword;
                await user.save();
                console.log(`Updated ${u.role}: ${u.email} password to admin123`);
            }
            
            // create employee record just in case
            let emp = await Employee.findOne({ email: u.email });
            if (!emp) {
                emp = new Employee({
                    userId: user._id,
                    email: u.email,
                    fullName: u.name,
                    role: u.role,
                    employeeId: `${u.role.toUpperCase()}-001`
                });
                await emp.save();
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

initUsers();
