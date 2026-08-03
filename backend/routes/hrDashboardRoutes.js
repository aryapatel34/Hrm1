const express = require('express');
const router = express.Router();
const hrDashboardController = require('../controllers/hrDashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/summary', protect, authorize('hr', 'admin'), hrDashboardController.getDashboardStats);

module.exports = router;
