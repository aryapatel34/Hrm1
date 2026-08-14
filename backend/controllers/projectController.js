const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Initialize New Project
// @route   POST /api/projects/create
// @access  HR / Admin
exports.createProject = async (req, res) => {
  try {
    const { projectName, description, department, assignedManager, startDate, endDate } = req.body;

    const existing = await Project.findOne({ projectName });
    if (existing) return res.status(400).json({ message: 'Project designation already exists' });

    const project = await Project.create({
      projectName,
      description,
      department,
      assignedManager,
      startDate,
      endDate,
      createdBy: req.user.id
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get HR Vision (All Projects)
// @route   GET /api/projects/hr
// @access  HR / Admin
exports.getHRProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('assignedManager', 'name email employeeId')
      .populate('assignedEmployees', 'name email employeeId')
      .sort('-createdAt')
      .lean();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get Manager Assignments
// @route   GET /api/projects/manager
// @access  Manager
exports.getManagerProjects = async (req, res) => {
  try {
    const projects = await Project.find({ assignedManager: req.user.id })
      .populate('assignedEmployees', 'name email employeeId')
      .sort('-createdAt');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Tactical Personnel Allocation
// @route   PUT /api/projects/assign-employees/:projectId
// @access  Manager
exports.assignEmployees = async (req, res) => {
  try {
    const { employeeIds } = req.body; // Array of userIds
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project node not found' });

    // 🔐 VALIDATION: Prevent Duplicate Assignment
    const currentEmployees = project.assignedEmployees.map(id => id.toString());
    const duplicates = employeeIds.filter(id => currentEmployees.includes(id));
    
    if (duplicates.length > 0) {
      return res.status(400).json({ 
        message: 'Personnel node already anchored to this project',
        duplicateIds: duplicates 
      });
    }

    // Anchor new nodes
    project.assignedEmployees.push(...employeeIds);
    project.status = 'active'; // Progress to active state on first assignment
    await project.save();

    const updatedProject = await project.populate('assignedEmployees', 'name email employeeId');
    res.json(updatedProject);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get Employee Missions
// @route   GET /api/projects/my
// @access  Employee
exports.getEmployeeProjects = async (req, res) => {
  try {
    const projects = await Project.find({ assignedEmployees: req.user.id })
      .populate('assignedManager', 'name email')
      .sort('-startDate');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
