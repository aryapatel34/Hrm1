const Department = require('../models/Department');

exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().lean();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, description, managerId } = req.body;
    const newDept = new Department({ name, description, managerId });
    await newDept.save();
    res.status(201).json(newDept);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
