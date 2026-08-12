const express = require('express');
const router = express.Router();
const onDutyController = require('../controllers/onDutyController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, onDutyController.createRequest);
router.get('/my', protect, onDutyController.getMyRequests);
router.get('/all', protect, onDutyController.getAllRequests); // Ideally role-based check
router.put('/:id/status', protect, onDutyController.updateStatus);

module.exports = router;
