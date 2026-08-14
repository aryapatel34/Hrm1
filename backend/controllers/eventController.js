const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Create a new event
// @route   POST /api/events
// @access  Admin/HR/Manager
exports.createEvent = async (req, res) => {
  try {
    const { title, description, eventType, date, startTime, endTime, location, assignedEmployees } = req.body;
    
    if (!title || !date || !startTime || !endTime || !assignedEmployees || assignedEmployees.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields including at least one assigned employee.' });
    }

    const newEvent = await Event.create({
      title,
      description,
      eventType,
      date,
      startTime,
      endTime,
      location,
      assignedEmployees,
      createdBy: req.user.id
    });

    try {
      const notifications = assignedEmployees.map(empId => ({
        userId: empId,
        senderId: req.user.id,
        message: `You have been assigned to a new upcoming event (${eventType}): ${title} on ${new Date(date).toLocaleDateString()} at ${startTime}.`,
        type: 'event'
      }));
      await Notification.insertMany(notifications);
    } catch (notifErr) {
      console.error('Failed to send event notifications:', notifErr);
    }

    res.status(201).json({ success: true, data: newEvent });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Admin/HR/Manager
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, eventType, date, startTime, endTime, location, assignedEmployees } = req.body;

    let event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Role check if needed: typically HR/Admin/Manager can update. We assume routes middleware handles this.
    
    event = await Event.findByIdAndUpdate(id, {
      title,
      description,
      eventType,
      date,
      startTime,
      endTime,
      location,
      assignedEmployees
    }, { new: true, runValidators: true });

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Admin/HR/Manager
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    await event.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get all events (for management)
// @route   GET /api/events
// @access  Admin/HR/Manager
exports.getEvents = async (req, res) => {
  try {
    const { startDate, endDate, eventType, search } = req.query;
    
    let query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (eventType) {
      query.eventType = eventType;
    }
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const events = await Event.find(query)
      .populate('assignedEmployees', 'name email profile')
      .populate('createdBy', 'name role profile')
      .sort({ date: 1, startTime: 1 })
      .lean();

    res.status(200).json({ success: true, count: events.length, data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get events assigned to the logged in employee
// @route   GET /api/events/assigned
// @access  Private (Employee)
exports.getAssignedEvents = async (req, res) => {
  try {
    const events = await Event.find({ assignedEmployees: req.user.id })
      .populate('createdBy', 'name role profile')
      .sort({ date: 1, startTime: 1 })
      .lean();

    res.status(200).json({ success: true, count: events.length, data: events });
  } catch (error) {
    console.error('Error fetching assigned events:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Mark event as read by employee
// @route   PATCH /api/events/:id/read
// @access  Private (Employee)
exports.markEventAsRead = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Only allow if the employee is assigned
    if (!event.assignedEmployees.includes(req.user.id)) {
       return res.status(403).json({ success: false, message: 'Not authorized to read this event' });
    }

    if (!event.readBy.includes(req.user.id)) {
      event.readBy.push(req.user.id);
      await event.save();
    }

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    console.error('Error marking event as read:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
