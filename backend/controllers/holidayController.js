const Holiday = require('../models/Holiday');

exports.getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.status(200).json(holidays);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const holiday = new Holiday(req.body);
    await holiday.save();
    res.status(201).json({ message: 'Holiday created', data: holiday });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndUpdate(id, req.body, { new: true });
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
    res.status(200).json({ message: 'Holiday updated', data: holiday });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
    res.status(200).json({ message: 'Holiday deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
