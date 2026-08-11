const express = require('express');
const router = express.Router();
const hrDashboardController = require('../controllers/hrDashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/summary', protect, authorize('hr', 'admin'), hrDashboardController.getDashboardStats);
router.get('/leave-allocations', protect, authorize('hr', 'admin'), hrDashboardController.getLeaveAllocations);
router.get('/company-shutdowns', protect, authorize('hr', 'admin'), hrDashboardController.getCompanyShutdowns);
router.get('/attendance-reconciliation', protect, authorize('hr', 'admin'), hrDashboardController.getAttendanceReconciliation);
router.get('/leave-audits', protect, authorize('hr', 'admin'), hrDashboardController.getLeaveAudits);

module.exports = router;
