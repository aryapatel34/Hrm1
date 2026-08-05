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

// Local clock loop for smooth UI ticking (matches Web App behavior)
setInterval(() => {
  if (isSessionRunning && segmentStartTime) {
    const elapsed = Math.floor((Date.now() - segmentStartTime) / 1000);
    activeSeconds = baseActiveSeconds + Math.max(0, elapsed);
    updateDisplay();
  }
}, 500);

// ── Intervals ─────────────────────────────────────────────
let pollInterval = null;  // polls /status every 1s
let heartbeatInterval = null; // sends /activity every 10s

// ── Screenshot ────────────────────────────────────────────
let screenshotTimeout = null;

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

    console.log('IDLE STATUS:', { idleSeconds, isIdle: systemIsIdle });

    if (systemIsIdle) {
      // ── System has been idle >= threshold ──
      // Ignore idle triggers during the first 15 seconds of starting/resuming
      if (Date.now() - lastStartOrResumeTime < 15000) {
        console.log('[IDLE IGNORED] Ignoring system idle trigger during start/resume grace period.');
        return;
      }
      // Only trigger once per idle event (idleNotificationSent guards re-entry)
      if (status === 'ACTIVE' && !idleNotificationSent) {
        console.log(`[IDLE TRIGGER] ${idleSeconds}s idle — sending idle signal to backend`);
        triggerIdle(idleSeconds);
      }
    } else {
      // ── Activity detected anywhere on PC ──
      // idleSeconds < threshold means keyboard/mouse used in any app
      // No local timer math — just used to decide heartbeat type
      lastSystemIdleSeconds = idleSeconds;
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
  try {
    const localPing = await fetch('http://localhost:4000/api/time/status').catch(() => null);
    if (localPing && (localPing.ok || localPing.status === 401)) {
      BACKEND_HOST = 'http://localhost:4000';
      console.log('🔌 Local development backend detected! Connected to http://localhost:4000');
    }
  } catch (e) {}
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

  // Set display values directly from backend
  baseActiveSeconds = data.activeTime ?? 0;
  inactiveSeconds = data.idleTime ?? 0;
  segmentStartTime = data.segmentStart ? new Date(data.segmentStart).getTime() : null;
  isSessionRunning = data.isRunning;

  // Calculate immediate activeSeconds to avoid delay on poll response
  if (isSessionRunning && segmentStartTime) {
    const elapsed = Math.floor((Date.now() - segmentStartTime) / 1000);
    activeSeconds = baseActiveSeconds + Math.max(0, elapsed);
  } else {
    activeSeconds = baseActiveSeconds;
  }

  const serverStatus = String(data.status || '').toLowerCase();

  if (serverStatus === 'active' && data.isRunning) {
    status = 'ACTIVE';
    isIdle = false;
    idleNotificationSent = false;
    if (!screenshotTimeout) {
      initScreenshotLoop(true);
    }
  } else if (serverStatus === 'idle') {
    status = 'IDLE';
    isIdle = true;
    if (!idleNotificationSent) {
      idleNotificationSent = true;
      showIdleNotification();
    }
  } else if (serverStatus === 'paused') {
    status = 'PAUSED';
    isIdle = false;
  } else if (serverStatus === 'completed') {
    status = 'OFFLINE';
    isIdle = false;
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

  // 🚀 OPTIMISTIC UI: Show idle state instantly on screen
  status = 'IDLE';
  isIdle = true;
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
    if (data) applyServerState({ hasActiveSession: true, ...data });
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
    await notifyDesktop('Session Paused', 'Your tracking session has been paused.');
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
  try {
    const res = await fetch(`${API_BASE}/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) {
      const err = await res.json();
      if (!err.message?.toLowerCase().includes('already')) alert(err.message || 'Unable to resume.');
    }
    idleNotificationSent = false;
    lastStartOrResumeTime = Date.now();
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
// 🔴 STOP
// ============================================================
async function stopSession() {
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
    idleNotificationSent = false;
    await pollSessionStatus();
    await notifyDesktop('Session Stopped', 'Your tracking session has ended.');
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
  const binaryControls = document.querySelector('.binary-controls');
  if (!startBtn || !pauseBtn || !resumeBtn || !binaryControls) return;

  const isActuallyActive = currentStatus === 'ACTIVE' && !isIdle;

  if (currentStatus === 'OFFLINE') {
    startBtn.style.display = 'flex';
    binaryControls.style.display = 'none';
    if (statusEl) { statusEl.innerText = 'OFFLINE'; statusEl.className = 'status-badge'; }
  } else if (isActuallyActive) {
    startBtn.style.display = 'none';
    binaryControls.style.display = 'flex';
    pauseBtn.style.display = 'flex';
    resumeBtn.style.display = 'none';
    if (statusEl) { statusEl.innerText = 'ACTIVE'; statusEl.className = 'status-badge status-active'; }
  } else {
    startBtn.style.display = 'none';
    binaryControls.style.display = 'flex';
    pauseBtn.style.display = 'none';
    resumeBtn.style.display = 'flex';
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
  await notifyDesktop('Inactivity Detected', 'Timer paused. 1 minute moved to idle time.');
  const alertEl = document.getElementById('desktop-alert');
  if (alertEl) {
    const titleEl = alertEl.querySelector('.alert-title');
    const textEl = alertEl.querySelector('.alert-text');
    if (titleEl) titleEl.innerText = 'Inactivity Detected';
    if (textEl) textEl.innerText = 'Timer paused. Resume when ready.';
    alertEl.style.display = 'flex';
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
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  authToken = '';
  await window.electronAPI.setStoreValue('authToken', '');
  stopPolling();
  stopHeartbeat();
  stopScreenshotLoop();
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
