const Job = require('../models/Job');

// Get all jobs
exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).lean();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a job
exports.createJob = async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a job
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedJob = await Job.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedJob) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a job
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedJob = await Job.findByIdAndDelete(id);
    if (!deletedJob) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully', id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Duplicate a job
exports.duplicateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const original = await Job.findById(id);
    if (!original) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Create new copy with modified title
    const copyData = original.toObject();
    delete copyData._id;
    delete copyData.createdAt;
    delete copyData.updatedAt;
    copyData.title = `${copyData.title} (Copy)`;
    copyData.applicants = 0;
    copyData.status = 'Open';
    
    const copy = new Job(copyData);
    await copy.save();
    
    res.status(201).json(copy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
