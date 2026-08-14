/**
 * ============================================================
 * TIME ENGINE v2 — BACKEND AUTHORITY
 * ============================================================
 * Rules:
 *  - Backend is the ONLY source of truth
 *  - Frontend/Electron ONLY display values returned here
 *  - No local timer math anywhere
 *  - Idle time tracked as: inactivityCount × IDLE_THRESHOLD (deducted from activeTime)
 *  - All values stored in DB and returned on every poll
 * ============================================================
 */

const TimeTrack = require('../models/TimeTrack');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const mongoose = require('mongoose');

// ── CONFIG // Constants for Idle tracking (MUST MATCH DESKTOP APP & WEB APP)
const IDLE_THRESHOLD_SECONDS = 300; // 5 minutes (300 seconds)

// ── HELPERS ───────────────────────────────────────────────
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isDBConnected = () => mongoose.connection.readyState === 1;

const getRoleFilter = (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'hr') return {
    $or: [
      { employeeRole: { $in: ['employee', 'manager'] } },
      { employeeId: user.id }
    ]
  };
  if (user.role === 'manager') return {
    $or: [
      { managerId: user.id },
      { employeeId: user.id }
    ]
  };
  return { employeeId: user.id };
};

// ── MOCK (DB offline fallback) ────────────────────────────
let mock = {
  hasActiveSession: false, status: 'completed', isRunning: false,
  activeTime: 0, idleTime: 0, inactivityCount: 0
};

// ============================================================
// 🟢 START
// ============================================================
exports.startTracking = async (req, res) => {
  try {
    if (!isDBConnected()) {
      mock = { hasActiveSession: true, status: 'active', isRunning: true, activeTime: 0, idleTime: 0, inactivityCount: 0, startTime: new Date() };
      return res.status(201).json({ message: 'Mock start', session: mock });
    }

    const { id, role } = req.user;
    const today = getToday();
    const now = new Date();
    const userNode = await User.findById(id).select('reportingManager teamId');

    // Close any stale session from a previous day
    await TimeTrack.updateMany(
      { employeeId: id, date: { $ne: today }, status: { $in: ['active', 'idle', 'paused'] } },
      { $set: { status: 'completed', isRunning: false, endTime: now } }
    );

    let session = await TimeTrack.findOne({ employeeId: id, date: today });

    if (session) {
      // Resume existing day session
      session.status = 'active';
      session.isRunning = true;
      session.segmentStart = now;       // start of THIS active segment
      session.lastHeartbeat = now;
      session.idleApplied = false;
      session.sessions.push({ start: now });
    } else {
      session = new TimeTrack({
        employeeId: id,
        employeeRole: role || 'employee',
        managerId: userNode?.reportingManager || null,
        teamId: userNode?.teamId || null,
        date: today,
        startTime: now,
        segmentStart: now,
        lastHeartbeat: now,
        status: 'active',
        isRunning: true,
        activeTime: 0,
        idleTime: 0,
        inactivityCount: 0,
        sessions: [{ start: now }]
      });
    }

    await session.save();

    // Sync with legacy Attendance model for HR dashboards
    const existingAttendance = await Attendance.findOne({ user: id, date: today });
    if (!existingAttendance) {
      await Attendance.create({
        user: id,
        date: today,
        checkInTime: now,
        status: 'Present'
      });
    }

    const io = req.app.get('io');
    if (io) io.to(`user_${id}`).emit('timer_update', buildPayload(session));

    res.status(201).json({ message: 'Tracking started', session: buildPayload(session) });
  } catch (err) {
    console.error('[START ERROR]', err);
    res.status(500).json({ message: 'Failed to start tracking', error: err.message });
  }
};

// ============================================================
// ⏸️ PAUSE (manual)
// ============================================================
exports.pauseTracking = async (req, res) => {
  try {
    if (!isDBConnected()) {
      mock.status = 'paused'; mock.isRunning = false;
      return res.json({ message: 'Mock pause', session: mock });
    }

    const { id } = req.user;
    const now = new Date();
    const session = await TimeTrack.findOne({ employeeId: id, date: getToday(), status: 'active' });
    if (!session) return res.status(404).json({ message: 'No active session to pause' });

    // Commit the current active segment to activeTime
    session.activeTime += flushSegment(session, now);
    session.segmentStart = null;
    session.status = 'paused';
    session.isRunning = false;
    session.lastHeartbeat = now;
    session.idleApplied = false;

    const lastIdx = session.sessions.length - 1;
    if (lastIdx >= 0) {
      if (!session.sessions[lastIdx].pause && !session.sessions[lastIdx].end) {
        session.sessions[lastIdx].pause = now;
      }
    }

    await session.save();

    const io = req.app.get('io');
    if (io) io.to(`user_${id}`).emit('timer_paused', { reason: 'manual', ...buildPayload(session) });

    res.json({ message: 'Tracking paused', session: buildPayload(session) });
  } catch (err) {
    console.error('[PAUSE ERROR]', err);
    res.status(500).json({ message: 'Failed to pause', error: err.message });
  }
};

// ============================================================
// ▶️ RESUME (manual)
// ============================================================
exports.resumeTracking = async (req, res) => {
  try {
    if (!isDBConnected()) {
      mock.status = 'active'; mock.isRunning = true;
      return res.json({ message: 'Mock resume', session: mock });
    }

    const { id } = req.user;
    const now = new Date();
    const session = await TimeTrack.findOne({
      employeeId: id, date: getToday(), status: { $in: ['paused', 'idle'] }
    });
    if (!session) return res.status(404).json({ message: 'No paused session to resume' });

    // idleTime is tracked by inactivityCount × IDLE_THRESHOLD — nothing to add on resume
    session.status = 'active';
    session.isRunning = true;
    session.segmentStart = now;
    session.lastHeartbeat = now;
    session.idleApplied = false;

    session.sessions.push({ resume: now });

    await session.save();

    const io = req.app.get('io');
    if (io) io.to(`user_${id}`).emit('timer_resumed', buildPayload(session));

    res.json({ message: 'Tracking resumed', session: buildPayload(session) });
  } catch (err) {
    console.error('[RESUME ERROR]', err);
    res.status(500).json({ message: 'Failed to resume', error: err.message });
  }
};

// ============================================================
// 🔴 STOP
// ============================================================
exports.stopTracking = async (req, res) => {
  try {
    if (!isDBConnected()) {
      mock.status = 'completed'; mock.isRunning = false; mock.hasActiveSession = false;
      return res.json({ message: 'Mock stop', session: mock });
    }

    const { id } = req.user;
    const now = new Date();
    const session = await TimeTrack.findOne({
      employeeId: id, date: getToday(), status: { $in: ['active', 'paused', 'idle'] }
    });
    if (!session) return res.status(404).json({ message: 'No session to stop' });

    // Commit final active segment
    if (session.status === 'active') {
      session.activeTime += flushSegment(session, now);
    }

    session.segmentStart = null;
    session.endTime = now;
    session.status = 'completed';
    session.isRunning = false;

    // Sync with legacy Attendance model for HR dashboards
    try {
      const attendance = await Attendance.findOne({ user: id, date: session.date });
      if (attendance && !attendance.checkOutTime) {
        attendance.checkOutTime = now;
        if (attendance.checkInTime) {
          const diffMs = now - new Date(attendance.checkInTime);
          attendance.totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
        }
        await attendance.save();
      }
    } catch (attErr) {
      console.error('[SYNC ATTENDANCE ERROR]', attErr);
    }

    const lastIdx = session.sessions.length - 1;
    if (lastIdx >= 0) {
      if (!session.sessions[lastIdx].pause && !session.sessions[lastIdx].end) {
        session.sessions[lastIdx].end = now;
      }
    }

    await session.save();
    res.json({ message: 'Tracking stopped', session: buildPayload(session) });
  } catch (err) {
    console.error('[STOP ERROR]', err);
    res.status(500).json({ message: 'Failed to stop', error: err.message });
  }
};

// ============================================================
// 🔄 HEARTBEAT / ACTIVITY UPDATE
// ============================================================
exports.updateActivity = async (req, res) => {
  try {
    if (!isDBConnected()) return res.json(mock);

    const { id } = req.user;
    const { type } = req.body;
    const now = new Date();

    const session = await TimeTrack.findOne({
      employeeId: id, date: getToday(), status: { $in: ['active', 'idle', 'paused'] }
    });

    if (!session) {
      // Auto-close stale yesterday session
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      await TimeTrack.updateMany(
        { employeeId: id, date: yesterday, status: { $in: ['active', 'idle'] } },
        { $set: { status: 'completed', isRunning: false, endTime: now } }
      );
      return res.status(404).json({ message: 'No active session' });
    }

    const normalizedType = String(type || '').toLowerCase();
    const isActiveSignal = ['mouse', 'keyboard', 'click', 'scroll', 'touch', 'focus', 'tab', 'heartbeat', 'active'].includes(normalizedType);
    const isIdleSignal = normalizedType === 'idle';

    if (session.status === 'active') {
      const sinceHeartbeat = session.lastHeartbeat
        ? (now - new Date(session.lastHeartbeat)) / 1000
        : 0;

      if (isActiveSignal) {
        // ── Normal active heartbeat (No Auto-Pause) ──
        // Commit elapsed seconds since last heartbeat to activeTime (high precision)
        session.activeTime += Math.max(0, sinceHeartbeat);
        session.lastHeartbeat = now;
        session.segmentStart = now;

      } else if (isIdleSignal) {
        // ── Idle transition ──
        if (!session.idleApplied) {
          // ✅ Dynamic Rewind: Subtract the EXACT seconds of idleness reported by the OS
          // This eliminates gaps caused by heartbeat delays or network latency.
          const rawRewind = req.body.idleSeconds || IDLE_THRESHOLD_SECONDS;

          // Calculate the maximum possible active time in the current start/resume period
          let maxActiveInPeriod = sinceHeartbeat;
          if (session.sessions && session.sessions.length > 0) {
            const lastPeriod = session.sessions[session.sessions.length - 1];
            const periodStart = lastPeriod.resume || lastPeriod.start;
            if (periodStart) {
              maxActiveInPeriod = Math.max(0, (now - new Date(periodStart)) / 1000);
            }
          }

          const rewindAmount = Math.min(maxActiveInPeriod, rawRewind);

          session.activeTime += Math.max(0, sinceHeartbeat);
          // Subtract the idle period from active time and assign it to inactive time
          session.activeTime = Math.max(0, session.activeTime - rewindAmount);

          session.inactivityCount += 1;
          session.idleTime = (session.idleTime || 0) + rewindAmount;
          session.idleApplied = true;

          const idleTimeStart = new Date(now.getTime() - rewindAmount * 1000);
          const lastIdx = session.sessions.length - 1;
          if (lastIdx >= 0 && !session.sessions[lastIdx].pause && !session.sessions[lastIdx].end) {
             session.sessions[lastIdx].pause = idleTimeStart;
          }

          console.log(`[IDLE DYNAMIC] User ${id} — status set to idle, activeTime rewound by ${rewindAmount}s`);
        }

        session.status = 'idle';
        session.isRunning = false;
        session.segmentStart = null;
        session.lastHeartbeat = now;

        await session.save();

        const io = req.app.get('io');
        if (io) {
          io.to(`user_${id}`).emit('timer_paused', {
            reason: 'inactivity',
            employeeId: id,
            ...buildPayload(session)
          });
        }

        return res.json(buildPayload(session));
      }

    } else if (session.status === 'idle') {
      // While idle, just update heartbeat timestamp — no math
      session.lastHeartbeat = now;
    }

    await session.save();
    res.json(buildPayload(session));
  } catch (err) {
    console.error('[HEARTBEAT ERROR]', err);
    res.status(500).json({ message: 'Heartbeat failed', error: err.message });
  }
};

// ============================================================
// 📡 GET SESSION STATUS  (frontend polls this every second)
// ============================================================
exports.getSessionStatus = async (req, res) => {
  try {
    if (!isDBConnected()) return res.json({ hasActiveSession: false, ...mock });

    const { id, role } = req.user;
    let targetId = id;
    if (req.query.userId && (role === 'admin' || role === 'hr' || role === 'manager')) {
      targetId = req.query.userId;
    }
    const today = getToday();
    const session = await TimeTrack.findOne({
      employeeId: targetId, date: today
    }).sort({ createdAt: -1 });

    if (!session) return res.json({ hasActiveSession: false });
    
    if (session.status === 'completed') {
      return res.json({ hasActiveSession: false, activeTime: Math.floor(session.activeTime || 0) });
    }

    // ── Session Status ──
    // The frontend is responsible for calculating elapsed time from segmentStart.
    // We strictly return the database state to prevent double-counting.
    res.json(buildPayload(session));
  } catch (err) {
    console.error('[STATUS ERROR]', err);
    res.status(500).json({ message: 'Status check failed', error: err.message });
  }
};

// ============================================================
// 📊 ANALYTICS / VIEWS  (unchanged logic, just cleaner)
// ============================================================
exports.getTimeSummary = async (req, res) => {
  try {
    if (!isDBConnected()) return res.json({ stats: { active: 0, idle: 0, total: 0, productivity: 0 }, chartData: [], logs: [] });

    const filter = getRoleFilter(req.user);

    const { timeRange } = req.query;
    let limitCount = 30; // default 30 days
    if (timeRange === '7days') limitCount = 7;
    else if (timeRange === 'year') limitCount = 365;

    const sessions = await TimeTrack.find(filter).sort({ date: -1 }).limit(limitCount);
    const today = getToday();
    const todayData = sessions.filter(s => s.date === today);

    const stats = {
      active: todayData.reduce((a, s) => a + (s.activeTime || 0), 0),
      idle: todayData.reduce((a, s) => a + (s.idleTime || 0), 0),
      total: todayData.reduce((a, s) => a + (s.activeTime || 0) + (s.idleTime || 0), 0),
      productivity: 0
    };
    const total = stats.active + stats.idle;
    if (total > 0) stats.productivity = Math.round((stats.active / total) * 100);

    const chartMap = {};
    sessions.forEach(s => {
      if (!chartMap[s.date]) chartMap[s.date] = { date: s.date, active: 0, idle: 0 };
      chartMap[s.date].active += (s.activeTime || 0) / 3600;
      chartMap[s.date].idle += (s.idleTime || 0) / 3600;
    });

    res.json({ stats, chartData: Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date)), logs: sessions.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ message: 'Summary failed', error: err.message });
  }
};

exports.getTimeByDate = async (req, res) => {
  try {
    const filter = { ...getRoleFilter(req.user), date: req.params.date };
    res.json(await TimeTrack.find(filter).populate('employeeId', 'name fullName email'));
  } catch (err) { res.status(500).json({ message: 'Date fetch failed', error: err.message }); }
};

exports.getLogs = async (req, res) => {
  try {
    res.json(await TimeTrack.find(getRoleFilter(req.user)).sort({ createdAt: -1 }).populate('employeeId', 'name fullName email'));
  } catch (err) { res.status(500).json({ message: 'Logs failed', error: err.message }); }
};

exports.getMyTime = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = { employeeId: req.user.id };
    
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = startDate;
    }
    
    res.json(await TimeTrack.find(filter).sort({ date: -1 }));
  } catch (err) { res.status(500).json({ message: 'My logs failed', error: err.message }); }
};


exports.getHRTime = async (req, res) => {
  try {
    res.json(await TimeTrack.find({ employeeRole: { $in: ['employee', 'manager'] } }).sort({ date: -1 }).populate('employeeId', 'name fullName email').lean());
  } catch (err) { res.status(500).json({ message: 'HR logs failed', error: err.message }); }
};

exports.getAllTime = async (req, res) => {
  try {
    res.json(await TimeTrack.find({}).sort({ date: -1 }).populate('employeeId', 'name fullName email').lean());
  } catch (err) { res.status(500).json({ message: 'All logs failed', error: err.message }); }
};

exports.getAllTimeLogs = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, role } = req.query;
    let filter = {};

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = startDate;
    }

    if (employeeId) filter.employeeId = employeeId;
    if (role) filter.employeeRole = role;

    const logs = await TimeTrack.find(filter)
      .populate('employeeId', 'name fullName email role')
      .sort({ date: -1, createdAt: -1 });

    // Deduplicate logs by employeeId + date (keeping the latest record)
    const uniqueMap = new Map();
    for (const log of logs) {
      const empId = log.employeeId?._id ? log.employeeId._id.toString() : (log.employeeId ? log.employeeId.toString() : '');
      const key = `${empId}_${log.date}`;
      if (empId && !uniqueMap.has(key)) {
        uniqueMap.set(key, log);
      }
    }

    // Also include checked-in Attendance records if no TimeTrack log exists for that user+date
    const Attendance = require('../models/Attendance');
    let attFilter = {};
    if (startDate && endDate) {
      attFilter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      attFilter.date = startDate;
    }

    const attRecords = await Attendance.find(attFilter).populate('user', 'name fullName email role').lean();
    for (const att of attRecords) {
      if (!att.user) continue;
      const empId = att.user._id ? att.user._id.toString() : att.user.toString();
      const key = `${empId}_${att.date}`;
      if (!uniqueMap.has(key)) {
        const formatTimeStr = (dStr) => {
          if (!dStr) return '--';
          const d = new Date(dStr);
          if (isNaN(d.getTime())) return String(dStr);
          return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        };

        const activeSecs = (att.totalHours || 0) * 3600;
        uniqueMap.set(key, {
          _id: att._id.toString(),
          employeeId: att.user,
          date: att.date,
          activeTime: activeSecs,
          idleTime: 0,
          totalTime: activeSecs,
          startTime: att.checkInTime ? formatTimeStr(att.checkInTime) : '--',
          endTime: att.checkOutTime ? formatTimeStr(att.checkOutTime) : '--',
          status: att.status === 'Present' || att.status === 'Half Day' || att.status === 'Late' ? 'completed' : 'not_started',
          pauses: 0,
          breakTime: 0,
          logs: []
        });
      }
    }

    let uniqueLogs = Array.from(uniqueMap.values());

    if (req.user && req.user.role === 'manager') {
      uniqueLogs = uniqueLogs.filter(log => {
        const empRole = (log.employeeId?.role || '').toLowerCase();
        const empName = (log.employeeId?.name || log.employeeId?.fullName || '').toLowerCase();
        if (empRole === 'admin' || empRole === 'hr' || empRole === 'superadmin') return false;
        if (empName.includes('admin') || empName.includes('hr manager')) return false;
        return true;
      });
    } else if (req.user && req.user.role === 'hr') {
      uniqueLogs = uniqueLogs.filter(log => {
        const empRole = (log.employeeId?.role || '').toLowerCase();
        const empName = (log.employeeId?.name || log.employeeId?.fullName || '').toLowerCase();
        if (empRole === 'admin' || empRole === 'superadmin') return false;
        if (empName.includes('admin')) return false;
        return true;
      });
    }

    res.json(uniqueLogs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch all logs', error: err.message });
  }
};

exports.exportTimeLogs = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, role } = req.query;
    let filter = {};

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = startDate;
    }

    if (employeeId) filter.employeeId = employeeId;
    if (role) filter.employeeRole = role;

    const logs = await TimeTrack.find(filter)
      .populate('employeeId', 'name fullName email')
      .sort({ date: -1 });

    const csvRows = [];
    csvRows.push(['Employee Name', 'Role', 'Date', 'Check-in Time', 'Stop Time', 'Pauses', 'Total Break (mins)', 'Total Hours', 'Auto Stop?'].join(','));

    for (const log of logs) {
      const name = log.employeeId?.fullName || log.employeeId?.name || 'Unknown';
      const roleStr = log.employeeRole || 'N/A';
      const date = log.date;
      const checkin = log.startTime ? new Date(log.startTime).toLocaleTimeString() : 'N/A';
      const checkout = log.endTime ? new Date(log.endTime).toLocaleTimeString() : 'N/A';
      const pauses = log.events ? log.events.filter(e => e.type === 'pause').length : 0;
      const totalBreak = Math.floor((log.idleTime || 0) / 60);
      const activeSecs = log.totalActiveTime || log.activeTime || 0;
      const h = Math.floor(activeSecs / 3600);
      const m = Math.floor((activeSecs % 3600) / 60);
      const totalHours = `${h}h ${m}m`;
      const isAuto = log.isAutoStop ? 'Yes' : 'No';

      csvRows.push([
        `"${name}"`,
        `"${roleStr}"`,
        date,
        checkin,
        checkout,
        pauses,
        totalBreak,
        `"${totalHours}"`,
        isAuto
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=hr_logs_${Date.now()}.csv`);
    res.status(200).send(csvRows.join('\n'));
  } catch (err) {
    res.status(500).json({ message: 'Failed to export logs', error: err.message });
  }
};

exports.getCalendarData = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month } = req.query;

    if (req.user.id !== employeeId && req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const regex = new RegExp(`^${month}`);
    const tracks = await TimeTrack.find({ employeeId, date: { $regex: regex } }).select('date totalTime totalActiveTime status');

    res.json(tracks);
  } catch (err) {
    res.status(500).json({ message: 'Calendar data failed', error: err.message });
  }
};

exports.getDailyData = async (req, res) => {
  try {
    const { employeeId, date } = req.params;

    if (req.user.id !== employeeId && req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const track = await TimeTrack.findOne({ employeeId, date });
    if (!track) return res.status(404).json({ message: 'No data for this date' });

    res.json({
      date: track.date,
      startTime: track.startTime,
      endTime: track.endTime,
      totalWorkedDuration: Math.floor((track.activeTime || 0) / 60),
      totalPauseDuration: Math.floor((track.idleTime || 0) / 60),
      pauseEvents: track.sessions ? track.sessions.filter(s => s.pause) : [],
      isAutoStop: track.isAutoStop || false
    });
  } catch (err) {
    res.status(500).json({ message: 'Daily data failed', error: err.message });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const { timeRange, userFilter, roleFilter } = req.query;
    let filter = getRoleFilter(req.user);
    if (userFilter) filter.employeeId = userFilter;
    if (roleFilter) filter.employeeRole = roleFilter;

    const now = new Date();
    const today = getToday();

    if (timeRange === 'weekly' || timeRange === 'week') {
      const d = new Date(); d.setDate(now.getDate() - 7);
      filter.date = { $gte: d.toISOString().split('T')[0] };
    } else if (timeRange === 'monthly' || timeRange === 'month') {
      const d = new Date(); d.setMonth(now.getMonth() - 1);
      filter.date = { $gte: d.toISOString().split('T')[0] };
    } else if (timeRange === 'quarterly' || timeRange === 'quarter') {
      const d = new Date(); d.setMonth(now.getMonth() - 3);
      filter.date = { $gte: d.toISOString().split('T')[0] };
    } else if (timeRange === 'yearly' || timeRange === 'year') {
      const d = new Date(); d.setFullYear(now.getFullYear() - 1);
      filter.date = { $gte: d.toISOString().split('T')[0] };
    } else if (timeRange === 'today') {
      filter.date = today;
    }

    const sessions = await TimeTrack.find(filter).sort({ date: -1, createdAt: -1 }).populate('employeeId', 'name fullName email role').lean();
    const stats = {
      totalTime: sessions.reduce((a, s) => a + (s.activeTime || 0) + (s.idleTime || 0), 0),
      activeTime: sessions.reduce((a, s) => a + (s.activeTime || 0), 0),
      idleTime: sessions.reduce((a, s) => a + (s.idleTime || 0), 0),
      sessions: sessions.length
    };

    const chartMap = {};
    sessions.forEach(s => {
      if (!chartMap[s.date]) chartMap[s.date] = { date: s.date, active: 0, idle: 0, total: 0 };
      chartMap[s.date].active += (s.activeTime || 0) / 3600;
      chartMap[s.date].idle += (s.idleTime || 0) / 3600;
      chartMap[s.date].total += ((s.activeTime || 0) + (s.idleTime || 0)) / 3600;
    });

    res.json({
      stats,
      chartData: Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date)),
      tableData: sessions.map(s => ({
        id: s._id, name: s.employeeId?.name || s.employeeId?.fullName || 'Unknown',
        role: s.employeeId?.role || s.employeeRole || 'N/A',
        status: s.status, todayHours: s.activeTime, lastActivity: s.lastHeartbeat
      })),
      activityLogs: sessions.slice(0, 10).map(s => ({
        name: s.employeeId?.name || s.employeeId?.fullName || 'Unknown', date: s.date,
        activeTime: s.activeTime, status: s.status
      }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Dashboard failed', error: err.message });
  }
};

exports.getDailySummaryLogs = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { range, startDate, endDate, month } = req.query;

    if (req.user.id !== employeeId && req.user.role !== 'admin' && req.user.role !== 'hr' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    let filter = { employeeId };

    if (range === 'month' && month) {
      filter.date = { $regex: `^${month}` };
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    }

    const sessions = await TimeTrack.find(filter).sort({ date: -1, createdAt: -1 });

    const uniqueMap = new Map();
    for (const track of sessions) {
      if (!uniqueMap.has(track.date)) {
        uniqueMap.set(track.date, track);
      }
    }

    const summary = Array.from(uniqueMap.values()).map(track => {
      const isToday = track.date === getToday();
      const isLive = isToday && track.status === 'active';
      return {
        date: track.date,
        checkIn: track.startTime,
        checkOut: track.endTime,
        totalHours: track.activeTime || 0,
        isAutoStop: track.isAutoStop || false,
        isLive,
        status: track.status
      };
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch summary logs', error: err.message });
  }
};

// ============================================================
// 🔧 INTERNAL HELPERS
// ============================================================

/**
 * Flush the current active segment: returns seconds elapsed since segmentStart.
 * Does NOT mutate session — caller adds the result to session.activeTime.
 */
function flushSegment(session, now) {
  if (!session.segmentStart) return 0;
  const elapsed = (now - new Date(session.segmentStart)) / 1000;
  return Math.max(0, Math.floor(elapsed));
}

/**
 * Build the authoritative payload returned to frontend/Electron.
 * Frontend MUST display these values directly — no local math.
 */
function buildPayload(session) {
  return {
    hasActiveSession: session.status !== 'completed',
    status: session.status,
    isRunning: session.isRunning,
    activeTime: Math.floor(session.activeTime || 0),
    idleTime: Math.floor(session.idleTime || 0),
    inactivityCount: session.inactivityCount || 0,
    startTime: session.startTime,
    lastHeartbeat: session.lastHeartbeat,
    segmentStart: session.segmentStart
  };
}
