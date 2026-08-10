const express = require('express');
const router = express.Router();
const leavePolicyController = require('../controllers/leavePolicyController');
const { protect } = require('../middleware/authMiddleware'); // assuming standard auth middleware

router.get('/', protect, leavePolicyController.getPolicies);
router.post('/', protect, leavePolicyController.createPolicy);
router.put('/:id', protect, leavePolicyController.updatePolicy);
router.delete('/:id', protect, leavePolicyController.deletePolicy);

module.exports = router;
