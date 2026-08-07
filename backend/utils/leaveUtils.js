const Leave = require('../models/Leave');

/**
 * Checks if a given start or end date has already passed (prior to today).
 * @param {Date|string} startDate 
 * @param {Date|string} endDate 
 * @returns {boolean}
 */
const isLeaveDatePassed = (startDate, endDate) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (startDate) {
    const s = new Date(startDate);
    const startDay = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    if (startDay < startOfToday) return true;
  }
  if (endDate) {
    const e = new Date(endDate);
    const endDay = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    if (endDay < startOfToday) return true;
  }
  return false;
};

/**
 * Finds all pending leaves whose requested leave start date or end date has passed,
 * marks them as 'rejected' with reason, and notifies via Socket.io if available.
 * @param {object} io - Socket.io instance (optional)
 */
const autoRejectExpiredLeaves = async (io = null) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find all pending leaves where startDate or endDate is strictly before start of today
    const expiredLeaves = await Leave.find({
      status: { $regex: /^pending$/i },
      $or: [
        { startDate: { $lt: startOfToday } },
        { endDate: { $lt: startOfToday } }
      ]
    });

    if (expiredLeaves && expiredLeaves.length > 0) {
      for (const leave of expiredLeaves) {
        leave.status = 'rejected';
        leave.rejectionReason = 'Auto-rejected: Leave period expired (date passed without approval)';
        await leave.save();

        if (io && leave.user) {
          io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
        }
      }
      console.log(`[Auto-Reject] ${expiredLeaves.length} expired pending leave(s) automatically marked as rejected.`);
    }
  } catch (error) {
    console.error('[Auto-Reject] Error auto-rejecting expired leaves:', error);
  }
};

module.exports = {
  isLeaveDatePassed,
  autoRejectExpiredLeaves
};
