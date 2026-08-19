/**
 * ============================================================
 * TIME ENGINE v2 — ELECTRON RENDERER
 * ============================================================
 * IDLE DETECTION: 100% from main process via powerMonitor
 *   → window.addEventListener is NOT used for idle detection
 *   → Only used for UI button clicks
 *
 * ACTIVITY SOURCE: powerMonitor.getSystemIdleTime() in main.js
 *   → Detects activity from Chrome, Word, VS Code, WhatsApp,
 *     File Explorer — ANY app on the PC
 *   → Works even when Electron window is minimized/unfocused
 *
 * DISPLAY: All timer values come from backend poll only
 *   → No local math, no local increments
 * ============================================================
 */

// ── Display state (set by backend only) ───────────────────
let activeSeconds = 0;
let inactiveSeconds = 0;
let status = 'OFFLINE';
let isIdle = false;
let idleNotificationSent = false;
let authToken = '';
let lastStartOrResumeTime = 0;

// ── Local Ticking Engine State (for smooth UI updates) ────
let baseActiveSeconds = 0;
let segmentStartTime = null;
let isSessionRunning = false;
let baseInactiveSeconds = 0;
let idleStartTime = null;

// Local clock loop for smooth UI ticking using real elapsed timestamps
setInterval(() => {
  if (status === 'ACTIVE' && isSessionRunning) {
    if (segmentStartTime) {
      const elapsed = Math.floor((Date.now() - segmentStartTime) / 1000);
      activeSeconds = baseActiveSeconds + Math.max(0, elapsed);
    } else {
      activeSeconds += 1;
    }
    updateDisplay();
  } else if (status === 'IDLE') {
    // 🛡️ When IDLE: Active Work Time is strictly frozen, Idle Time calculates from real elapsed timestamps
    if (idleStartTime) {
      const idleElapsed = Math.floor((Date.now() - idleStartTime) / 1000);
      inactiveSeconds = baseInactiveSeconds + Math.max(0, idleElapsed);
    } else {
      inactiveSeconds += 1;
    }
    updateDisplay();
  }
}, 1000);

// ── Intervals ─────────────────────────────────────────────
let pollInterval = null;  // polls /status every 1s
let heartbeatInterval = null; // sends /activity every 10s

// ── Screenshot ────────────────────────────────────────────
let screenshotTimeout = null;

// ── Idle Reminder (every 3 minutes while paused/idle) ────
let idleReminderInterval = null;
const IDLE_REMINDER_MS = 3 * 60 * 1000; // 3 minutes

// ── Socket ────────────────────────────────────────────────
let socket = null;

// ── Config ────────────────────────────────────────────────
let BACKEND_HOST = 'https://hrm1.onrender.com';
let API_BASE = `${BACKEND_HOST}/api/time`;
const POLL_MS = 1000;   // 1s display refresh
const HEARTBEAT_MS = 10000;  // 10s heartbeat to backend

// ── DOM refs ──────────────────────────────────────────────
const activeTimerEl = document.getElementById('active-timer');
const inactiveTimerEl = document.getElementById('inactive-timer');
const statusEl = document.getElementById('status-display');
const syncIndicator = document.getElementById('sync-indicator');

// ============================================================
// 🌐 SYSTEM-WIDE IDLE DETECTION
// ============================================================
// Receives idleSeconds from powerMonitor.getSystemIdleTime()
// in the main process — covers ALL applications on the PC.
// This is the ONLY source for idle detection.
// window.addEventListener is NOT used for this purpose.
// ============================================================
if (window.electronAPI?.onSystemIdleStatus) {
  window.electronAPI.onSystemIdleStatus(({ idleSeconds, isIdle: systemIsIdle }) => {
    lastSystemIdleSeconds = idleSeconds;

    // 🛡️ Never trigger idle if session was started or resumed less than 60 seconds ago
    if (Date.now() - lastStartOrResumeTime < 60000) {
      return;
    }

    if (systemIsIdle && idleSeconds >= 60) {
      // Only trigger once per idle event
      if (status === 'ACTIVE' && !idleNotificationSent) {
        triggerIdle(idleSeconds);
      }
    } else if (idleSeconds < 5) {
      // Activity detected anywhere on PC
      if (status === 'ACTIVE') {
        idleNotificationSent = false;
        isIdle = false;
      }
    }
  });
}

// Track last known system idle seconds (for heartbeat type decision)
let lastSystemIdleSeconds = 0;

// ============================================================
// 🔄 STARTUP
// ============================================================
async function loadSession() {
  requestNotificationPermission();

  try {
    const version = await window.electronAPI.getAppVersion();
    const versionDisplayEl = document.getElementById('version-display');
    if (versionDisplayEl && version) {
      versionDisplayEl.innerText = `V${version} PRO`;
    }
  } catch (err) {
    console.error('Failed to get app version:', err);
  }

  BACKEND_HOST = 'https://hrm1.onrender.com';
  const candidateHosts = [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  for (const host of candidateHosts) {
    try {
      const res = await fetch(`${host}/api/health`).catch(() => null);
      if (res && res.ok) {
        BACKEND_HOST = host;
        console.log(`🔌 Local development backend detected! Connected to ${host}`);
        break;
      }
    } catch (_) {}
  }
  API_BASE = `${BACKEND_HOST}/api/time`;

  const savedToken = await window.electronAPI.getStoreValue('authToken');
  if (!savedToken) {
    showAuthSection();
    return;
  }
  authToken = savedToken;
  hideAuthSection();
  await fetchUserProfile();
  initSocket();
  await pollSessionStatus();
  startPolling();
  startHeartbeat();
}

loadSession();

// ============================================================
// 📡 POLL /status — apply backend values directly, no local math
// ============================================================
async function pollSessionStatus() {
  if (!authToken) return;
  try {
    const res = await fetch(`${API_BASE}/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status === 401) {
      logout();
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    applyServerState(data);
  } catch (err) {
    console.error('[POLL ERROR]', err.message);
  }
}

function applyServerState(data) {
  if (!data?.hasActiveSession) {
    status = 'OFFLINE';
    activeSeconds = 0;
    inactiveSeconds = 0;
    isIdle = false;
    isSessionRunning = false;
    segmentStartTime = null;
    stopPolling();
    stopHeartbeat();
    stopScreenshotLoop();
    updateDisplay();
    updateUI();
    return;
  }

  const serverStatus = String(data.status || '').toLowerCase();

  if (serverStatus === 'idle') {
    status = 'IDLE';
    isIdle = true;
    isSessionRunning = false;
    segmentStartTime = null;

    if (data.idleTime !== undefined && data.idleTime > 0) {
      baseInactiveSeconds = Math.max(baseInactiveSeconds, data.idleTime);
      if (!idleStartTime) {
        inactiveSeconds = baseInactiveSeconds;
      }
    }

    // 🛡️ When IDLE: Prefer the higher of local committed activeSeconds or server activeTime to prevent backward rewinds
    if (data.activeTime !== undefined && data.activeTime > 0) {
      baseActiveSeconds = Math.max(baseActiveSeconds, data.activeTime);
      activeSeconds = baseActiveSeconds;
    }
  } else if (serverStatus === 'active' && data.isRunning) {
    status = 'ACTIVE';
    isIdle = false;
    idleNotificationSent = false;
    isSessionRunning = true;
    idleStartTime = null;
    baseActiveSeconds = data.activeTime ?? baseActiveSeconds;
    baseInactiveSeconds = data.idleTime ?? baseInactiveSeconds;
    inactiveSeconds = baseInactiveSeconds;
    segmentStartTime = data.segmentStart ? new Date(data.segmentStart).getTime() : segmentStartTime;

    if (segmentStartTime) {
      const elapsed = Math.floor((Date.now() - segmentStartTime) / 1000);
      activeSeconds = baseActiveSeconds + Math.max(0, elapsed);
    } else {
      activeSeconds = baseActiveSeconds;
    }

    if (!screenshotTimeout) {
      initScreenshotLoop(true);
    }
  } else if (serverStatus === 'paused') {
    status = 'PAUSED';
    isIdle = false;
    isSessionRunning = false;
    segmentStartTime = null;
    baseActiveSeconds = data.activeTime ?? baseActiveSeconds;
    inactiveSeconds = data.idleTime ?? inactiveSeconds;
    activeSeconds = baseActiveSeconds;
  } else if (serverStatus === 'completed') {
    status = 'OFFLINE';
    isIdle = false;
    isSessionRunning = false;
    segmentStartTime = null;
    baseActiveSeconds = data.activeTime ?? baseActiveSeconds;
    inactiveSeconds = data.idleTime ?? inactiveSeconds;
    activeSeconds = baseActiveSeconds;
  }

  updateDisplay();
  updateUI();
}

// ============================================================
// 💓 HEARTBEAT — sends activity type to backend every 10s
// ============================================================
async function sendHeartbeat() {
  if (!authToken || status !== 'ACTIVE') return;
  // Use system idle seconds from powerMonitor to decide type
  const type = lastSystemIdleSeconds === 0 ? 'heartbeat' : 'active';
  try {
    syncIndicator?.classList.add('online');
    await fetch(`${API_BASE}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ type })
    });
    setTimeout(() => syncIndicator?.classList.remove('online'), 2000);
  } catch (err) {
    console.error('[HEARTBEAT ERROR]', err.message);
  }
}

// ── Immediately fire idle signal to backend ───────────────
async function triggerIdle(idleSeconds = 60) {
  if (!authToken || status !== 'ACTIVE') return;

  // 🚀 OPTIMISTIC UI: Instantly pause active timer and preserve exact active work time
  status = 'IDLE';
  isIdle = true;
  isSessionRunning = false;

  // Commit current elapsed segment to baseActiveSeconds so it freezes at exact current value
  if (segmentStartTime) {
    const elapsed = Math.floor((Date.now() - segmentStartTime) / 1000);
    baseActiveSeconds += Math.max(0, elapsed);
    segmentStartTime = null;
  }
  activeSeconds = baseActiveSeconds;

  // 🕒 Record exact idle start timestamp (accounting for initial idleSeconds already elapsed)
  idleStartTime = Date.now() - (idleSeconds * 1000);
  inactiveSeconds = baseInactiveSeconds + idleSeconds;

  updateDisplay();
  updateUI();

  idleNotificationSent = true;
  showIdleNotification();
  try {
    syncIndicator?.classList.add('online');
    const res = await fetch(`${API_BASE}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ type: 'idle', idleSeconds }) // 🎯 Send exact duration
    });
    const data = await res.json();
    if (data) applyServerState(data);
    setTimeout(() => syncIndicator?.classList.remove('online'), 2000);
  } catch (err) {
    console.error('[IDLE TRIGGER ERROR]', err.message);
    idleNotificationSent = false;
  }
}

// ============================================================
// 🟢 START
// ============================================================
async function startSession() {
  if (!authToken) return alert('Please login first.');
  try {
    const res = await fetch(`${API_BASE}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status === 401) {
      logout();
      alert('Session expired. Please log in again.');
      return;
    }
    if (!res.ok) {
      const err = await res.json();
      return alert(err.message || 'Unable to start session.');
    }
    // 🔔 Trigger notification IMMEDIATELY on success (fixes delayed notification bug)
    notifyDesktop('Session Started', 'Your tracking session is now active.');

    stopIdleReminderLoop();
    idleNotificationSent = false;
    lastStartOrResumeTime = Date.now();
    await pollSessionStatus();
    startPolling();
    startHeartbeat();
    initScreenshotLoop(true);
  } catch (err) {
    console.error('[START ERROR]', err);
    alert('Connection error. Is the server running?');
  }
}

// ============================================================
// ⏸️ PAUSE
// ============================================================
async function pauseSession() {
  if (!authToken || status === 'PAUSED') return;
  try {
    const res = await fetch(`${API_BASE}/pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) {
      const err = await res.json();
      if (!err.message?.toLowerCase().includes('already')) alert(err.message || 'Unable to pause.');
    }
    stopScreenshotLoop();
    await pollSessionStatus();
    await notifyDesktop('Session Paused', 'Your tracking session has been paused. Please resume when you are back.');
    startIdleReminderLoop();
  } catch (err) {
    console.error('[PAUSE ERROR]', err);
    alert('Unable to pause session.');
  }
}

// ============================================================
// ▶️ RESUME
// ============================================================
async function resumeSession() {
  if (!authToken) return alert('Please login first.');

  // 🕒 Commit accumulated idle duration to baseInactiveSeconds
  if (idleStartTime) {
    const idleDuration = Math.floor((Date.now() - idleStartTime) / 1000);
    baseInactiveSeconds += Math.max(0, idleDuration);
    idleStartTime = null;
  }
  inactiveSeconds = baseInactiveSeconds;

  // 🚀 OPTIMISTIC UI: Instantly clear idle status and banner
  status = 'ACTIVE';
  isIdle = false;
  isSessionRunning = true;
  segmentStartTime = Date.now(); // 🎯 Start fresh active segment
  idleNotificationSent = false;
  lastStartOrResumeTime = Date.now();
  updateUI();

  try {
    const res = await fetch(`${API_BASE}/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) {
      const err = await res.json();
      if (!err.message?.toLowerCase().includes('already')) alert(err.message || 'Unable to resume.');
    }
    stopIdleReminderLoop();
    await pollSessionStatus();
    startPolling();
    startHeartbeat();
    initScreenshotLoop(true);
    await notifyDesktop('Session Resumed', 'Your tracking session is now active.');
  } catch (err) {
    console.error('[RESUME ERROR]', err);
    alert('Unable to resume session.');
  }
}

// ============================================================
// 🔴 STOP / CHECK OUT (With Confirmation)
// ============================================================
function showCheckoutConfirmationModal() {
  const modal = document.getElementById('checkout-confirm-section');
  if (modal) modal.style.display = 'flex';
}

function hideCheckoutConfirmationModal() {
  const modal = document.getElementById('checkout-confirm-section');
  if (modal) modal.style.display = 'none';
}

async function stopSession() {
  if (!authToken) return alert('Please login first.');
  showCheckoutConfirmationModal();
}

async function confirmStopSession() {
  hideCheckoutConfirmationModal();
  if (!authToken) return alert('Please login first.');
  try {
    const res = await fetch(`${API_BASE}/stop`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) {
      const err = await res.json();
      return alert(err.message || 'Unable to stop session.');
    }
    stopPolling();
    stopHeartbeat();
    stopScreenshotLoop();
    stopIdleReminderLoop();
    idleNotificationSent = false;
    await pollSessionStatus();
    await notifyDesktop('Workday Ended', 'You have successfully checked out for today.');
  } catch (err) {
    console.error('[STOP ERROR]', err);
    alert('Unable to stop session.');
  }
}

// ============================================================
// 🖥️ UI
// ============================================================
function updateDisplay() {
  if (activeTimerEl) activeTimerEl.innerText = formatTime(activeSeconds);
  if (inactiveTimerEl) inactiveTimerEl.innerText = formatTime(inactiveSeconds);
}

function updateUI() {
  setControlState(status);
  const alertBox = document.getElementById('desktop-alert');
  if (alertBox) alertBox.style.display = (status === 'IDLE') ? 'flex' : 'none';
}

function setControlState(currentStatus) {
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const stopBtn = document.getElementById('stop-btn');
  const binaryControls = document.querySelector('.binary-controls');
  if (!startBtn || !pauseBtn || !resumeBtn || !binaryControls) return;

  const isActuallyActive = currentStatus === 'ACTIVE' && !isIdle;

  if (currentStatus === 'OFFLINE') {
    startBtn.style.display = 'flex';
    binaryControls.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
    if (statusEl) { statusEl.innerText = 'OFFLINE'; statusEl.className = 'status-badge'; }
    const alertEl = document.getElementById('desktop-alert');
    if (alertEl) alertEl.style.display = 'none';
  } else if (isActuallyActive) {
    startBtn.style.display = 'none';
    binaryControls.style.display = 'flex';
    pauseBtn.style.display = 'flex';
    resumeBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'flex';
    if (statusEl) { statusEl.innerText = 'ACTIVE'; statusEl.className = 'status-badge status-active'; }
    const alertEl = document.getElementById('desktop-alert');
    if (alertEl) alertEl.style.display = 'none';
  } else {
    startBtn.style.display = 'none';
    binaryControls.style.display = 'flex';
    pauseBtn.style.display = 'none';
    resumeBtn.style.display = 'flex';
    if (stopBtn) stopBtn.style.display = 'flex';
    if (statusEl) {
      statusEl.innerText = isIdle ? 'IDLE' : currentStatus;
      statusEl.className = 'status-badge status-idle';
    }
  }
}

// ============================================================
// ⏱️ INTERVALS
// ============================================================
function startPolling() {
  if (pollInterval) return;
  pollInterval = setInterval(pollSessionStatus, POLL_MS);
}
function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}
function startHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_MS);
}
function stopHeartbeat() {
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
}

// ============================================================
// 🔔 NOTIFICATIONS
// ============================================================
let lastNotificationTs = 0;

async function notifyDesktop(title, body) {
  const now = Date.now();
  if (now - lastNotificationTs < 5000) return;
  lastNotificationTs = now;
  if (window.electronAPI?.notifyNative) {
    try { await window.electronAPI.notifyNative(title, body); return; } catch (_) { }
  }
  if (window.Notification?.permission === 'granted') {
    new window.Notification(title, { body });
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

async function showIdleNotification() {
  await notifyDesktop('Inactivity Detected', 'Timer is paused due to inactivity. Please start the timer.');
  const alertEl = document.getElementById('desktop-alert');
  if (alertEl) {
    const titleEl = alertEl.querySelector('.alert-title');
    const textEl = alertEl.querySelector('.alert-text');
    if (titleEl) titleEl.innerText = 'Inactivity Detected';
    if (textEl) textEl.innerText = 'Timer is paused. Please resume the timer.';
    alertEl.style.display = 'flex';
  }
  startIdleReminderLoop();
}

function startIdleReminderLoop() {
  if (idleReminderInterval) clearInterval(idleReminderInterval);
  idleReminderInterval = setInterval(async () => {
    if (status === 'IDLE' || status === 'PAUSED') {
      await notifyDesktop('Timer Paused', 'Your timer is paused. Please resume / start the timer to track your work.');
    } else {
      stopIdleReminderLoop();
    }
  }, IDLE_REMINDER_MS);
}

function stopIdleReminderLoop() {
  if (idleReminderInterval) {
    clearInterval(idleReminderInterval);
    idleReminderInterval = null;
  }
}

// ============================================================
// 📸 SCREENSHOTS
// ============================================================
async function takeScreenshot() {
  if (status !== 'ACTIVE' || !authToken) return;
  try {
    const dataUrl = await window.electronAPI.captureScreen();
    if (!dataUrl) return;
    const userRes = await fetch(`${BACKEND_HOST}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const user = await userRes.json();
    await fetch(`${BACKEND_HOST}/api/screenshot/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        screenshot: dataUrl,
        userId: user.id || user._id
      })
    });
    await notifyDesktop('Screenshot Captured', 'A monitoring trace has been recorded.');
  } catch (err) {
    console.error('[SCREENSHOT ERROR]', err);
  } finally {
    initScreenshotLoop();
  }
}

function initScreenshotLoop(isFirst = false) {
  if (screenshotTimeout) clearTimeout(screenshotTimeout);
  if (status !== 'ACTIVE') return;
  const randomMs = isFirst ? 10000 : 60000; // First screenshot in 10s, then every 60s
  screenshotTimeout = setTimeout(takeScreenshot, randomMs);
}

function stopScreenshotLoop() {
  if (screenshotTimeout) { clearTimeout(screenshotTimeout); screenshotTimeout = null; }
}

// ============================================================
// 👤 USER PROFILE
// ============================================================
async function fetchUserProfile() {
  if (!authToken) return;
  try {
    const res = await fetch(`${BACKEND_HOST}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status === 401) {
      logout();
      return;
    }
    if (!res.ok) return;
    const user = await res.json();
    const nameEl = document.getElementById('display-name');
    const roleEl = document.getElementById('display-role');
    const profileEl = document.getElementById('user-profile-display');
    if (nameEl) nameEl.innerText = user.name || 'System User';
    if (roleEl) roleEl.innerText = user.role || 'Personnel';
    if (profileEl) profileEl.style.display = 'block';
  } catch (err) {
    console.error('[PROFILE ERROR]', err);
  }
}

// ============================================================
// 🔌 SOCKET
// ============================================================
async function initSocket() {
  if (socket || !authToken) return;
  try {
    const res = await fetch(`${BACKEND_HOST}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const user = await res.json();
    if (!user?.id && !user?._id) return;
    socket = io(BACKEND_HOST);
    socket.on('connect', () => {
      socket.emit('join_notifications', { userId: user._id || user.id, role: user.role });
    });
    socket.on('timer_paused', (data) => { if (data) applyServerState(data); });
    socket.on('timer_resumed', (data) => {
      idleNotificationSent = false;
      if (data) applyServerState(data);
      else pollSessionStatus();
    });
    socket.on('timer_update', (data) => { if (data) applyServerState(data); });
    socket.on('new_notification', (notif) => {
      if (window.electronAPI?.notifyNative) {
        window.electronAPI.notifyNative('New Announcement', notif.message).catch(() => { });
      } else if (window.Notification?.permission === 'granted') {
        new window.Notification('New Announcement', { body: notif.message });
      }
    });
  } catch (err) {
    console.error('[SOCKET ERROR]', err);
  }
}

// ============================================================
// 🔐 AUTH
// ============================================================
function showAuthSection() {
  const authEl = document.getElementById('auth-section');
  if (authEl) authEl.style.display = 'flex';
  status = 'OFFLINE';
  updateUI();
}

function hideAuthSection() {
  const authEl = document.getElementById('auth-section');
  if (authEl) authEl.style.display = 'none';
}

function redirectToWebLogin() {
  const loginUrl = `${BACKEND_HOST}/login?desktop=true`;
  if (window.electronAPI?.openExternal) {
    window.electronAPI.openExternal(loginUrl);
  } else {
    window.open(loginUrl, '_blank');
  }
}

if (window.electronAPI?.onDeepLinkToken) {
  window.electronAPI.onDeepLinkToken(async (token) => {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) errorEl.style.display = 'none';

    console.log('Auth token received via deep link.');
    authToken = token;
    await window.electronAPI.setStoreValue('authToken', authToken);
    hideAuthSection();
    await fetchUserProfile();
    initSocket();
    await pollSessionStatus();
    startPolling();
    startHeartbeat();
    updateUI();
  });
}

if (window.electronAPI?.onDeepLinkAction) {
  window.electronAPI.onDeepLinkAction(async (action) => {
    console.log('[Remote/DeepLink Action]', action);
    if (!authToken) {
      authToken = await window.electronAPI.getStoreValue('authToken');
    }
    if (action === 'start') {
      if (authToken) {
        hideAuthSection();
        await startSession();
      }
    } else if (action === 'stop') {
      if (authToken) {
        await stopSession();
      }
    } else if (action === 'pause') {
      if (authToken) {
        await pauseSession();
      }
    }
  });
}

async function logout() {
  const currentToken = authToken;
  const currentSocket = socket;
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  // 1. Tell backend to stop tracking and record logout
  if (currentToken) {
    try {
      await fetch(`${API_BASE}/desktop-logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoutTime: nowStr })
      }).catch(() => {});

      await fetch(`${API_BASE}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' }
      }).catch(() => {});
    } catch (e) {
      console.error('[LOGOUT NOTIFICATION ERROR]', e);
    }
  }

  // 2. Emit socket event
  if (currentSocket) {
    try {
      let userId = null;
      if (currentToken) {
        try {
          userId = JSON.parse(atob(currentToken.split('.')[1]))?.id;
        } catch (_) {}
      }
      currentSocket.emit('desktop_logout', { userId, timestamp: nowStr });
    } catch (_) {}
    currentSocket.disconnect();
    socket = null;
  }

  authToken = '';
  await window.electronAPI.setStoreValue('authToken', '');
  stopPolling();
  stopHeartbeat();
  stopScreenshotLoop();
  stopIdleReminderLoop();
  activeSeconds = 0;
  inactiveSeconds = 0;
  status = 'OFFLINE';
  isIdle = false;
  updateDisplay();
  showAuthSection();
  const profileEl = document.getElementById('user-profile-display');
  if (profileEl) profileEl.style.display = 'none';
}

// ============================================================
// 🔧 UTILS
// ============================================================
function formatTime(s) {
  const total = Math.max(0, Math.round(s || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ============================================================
// 🎛️ EVENT BINDINGS — UI buttons only, NOT for idle detection
// ============================================================
document.getElementById('start-btn')?.addEventListener('click', startSession);
document.getElementById('pause-btn')?.addEventListener('click', pauseSession);
document.getElementById('resume-btn')?.addEventListener('click', resumeSession);
document.getElementById('stop-btn')?.addEventListener('click', stopSession);
document.getElementById('confirm-checkout-btn')?.addEventListener('click', confirmStopSession);
document.getElementById('cancel-checkout-btn')?.addEventListener('click', hideCheckoutConfirmationModal);
document.getElementById('minimize-btn')?.addEventListener('click', () => window.electronAPI.minimizeApp());
document.getElementById('close-btn')?.addEventListener('click', () => window.electronAPI.closeApp());
document.getElementById('web-auth-btn')?.addEventListener('click', redirectToWebLogin);
document.getElementById('logout-btn')?.addEventListener('click', logout);
document.getElementById('auth-minimize-btn')?.addEventListener('click', () => window.electronAPI.minimizeApp());
document.getElementById('auth-close-btn')?.addEventListener('click', () => window.electronAPI.closeApp());

// Re-poll when window regains focus (catches state changes while minimized)
window.addEventListener('focus', () => { if (authToken) pollSessionStatus(); });
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && authToken) pollSessionStatus();
});

// ── Window Controls ─────────────────────────────────────
document.getElementById('minimize-btn')?.addEventListener('click', () => {
  window.electronAPI.minimizeApp();
});
document.getElementById('close-btn')?.addEventListener('click', () => {
  window.electronAPI.closeApp();
});
document.getElementById('auth-minimize-btn')?.addEventListener('click', () => {
  window.electronAPI.minimizeApp();
});
document.getElementById('auth-close-btn')?.addEventListener('click', () => {
  window.electronAPI.closeApp();
});

// ── Custom Auto-Updater Modal Logic ─────────────────────
if (window.electronAPI?.onUpdateDownloaded) {
  window.electronAPI.onUpdateDownloaded(() => {
    const updateSection = document.getElementById('update-section');
    if (updateSection) {
      updateSection.style.display = 'flex';
    }
  });
}

document.getElementById('update-restart-btn')?.addEventListener('click', () => {
  if (window.electronAPI?.installUpdate) {
    window.electronAPI.installUpdate();
  }
});

document.getElementById('update-later-btn')?.addEventListener('click', () => {
  const updateSection = document.getElementById('update-section');
  if (updateSection) {
    updateSection.style.display = 'none';
  }
});
