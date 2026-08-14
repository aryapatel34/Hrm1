const Team = require('../models/Team');
const User = require('../models/User');

// @desc    Create new team
// @route   POST /api/teams/create
// @access  HR / Admin
exports.createTeam = async (req, res) => {
  try {
    const { teamName, department, managerId } = req.body;

    const existing = await Team.findOne({ teamName });
    if (existing) return res.status(400).json({ message: 'Team Name already exists' });

    const team = new Team({
      teamName,
      department,
      managerId,
      createdBy: req.user.id
    });

    await team.save();

    // 🔗 CORE SYNC: Anchor the manager's identity to this team
    await User.findByIdAndUpdate(managerId, { teamId: team._id });

    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add members to team
// @route   PUT /api/teams/add-members/:teamId
// @access  HR / Admin
exports.addMembers = async (req, res) => {
  try {
    const { members } = req.body; // array of userIds
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Update team members array (avoid duplicates)
    team.members = [...new Set([...team.members, ...members])];
    await team.save();

    // Update each user's teamId and reportingManager (to team manager)
    await User.updateMany(
      { _id: { $in: members } },
      { 
        teamId: team._id,
        reportingManager: team.managerId
      }
    );

    res.json({ message: 'Personnel nodes integrated into team pulse', team });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all teams
// @route   GET /api/teams
// @access  HR / Admin
exports.getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('managerId', 'name email employeeId')
      .populate('members', 'name email employeeId role')
      .lean();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get my team
// @route   GET /api/teams/my
// @access  Manager / Employee
exports.getMyTeam = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.teamId) return res.status(404).json({ message: 'Personnel node not assigned to any team segment' });

    const team = await Team.findById(user.teamId)
      .populate('managerId', 'name email')
      .populate('members', 'name email employeeId status');
    
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
