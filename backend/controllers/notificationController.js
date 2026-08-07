const Notification = require('../models/Notification');
const User = require('../models/User');

exports.getNotifications = async (req, res) => {
  try {
    const received = await Notification.find({ userId: req.user.id })
      .populate('senderId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    const sent = await Notification.find({ senderId: req.user.id, batchId: { $exists: true } })
      .populate('senderId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    const uniqueSent = [];
    const seenBatches = new Set();
    for (const s of sent) {
      if (!seenBatches.has(s.batchId)) {
        seenBatches.add(s.batchId);
        if (!received.find(r => r.batchId === s.batchId)) {
          uniqueSent.push({ ...s, read: true, isSentByMe: true });
        }
      }
    }

    const allNotifs = [...received, ...uniqueSent].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);

    const formatted = allNotifs.map(n => {
      const sName = n.senderName || (n.senderId && typeof n.senderId === 'object' ? n.senderId.name : null) || 'HR / Management';
      const sRole = n.senderRole || (n.senderId && typeof n.senderId === 'object' ? n.senderId.role : null) || '';
      return {
        ...n,
        senderName: sName,
        senderRole: sRole
      };
    });

    res.json({ notifications: formatted });
  } catch (error) {
    console.error('Get Notifications failed:', error);
    res.status(500).json({ message: 'Unable to fetch notifications', error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark notification read failed:', error);
    res.status(500).json({ message: 'Unable to update notification', error: error.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read failed:', error);
    res.status(500).json({ message: 'Unable to update notifications', error: error.message });
  }
};

// @desc   Create/Send a notification announcement to users
// @route  POST /api/notifications
// @access Private/HR/Admin
exports.createNotification = async (req, res) => {
  try {
    const { message, type, targetRole, targetUserId, targetLabel } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const senderUser = await User.findById(req.user.id).select('name role');
    const senderName = senderUser?.name || (req.user.role === 'admin' ? 'Admin' : 'HR');
    const senderRole = senderUser?.role || req.user.role || 'admin';

    let users = [];
    if (targetUserId) {
      const user = await User.findById(targetUserId).select('_id');
      if (user) users.push(user);
    } else {
      const query = targetRole && targetRole !== 'all' ? { role: targetRole } : {};
      users = await User.find(query).select('_id');
    }

    const batchId = Date.now().toString();

    const notifications = await Notification.insertMany(
      users.map(u => ({
        userId: u._id,
        senderId: req.user.id,
        senderName,
        senderRole,
        batchId,
        message,
        type: type || 'announcement',
        targetLabel: targetLabel || targetRole || 'All Employees',
        read: false
      }))
    );

    // 🔔 Emit real-time socket event to each user instantly
    const io = req.app.get('io');
    if (io) {
      notifications.forEach(n => {
        io.to(`user_${String(n.userId)}`).emit('new_notification', {
          _id: n._id,
          message: n.message,
          type: n.type,
          read: false,
          senderId: req.user.id,
          senderName,
          senderRole,
          batchId: batchId,
          createdAt: n.createdAt
        });
      });
    }

    res.status(201).json({ message: `Notification sent to ${notifications.length} users`, count: notifications.length });
  } catch (error) {
    console.error('Create Notification failed:', error);
    res.status(500).json({ message: 'Unable to create notification', error: error.message });
  }
};

// @desc   Update a notification (only creator can do this)
exports.updateNotification = async (req, res) => {
  try {
    const { message } = req.body;
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Not found' });
    if (notif.senderId?.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    if (notif.batchId) {
      await Notification.updateMany({ batchId: notif.batchId }, { message });
    } else {
      await Notification.findByIdAndUpdate(req.params.id, { message });
    }

    // 🔔 Emit real-time update socket
    const io = req.app.get('io');
    if (io) {
      const affected = await Notification.find({ batchId: notif.batchId || notif._id });
      affected.forEach(n => {
        io.to(`user_${String(n.userId)}`).emit('update_notification', {
          _id: n._id,
          message: message,
          batchId: n.batchId
        });
      });
    }

    res.json({ message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Delete a notification (only creator can do this)
exports.deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Not found' });
    if (notif.senderId?.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    // Find affected before deleting to emit socket event
    const affected = await Notification.find({ batchId: notif.batchId || notif._id });

    if (notif.batchId) {
      await Notification.deleteMany({ batchId: notif.batchId });
    } else {
      await Notification.findByIdAndDelete(req.params.id);
    }

    // 🔔 Emit real-time delete socket
    const io = req.app.get('io');
    if (io) {
      affected.forEach(n => {
        io.to(`user_${String(n.userId)}`).emit('delete_notification', {
          _id: n._id,
          batchId: n.batchId
        });
      });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
