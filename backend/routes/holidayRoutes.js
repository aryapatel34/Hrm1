const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const { protect } = require('../middleware/authMiddleware'); // assuming standard auth middleware

router.get('/', protect, holidayController.getHolidays);
router.post('/', protect, holidayController.createHoliday);
router.post('/bulk-import', protect, holidayController.bulkImportHolidays);
router.put('/:id', protect, holidayController.updateHoliday);
router.delete('/:id', protect, holidayController.deleteHoliday);

module.exports = router;
