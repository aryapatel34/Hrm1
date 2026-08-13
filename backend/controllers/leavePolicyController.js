const LeavePolicy = require('../models/LeavePolicy');
const LeaveBalance = require('../models/LeaveBalance');

// Helper to sync balances for all users based on updated policies
const syncBalancesWithPolicies = async (policy) => {
  try {
    if (!policy || policy.status !== 'Active') return;

    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();

    const type = policy.type?.toLowerCase() || policy.name?.toLowerCase();
    const newAllowance = policy.annualAllowance || 0;
    const monthlyAccrual = parseFloat((newAllowance / 12).toFixed(2));
    
    // Find all users matching the target audience (employee, manager, or both)
    const User = require('../models/User');
    let userQuery = {};
    if (policy.applicableTo === 'employee') {
      userQuery.role = 'employee';
    } else if (policy.applicableTo === 'manager') {
      userQuery.role = 'manager';
    } else {
      userQuery.role = { $in: ['employee', 'manager', 'hr', 'admin'] };
    }
    const targetUsers = await User.find(userQuery).select('_id');
    const targetUserIds = targetUsers.map(u => u._id);

    const balances = await LeaveBalance.find({ employeeId: { $in: targetUserIds }, month: m, year: y });

    for (let balance of balances) {
      let balanceField = 'casualLeave';
      if (type.includes('casual')) {
        balanceField = 'casualLeave';
      } else if (type.includes('sick')) {
        balanceField = 'sickLeave';
      } else if (type.includes('earned')) {
        balanceField = 'earnedLeave';
      } else if (type.includes('comp') || type.includes('off')) {
        balanceField = 'compOff';
      } else {
        balanceField = 'otherLeaves';
      }

      const currentVal = balance[balanceField] || 0;
      
      // Determine new value based on syncMode
      if (policy.syncMode === 'add_difference') {
        const prevAllowance = policy.previousAllowance || 0;
        const prevMonthlyAccrual = parseFloat((prevAllowance / 12).toFixed(2));
        const diff = monthlyAccrual - prevMonthlyAccrual;
        balance[balanceField] = parseFloat((currentVal + diff).toFixed(2));
      } else {
        // 'update_total': Replace the balance with the new monthly accrual total
        balance[balanceField] = monthlyAccrual;
      }
      
      // Recalculate remaining leave
      balance.remainingLeave = (balance.earnedLeave || 0) + (balance.sickLeave || 0) + (balance.casualLeave || 0) + (balance.compOff || 0) + (balance.otherLeaves || 0) + (balance.carryForward || 0) - (balance.usedLeave || 0);
      await balance.save();
    }
  } catch (error) {
    console.error('Error syncing balances with policies:', error);
  }
};

exports.getPolicies = async (req, res) => {
  try {
    const policies = await LeavePolicy.find();
    res.json(policies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createPolicy = async (req, res) => {
  try {
    const policy = new LeavePolicy(req.body);
    await policy.save();
    
    const policyObj = policy.toObject();
    policyObj.previousAllowance = 0;
    policyObj.syncMode = req.body.syncMode || 'update_total';
    policyObj.applicableTo = req.body.applicableTo || 'all';

    await syncBalancesWithPolicies(policyObj);
    res.status(201).json(policy);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const existing = await LeavePolicy.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Policy not found' });
    
    const previousAllowance = existing.annualAllowance || 0;
    const policy = await LeavePolicy.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    const policyObj = policy.toObject();
    policyObj.previousAllowance = previousAllowance;
    policyObj.syncMode = req.body.syncMode || 'update_total';
    policyObj.applicableTo = req.body.applicableTo || 'all';

    await syncBalancesWithPolicies(policyObj);
    res.json(policy);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deletePolicy = async (req, res) => {
  try {
    const policy = await LeavePolicy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ message: 'Policy not found' });
    res.json({ message: 'Policy deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
