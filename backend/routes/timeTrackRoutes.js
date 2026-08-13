const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  startTracking,
  pauseTracking,
  resumeTracking,
  stopTracking,
  desktopLogout,
  updateActivity,
  getMyTime,
  getHRTime,
  getAllTime,
  getAllTimeLogs,
  exportTimeLogs,
  getSessionStatus,
  getTimeSummary,
  getLogs,
  getTimeByDate,
  getDashboardData,
  getCalendarData,
  getDailyData,
  getDailySummaryLogs
} = require('../controllers/timeTrackController');

// 🟢 Session Control
router.post('/start', protect, startTracking);
router.post('/pause', protect, pauseTracking);
router.post('/resume', protect, resumeTracking);
router.post('/stop', protect, stopTracking);
router.post('/desktop-logout', protect, desktopLogout);

// 🔄 Monitoring
router.post('/activity', protect, updateActivity);
router.post('/update', protect, updateActivity); // Alias as requested
router.get('/status', protect, getSessionStatus);
router.get('/timer/status', protect, getSessionStatus); // Alias as requested
router.post('/timer/update', protect, updateActivity); // Alias as requested

// 📊 Analytics & History
router.get('/my', protect, getMyTime);
router.get('/summary', protect, getTimeSummary);
router.get('/logs', protect, getLogs);
router.get('/date/:date', protect, getTimeByDate);
router.get('/calendar/:employeeId', protect, getCalendarData);
router.get('/daily/:employeeId/:date', protect, getDailyData);
router.get('/daily-summary/:employeeId', protect, getDailySummaryLogs);
// 🚀 UNIFIED DASHBOARD
router.get('/dashboard', protect, getDashboardData);

// 👨‍💼 Role-Based Views
router.get('/hr', protect, authorize('hr', 'admin'), getHRTime);
router.get('/all', protect, authorize('admin'), getAllTime);
router.get('/all-logs', protect, authorize('hr', 'admin', 'superadmin'), getAllTimeLogs);
router.get('/export', protect, authorize('hr', 'admin', 'superadmin'), exportTimeLogs);

module.exports = router;
