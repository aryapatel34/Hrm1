const LeavePolicy = require('../models/LeavePolicy');

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
    res.status(201).json(policy);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const policy = await LeavePolicy.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!policy) return res.status(404).json({ message: 'Policy not found' });
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
