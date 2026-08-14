const Payroll = require('../models/Payroll');

// @desc    Generate Payroll for an Employee
// @route   POST /api/payroll
exports.generatePayroll = async (req, res) => {
  try {
    const { userId, month, year, basicSalary, allowances, deductions } = req.body;
    
    // Check if payroll already exists for this period
    const existing = await Payroll.findOne({ user: userId, month, year });
    if (existing) {
      return res.status(400).json({ message: 'Payroll already exists for this period' });
    }

    const netSalary = (Number(basicSalary) + Number(allowances)) - Number(deductions);

    const payroll = await Payroll.create({
      user: userId,
      month,
      year,
      basicSalary,
      allowances,
      deductions,
      netSalary,
      status: 'Pending'
    });

    res.status(201).json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get My Payroll History
// @route   GET /api/payroll/me
exports.getMyPayroll = async (req, res) => {
  try {
    const history = await Payroll.find({ user: req.user.id }).sort({ year: -1, month: -1 }).lean();
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get All Payroll (Admin/HR)
// @route   GET /api/payroll
exports.getAllPayroll = async (req, res) => {
  try {
    const allPayroll = await Payroll.find().populate('user', 'name role email').sort({ createdAt: -1 }).lean();
    res.json(allPayroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Payroll Status (Process Payment)
// @route   PUT /api/payroll/:id
exports.updatePayrollStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const payroll = await Payroll.findById(req.params.id);
    
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    payroll.status = status;
    if (status === 'Paid') {
      payroll.paymentDate = new Date();
    }
    
    await payroll.save();
    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
