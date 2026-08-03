const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  eventType: {
    type: String,
    enum: ['Meeting', 'Review', 'Deadline', 'Training', 'Other'],
    default: 'Meeting',
  },
  date: {
    type: Date,
    required: [true, 'Event date is required'],
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'], // Example: '10:00 AM' or '10:00'
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
  },
  location: {
    type: String,
    trim: true,
  },
  assignedEmployees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Referencing User because employee dashboard uses profile from User model
  }],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
