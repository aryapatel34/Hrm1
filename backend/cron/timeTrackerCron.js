const cron = require('node-cron');
const TimeTrack = require('../models/TimeTrack');
const { autoRejectExpiredLeaves } = require('../utils/leaveUtils');
const { performBulkImport } = require('../controllers/holidayController');

function initCronJobs() {
  // Run on server startup to auto-reject any pending leaves whose dates have passed & sync holidays
  autoRejectExpiredLeaves();
  performBulkImport().catch(err => console.error('[CRON] Startup holiday sync failed:', err));

  // Run every night at midnight to sync google holidays automatically
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running midnight Google Public Holiday auto-sync...');
    try {
      await performBulkImport();
    } catch (err) {
      console.error('[CRON] Midnight holiday auto-sync failed:', err);
    }
  });

  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Running hourly check to auto-reject expired leaves...');
    await autoRejectExpiredLeaves();
  });

  // Run every night at midnight (0 0 * * *)
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running midnight auto-stop for active time tracker sessions & expired leaves...');
    await autoRejectExpiredLeaves();
    try {
      const now = new Date();
      // Find all sessions that are not completed
      const sessions = await TimeTrack.find({ status: { $in: ['active', 'paused', 'idle'] } });

      for (const session of sessions) {
        // Close segment if active
        if (session.status === 'active' && session.segmentStart) {
          const elapsed = (now - new Date(session.segmentStart)) / 1000;
          session.activeTime += Math.max(0, Math.floor(elapsed));
        }

        session.segmentStart = null;
        session.endTime = now;
        session.status = 'completed';
        session.isRunning = false;
        session.isAutoStop = true;
        session.totalWorkedDuration = Math.round((session.activeTime || 0) / 60);

        const lastIdx = session.sessions.length - 1;
        if (lastIdx >= 0) session.sessions[lastIdx].end = now;

        // Auto resume any pending pause
        const lastPauseIdx = session.pauseEvents.length - 1;
        if (lastPauseIdx >= 0 && !session.pauseEvents[lastPauseIdx].resumeTime) {
          session.pauseEvents[lastPauseIdx].resumeTime = now;
          const dur = Math.max(0, Math.round((now - session.pauseEvents[lastPauseIdx].pauseTime) / 60000));
          session.pauseEvents[lastPauseIdx].durationMinutes = dur;
          session.totalPauseDuration += dur;
        }

        await session.save();
        console.log(`[CRON] Auto-stopped session for employee: ${session.employeeId}`);
      }
    } catch (err) {
      console.error('[CRON] Failed to run midnight auto-stop', err);
    }
  });
}

module.exports = initCronJobs;
