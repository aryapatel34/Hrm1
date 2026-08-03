const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createEvent,
  updateEvent,
  deleteEvent,
  getEvents,
  getAssignedEvents,
  markEventAsRead
} = require('../controllers/eventController');

// All routes require authentication
router.use(protect);

// Employee specific routes
router.get('/assigned', getAssignedEvents);
router.patch('/:id/read', markEventAsRead);

// Management routes (Admin/HR/Manager)
router.route('/')
  .post(createEvent)
  .get(getEvents);

router.route('/:id')
  .put(updateEvent)
  .delete(deleteEvent);

module.exports = router;
