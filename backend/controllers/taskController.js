const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const fs = require('fs');

// ── HELPERS ───────────────────────────────────────────────
const getRoleFilter = (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'hr') return { $or: [{ employeeRole: { $in: ['employee', 'manager'] } }, { userId: user.id }] };
  if (user.role === 'manager') return { $or: [{ managerId: user.id }, { userId: user.id }] };
  return { userId: user.id };
};

// ── CONTROLLERS ───────────────────────────────────────────

// @desc    Create a new task (Morning Workflow)
// @route   POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const { title, description, date, status, priority, userId, employeeName, employeeRole, managerId } = req.body;
    const user = await User.findById(req.user.id);

    const attachments = [];
    if (req.files && req.files.length > 0) {
      const taskTitleSanitized = (title || 'general').replace(/[^a-zA-Z0-9]/g, '_');
      const cloudinary = require('cloudinary').v2;
      for (const file of req.files) {
        try {
          const uploadRes = await cloudinary.uploader.upload(file.path, {
            folder: `hrm/tasks/${taskTitleSanitized}`,
            resource_type: 'auto'
          });
          attachments.push({
            fileName: file.originalname,
            fileUrl: uploadRes.secure_url,
            fileType: file.mimetype
          });
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (uploadErr) {
          console.error('[TASK UPLOAD ERROR]', uploadErr);
        }
      }
    }

    const targetUserId = userId || req.user.id;
    let targetEmployeeName = employeeName;
    let targetEmployeeRole = employeeRole;
    let targetManagerId = managerId || user?.reportingManager;

    if (userId && !employeeName) {
      const assignedUser = await User.findById(userId);
      if (assignedUser) {
        targetEmployeeName = assignedUser.fullName || assignedUser.name;
        targetEmployeeRole = assignedUser.role;
        targetManagerId = assignedUser.reportingManager;
      }
    }

    const task = new Task({
      userId: targetUserId,
      employeeName: targetEmployeeName || user?.fullName || user?.name || 'System Admin',
      employeeRole: targetEmployeeRole || user?.role || 'admin',
      managerId: targetManagerId,
      teamId: user?.teamId,
      title,
      description: description || 'No description provided.',
      status: status || 'Ongoing',
      priority: priority || 'Medium',
      date: date || new Date().toISOString().split('T')[0],
      attachments
    });

    await task.save();
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error('[TASK CREATE ERROR]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get tasks based on role permissions
// @route   GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const filter = getRoleFilter(req.user);
    
    // Additional filters from query
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.date) filter.date = req.query.date;
    if (req.query.userId) filter.userId = req.query.userId;

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    
    // Stats calculation
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'Completed').length,
      pending: tasks.filter(t => t.status === 'Pending').length,
      ongoing: tasks.filter(t => t.status === 'Ongoing').length
    };

    res.json({ success: true, count: tasks.length, stats, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    
    // Security check: can they see this?
    // (Simplification: If they can list it via getRoleFilter, they can see it)
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update task status/details (End-of-Day Workflow)
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const { status, progressNote, title, description, priority, date, userId, managerId, newComment, comments, timeEstimate, sprintPoints, tags, attachments } = req.body;
    let task = await Task.findById(req.params.id);
    
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const oldStatus = task.status;
    const employeeId = task.userId;

    const updateData = { status, progressNote, title, description };
    if (priority) updateData.priority = priority;
    if (date) updateData.date = date;
    if (userId) {
      updateData.userId = userId;
      const assignedUser = await User.findById(userId);
      if (assignedUser) {
        updateData.employeeName = assignedUser.fullName || assignedUser.name;
        updateData.employeeRole = assignedUser.role;
        updateData.managerId = assignedUser.reportingManager;
      }
    }
    if (managerId) updateData.managerId = managerId;
    if (timeEstimate !== undefined) updateData.timeEstimate = timeEstimate;
    if (sprintPoints !== undefined) updateData.sprintPoints = sprintPoints;
    if (tags !== undefined) updateData.tags = tags;

    if (comments) {
      updateData.comments = comments;
    }
    if (attachments !== undefined) {
      let parsedAttachments = attachments;
      if (typeof attachments === 'string') {
        try { parsedAttachments = JSON.parse(attachments); } catch (e) {}
      }
      if (Array.isArray(parsedAttachments)) {
        // Delete removed attachments from disk
        const newUrls = new Set(parsedAttachments.map(a => a.fileUrl));
        task.attachments.forEach(file => {
          if (file.fileUrl && !newUrls.has(file.fileUrl) && fs.existsSync(file.fileUrl)) {
            try { fs.unlinkSync(file.fileUrl); } catch (err) { console.error('Failed to delete orphaned file:', err); }
          }
        });
        updateData.attachments = parsedAttachments;
      }
    }
    if (newComment) {
      const user = await User.findById(req.user.id);
      if (!updateData.$push) updateData.$push = {};
      updateData.$push.comments = {
        userName: user.fullName || user.name,
        userRole: user.role,
        text: newComment
      };
    }

    if (req.body.newTimeLog) {
      let timeLogData = req.body.newTimeLog;
      if (typeof timeLogData === 'string') {
        try { timeLogData = JSON.parse(timeLogData); } catch (e) {}
      }
      const user = await User.findById(req.user.id);
      if (!updateData.$push) updateData.$push = {};
      updateData.$push.timeLogs = {
        employeeId: user._id,
        employeeName: user.fullName || user.name,
        duration: Number(timeLogData.duration) || 0,
        startTime: timeLogData.startTime || new Date(),
        endTime: timeLogData.endTime || new Date(),
        notes: timeLogData.notes || '',
        tags: Array.isArray(timeLogData.tags) ? timeLogData.tags : []
      };
    }
    
    // Add new attachments if any
    if (req.files && req.files.length > 0) {
      const taskTitleSanitized = (title || task.title || 'general').replace(/[^a-zA-Z0-9]/g, '_');
      const cloudinary = require('cloudinary').v2;
      const newAttachments = [];
      for (const file of req.files) {
        try {
          const uploadRes = await cloudinary.uploader.upload(file.path, {
            folder: `hrm/tasks/${taskTitleSanitized}`,
            resource_type: 'auto'
          });
          newAttachments.push({
            fileName: file.originalname,
            fileUrl: uploadRes.secure_url,
            fileType: file.mimetype
          });
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (uploadErr) {
          console.error('[TASK UPDATE UPLOAD ERROR]', uploadErr);
        }
      }
      task.attachments.push(...newAttachments);
      await task.save();
    }

    task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('task_updated', task);
    }
    
    // ── NOTIFICATION LOGIC ──────────────────────────────────
    if (status !== oldStatus) {
      const io = req.app.get('io');
      
      // 1. Employee -> Management (Review Submission)
      if (status === 'Review') {
        const managers = await User.find({ role: { $in: ['admin', 'hr', 'manager'] } });
        const notifications = managers.map(m => ({
          userId: m._id,
          message: `Mission Node [${task.title}] submitted for REVIEW by ${task.employeeName}`,
          type: 'task'
        }));
        await Notification.insertMany(notifications);
        
        // Broadcast to management roles
        io.to('role_admin').to('role_hr').to('role_manager').emit('notification', {
          message: `Mission Node [${task.title}] submitted for REVIEW by ${task.employeeName}`,
          type: 'task',
          time: 'Just Now'
        });
      }
      
      // 2. Management -> Employee (Feedback/Improvement/Completion)
      if (status === 'Need to Improve' || status === 'Completed') {
        const msg = status === 'Need to Improve' ? 'need to improve' : 'updated successfully';
        await Notification.create({
          userId: employeeId,
          message: msg,
          type: 'task'
        });
        
        // Broadcast to specific employee
        io.to(`user_${employeeId}`).emit('notification', {
          message: msg,
          type: 'task',
          time: 'Just Now'
        });
      }
    }
    
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Remove files from disk
    task.attachments.forEach(file => {
      if (fs.existsSync(file.fileUrl)) {
        fs.unlinkSync(file.fileUrl);
      }
    });

    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
