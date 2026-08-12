const express = require('express');
const router = express.Router();
const compOffController = require('../controllers/compOffController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, compOffController.createRequest);
router.get('/my', protect, compOffController.getMyRequests);
router.get('/all', protect, authorize('hr', 'manager', 'admin'), compOffController.getAllRequests);
router.put('/:id/status', protect, authorize('hr', 'manager', 'admin'), compOffController.updateStatus);

module.exports = router;

module.exports = router;
