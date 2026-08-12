const CompOffRequest = require('../models/CompOffRequest');

exports.createRequest = async (req, res) => {
  try {
    const { dateWorked, reason } = req.body;
    const request = new CompOffRequest({
      employeeId: req.user.id || req.user._id,
      dateWorked,
      reason
    });
    await request.save();
    res.status(201).json({ message: 'Comp-Off request submitted successfully', request });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting Comp-Off request', error: error.message });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const userRole = req.user.role;
    let allowedRoles = [];
    
    if (userRole === 'admin') {
      allowedRoles = ['employee', 'manager', 'hr', 'admin'];
    } else if (userRole === 'hr') {
      allowedRoles = ['employee', 'manager'];
    } else if (userRole === 'manager') {
      allowedRoles = ['employee'];
    }

    const User = require('../models/User');
    const targetUsers = await User.find({ role: { $in: allowedRoles } }).select('_id');
    const targetUserIds = targetUsers.map(u => u._id);

    const requests = await CompOffRequest.find({ employeeId: { $in: targetUserIds } })
      .populate('employeeId', 'name')
      .populate('approverId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const employeeId = req.user.id || req.user._id;
    const requests = await CompOffRequest.find({ employeeId })
      .populate('approverId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your requests', error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    const request = await CompOffRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = status;
    request.approverId = req.user.id || req.user._id;
    
    if (status === 'rejected') {
      request.rejectionReason = rejectionReason;
    }
    
    await request.save();
    
    res.status(200).json({ message: `Request ${status} successfully`, request });
  } catch (error) {
    res.status(500).json({ message: 'Error updating request', error: error.message });
  }
};
