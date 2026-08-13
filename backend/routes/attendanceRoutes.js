const express = require('express');
const router = express.Router();
const { 
  checkIn, 
  checkOut, 
  getAttendance, 
  clockIn, 
  clockOut, 
  getMyAttendance, 
  getMyYearlyStats,
  getAllAttendance, 
  getWeeklySummary 
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Check-in and Check-out (Original)
router.post('/checkin', protect, checkIn);
router.post('/checkout', protect, checkOut);

// Clock-in and Clock-out (Designer)
router.post('/clock-in', protect, clockIn);
router.put('/clock-out', protect, clockOut);

// Additional endpoints
router.get('/me', protect, getMyAttendance);
router.get('/me/stats', protect, getMyYearlyStats);
router.get('/me/yearly-stats', protect, getMyYearlyStats);
router.get('/summary/weekly', protect, getWeeklySummary);
router.get('/all', protect, authorize('admin', 'hr'), getAllAttendance);

// Hierarchy-based attendance query
router.get('/', protect, getAttendance);

module.exports = router;
