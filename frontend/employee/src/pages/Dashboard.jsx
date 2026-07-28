import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Clock, Calendar, FileText, TrendingUp, CheckCircle,
  LogIn, LogOut, Sun, Moon, Sunrise, Briefcase, Target,
  ChevronRight, AlertCircle, Star, Bell, Zap
} from 'lucide-react';
import WeeklyAttendanceChart from '@shared/components/WeeklyAttendanceChart';
import { useNavigate } from 'react-router-dom';

// ─── HELPERS ─────────────────────────────────────────────────
const token = () => sessionStorage.getItem('token');
const api = (url, opts = {}) => axios.get(url, { headers: { Authorization: `Bearer ${token()}` }, ...opts });

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', icon: <Sunrise size={20} /> };
  if (h < 17) return { text: 'Good Afternoon', icon: <Sun size={20} /> };
  return { text: 'Good Evening', icon: <Moon size={20} /> };
};

const fmtDate = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

const fmtHrs = (secs) => {
  if (!secs && secs !== 0) return '--';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtCurrency = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '--';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── MINI COMPONENTS ─────────────────────────────────────────

// Custom Tooltip for recharts
const ChartTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs font-medium shadow-lg"
      style={{
        background: isDark ? '#1a2235' : '#fff',
        border: isDark ? '1px solid #1e2d3d' : '1px solid #e2e8f0',
        color: isDark ? '#f1f5f9' : '#0f172a'
      }}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 100 ? fmtHrs(p.value) : p.value}</p>
      ))}
    </div>
  );
};

// Stat Card
const StatCard = ({ icon, iconBg, label, value, sub, trend }) => (
  <div className="stat-card animate-slide-up">
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg || 'var(--accent-muted)' }}>
        {icon}
      </div>
      {trend != null && (
        <span className="badge" style={{
          background: trend >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
          color: trend >= 0 ? '#16a34a' : '#dc2626'
        }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <p className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>{value ?? '--'}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  </div>
);

// Section Card
const Card = ({ title, action, children, className = '' }) => (
  <div className={`glass-card p-5 ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between mb-4">
        {title && <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </div>
);

// Loading skeleton
const Skeleton = ({ h = '20px', w = '100%', className = '' }) => (
  <div className={`shimmer ${className}`} style={{ height: h, width: w, borderRadius: 8 }} />
);

// ─── DASHBOARD ───────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const greeting = getGreeting();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const [profile, setProfile] = useState(null);
  const [timerStatus, setTimerStatus] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [payroll, setPayroll] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Weekly chart data built from dashData
  const [weeklyChart, setWeeklyChart] = useState([]);
  const [monthlyChart, setMonthlyChart] = useState([]);

  const fetchAll = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const [profileRes, timerRes, dashRes, payrollRes, leaveRes, taskRes, notifRes] = await Promise.allSettled([
        api('/api/auth/me'),
        api('/api/time/timer/status'),
        api('/api/time/dashboard?timeRange=weekly'),
        api('/api/payroll/me'),
        api('/api/leaves/my'),
        api('/api/tasks'),
        api('/api/notifications'),
      ]);

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
      if (timerRes.status === 'fulfilled') setTimerStatus(timerRes.value.data);

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        setDashData(d);

        // Build weekly chart
        const chart = WEEK_DAYS.map((day, i) => {
          const dayData = d.chartData?.find(c => {
            const cd = new Date(c.date || c._id);
            return cd.getDay() === (i + 1) % 7;
          });
          return {
            day,
            active: Math.round((dayData?.active || 0) / 3600 * 10) / 10,
            idle: Math.round((dayData?.idle || 0) / 3600 * 10) / 10,
          };
        });
        setWeeklyChart(chart);

        // Build monthly chart (last 12 months placeholder from existing data)
        const monthly = MONTHS.map((month, i) => ({
          month,
          hours: Math.round(Math.random() * 8 + 160),
          target: 176,
        }));
        if (d.chartData?.length > 0) {
          // Use real data if available
          const now = new Date();
          d.chartData.slice(-12).forEach((c, i) => {
            if (monthly[i]) {
              monthly[i].hours = Math.round((c.active || 0) / 3600 * 10) / 10;
            }
          });
        }
        setMonthlyChart(monthly.slice(-6));
      }

      if (payrollRes.status === 'fulfilled') {
        const p = payrollRes.value.data;
        setPayroll(Array.isArray(p) ? p : []);
      }

      if (leaveRes.status === 'fulfilled') {
        const l = leaveRes.value.data;
        setLeaves(Array.isArray(l) ? l : []);
      }

      if (taskRes.status === 'fulfilled') {
        const t = taskRes.value.data;
        const taskArr = Array.isArray(t) ? t : (t?.tasks || []);
        setTasks(taskArr.slice(0, 5));
      }

      if (notifRes.status === 'fulfilled') {
        const n = notifRes.value.data;
        setNotifications(Array.isArray(n) ? n.slice(0, 4) : []);
      }
    } catch (e) {
      console.error('Dashboard fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Check In / Out ─────────────────────────────────────────
  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      await axios.post('/api/attendance/clock-in', {}, { headers: { Authorization: `Bearer ${token()}` } });
      setTimerStatus(s => ({ ...s, isRunning: true }));
      fetchAll(false).catch(() => { });
    } catch (e) {
      // Try time tracker start
      try {
        await axios.post('/api/time/start', {}, { headers: { Authorization: `Bearer ${token()}` } });
        setTimerStatus(s => ({ ...s, isRunning: true }));
        fetchAll(false).catch(() => { });
      } catch { }
    } finally { setCheckInLoading(false); }
  };

  const handleCheckOut = async () => {
    setCheckInLoading(true);
    try {
      await axios.put('/api/attendance/clock-out', {}, { headers: { Authorization: `Bearer ${token()}` } });
      setTimerStatus(s => ({ ...s, isRunning: false }));
      fetchAll(false).catch(() => { });
    } catch (e) {
      try {
        await axios.post('/api/time/stop', {}, { headers: { Authorization: `Bearer ${token()}` } });
        setTimerStatus(s => ({ ...s, isRunning: false }));
        fetchAll(false).catch(() => { });
      } catch { }
    } finally { setCheckInLoading(false); }
  };

  const isCheckedIn = timerStatus?.isRunning;

  // ── Derived stats ──────────────────────────────────────────
  const displayName = profile?.name ||
    (profile?.profile ? `${profile.profile.firstName || ''} ${profile.profile.lastName || ''}`.trim() : '') ||
    'Employee';
  const firstName = displayName.split(' ')[0];

  const weeklyHours = dashData?.stats?.activeTime ? fmtHrs(dashData.stats.activeTime) : '--';
  const leaveBalance = leaves.filter(l => l.status === 'approved').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const latestPayslip = payroll[0];
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;

  // ─── RENDER ──────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-8">

      {/* ─ TOP: Greeting + Check In/Out ─────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--accent)' }}>
            {greeting.icon}
            <span className="text-sm font-medium">{greeting.text}</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {loading ? <Skeleton h="32px" w="200px" /> : `${firstName} 👋`}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmtDate()}</p>
        </div>

        <div className="flex items-center gap-3">
          {isCheckedIn ? (
            <button onClick={handleCheckOut} disabled={checkInLoading}
              className="btn-secondary flex items-center gap-2"
              style={{ borderColor: '#dc2626', color: '#dc2626' }}>
              <LogOut size={16} />
              {checkInLoading ? 'Processing...' : 'Check Out'}
            </button>
          ) : (
            <button onClick={handleCheckIn} disabled={checkInLoading}
              className="btn-primary">
              <LogIn size={16} />
              {checkInLoading ? 'Processing...' : 'Check In'}
            </button>
          )}
          {isCheckedIn && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'var(--accent-muted)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Active</span>
            </div>
          )}
        </div>
      </div>

      {/* ─ STAT CARDS ────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} h="140px" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Clock size={20} style={{ color: 'var(--accent)' }} />}
            iconBg="var(--accent-muted)"
            label="Hours This Week"
            value={weeklyHours}
            sub={`${dashData?.stats?.sessions || 0} sessions`}
          />
          <StatCard
            icon={<Calendar size={20} style={{ color: '#2563eb' }} />}
            iconBg="rgba(37,99,235,0.1)"
            label="Leave Balance"
            value={`${leaveBalance}d`}
            sub={pendingLeaves > 0 ? `${pendingLeaves} pending` : 'No pending'}
          />
          <StatCard
            icon={<FileText size={20} style={{ color: '#9333ea' }} />}
            iconBg="rgba(147,51,234,0.1)"
            label="Latest Payslip"
            value={latestPayslip ? fmtCurrency(latestPayslip.netPay || latestPayslip.amount) : '--'}
            sub={latestPayslip ? `${latestPayslip.month || 'Last month'}` : 'No records'}
          />
          <StatCard
            icon={<Target size={20} style={{ color: '#d97706' }} />}
            iconBg="rgba(217,119,6,0.1)"
            label="Task Progress"
            value={totalTasks ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '--'}
            sub={`${completedTasks}/${totalTasks} completed`}
          />
        </div>
      )}

      {/* ─ CHARTS ROW ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Weekly Attendance Chart */}
        <div className="lg:col-span-3 flex">
          {loading ? <Skeleton h="380px" /> : <WeeklyAttendanceChart />}
        </div>

        {/* Announcements */}
        <Card title="Announcements" className="lg:col-span-2"
          action={
            <Bell size={16} style={{ color: 'var(--text-muted)' }} />
          }>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} h="56px" />)}</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No announcements</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl transition-colors cursor-pointer"
                  style={{ background: 'var(--bg-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-primary)'}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--accent-muted)' }}>
                    <Bell size={14} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {n.message || n.text || 'Notification'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Today'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ─ MONTHLY ATTENDANCE + TASKS ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Monthly Area Chart */}
        <Card title="Monthly Overview" className="lg:col-span-3"
          action={<span className="badge badge-blue">Last 6 Months</span>}>
          {loading ? <Skeleton h="200px" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyChart}>
                <defs>
                  <linearGradient id="gradHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e2d3d' : '#e2e8f0'} />
                <XAxis dataKey="month" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} unit="h" />
                <Tooltip content={<ChartTooltip isDark={isDark} />} />
                <Area type="monotone" dataKey="hours" name="Hours" stroke="var(--accent)"
                  strokeWidth={2} fill="url(#gradHours)" dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="target" name="Target" stroke={isDark ? '#1e2d3d' : '#e2e8f0'}
                  strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Recent Tasks */}
        <Card title="My Tasks" className="lg:col-span-2"
          action={
            <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              {totalTasks} total
            </span>
          }>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} h="44px" />)}</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks assigned</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((t, i) => {
                const done = t.status === 'completed' || t.status === 'done';
                const priority = t.priority || 'medium';
                const priorityColors = { high: '#dc2626', medium: '#d97706', low: '#16a34a' };
                return (
                  <div key={t._id || i}
                    className="flex items-center gap-3 p-2.5 rounded-xl transition-colors"
                    style={{ background: 'var(--bg-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-primary)'}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2`}
                      style={{ borderColor: done ? 'var(--accent)' : 'var(--border)', background: done ? 'var(--accent-muted)' : 'transparent' }}>
                      {done && <CheckCircle size={12} style={{ color: 'var(--accent)' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${done ? 'line-through' : ''}`}
                        style={{ color: done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {t.title || t.name}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: priorityColors[priority] || '#d97706' }}
                      title={`${priority} priority`} />
                  </div>
                );
              })}
              {/* Progress bar */}
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <span>Progress</span>
                  <span>{completedTasks}/{totalTasks}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${totalTasks ? (completedTasks / totalTasks) * 100 : 0}%`, background: 'var(--accent)' }} />
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ─ PAYSLIPS + LEAVE SUMMARY ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Payslips */}
        <Card title="Recent Payslips"
          action={
            <span className="badge badge-green">
              <FileText size={10} className="mr-1 inline" />
              {payroll.length} records
            </span>
          }>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} h="52px" />)}</div>
          ) : payroll.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No payslips yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payroll.slice(0, 4).map((p, i) => (
                <div key={p._id || i}
                  onClick={() => navigate('/employee/payslips')}
                  className="flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer"
                  style={{ background: 'var(--bg-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-primary)'}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--accent-muted)' }}>
                      <FileText size={16} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {p.month || new Date(p.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {p.payPeriod || 'Monthly Salary'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {fmtCurrency(p.netPay || p.amount)}
                    </p>
                    <span className={`badge ${p.status === 'paid' ? 'badge-green' : 'badge-amber'}`}>
                      {p.status || 'pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Leave Summary */}
        <Card title="Leave Summary"
          action={
            <span className="badge badge-blue">{leaves.length} total</span>
          }>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} h="52px" />)}</div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No leave requests</p>
            </div>
          ) : (
            <>
              {/* Status breakdown */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Approved', count: leaves.filter(l => l.status === 'approved').length, color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
                  { label: 'Pending', count: leaves.filter(l => l.status === 'pending').length, color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
                  { label: 'Rejected', count: leaves.filter(l => l.status === 'rejected').length, color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
                ].map((s, i) => (
                  <div key={i} className="text-center py-3 rounded-xl" style={{ background: s.bg }}>
                    <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
                    <p className="text-xs font-medium mt-0.5" style={{ color: s.color }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent leaves */}
              <div className="space-y-2">
                {leaves.slice(0, 3).map((l, i) => (
                  <div key={l._id || i}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'var(--bg-primary)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {l.leaveType || l.type || 'Leave'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {l.startDate ? new Date(l.startDate).toLocaleDateString() : '--'}
                        {l.endDate && l.endDate !== l.startDate ? ` – ${new Date(l.endDate).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <span className={`badge ${l.status === 'approved' ? 'badge-green' :
                      l.status === 'pending' ? 'badge-amber' : 'badge-red'
                      }`}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ─ UPCOMING HOLIDAYS ─────────────────────────────── */}
      <Card title="Upcoming Holidays"
        action={<span className="badge badge-gray">2026</span>}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: 'Independence Day', date: 'Aug 15', day: 'Fri' },
            { name: 'Gandhi Jayanti', date: 'Oct 2', day: 'Fri' },
            { name: 'Dussehra', date: 'Oct 12', day: 'Mon' },
            { name: 'Diwali', date: 'Oct 20', day: 'Tue' },
            { name: 'Christmas', date: 'Dec 25', day: 'Fri' },
            { name: "New Year's", date: 'Jan 1', day: 'Thu' },
          ].map((h, i) => (
            <div key={i} className="text-center p-3 rounded-xl border transition-all hover:shadow-sm hover:-translate-y-0.5"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
              <div className="w-9 h-9 rounded-full mx-auto mb-2 flex items-center justify-center"
                style={{ background: 'var(--accent-muted)' }}>
                <Star size={14} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{h.name}</p>
              <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent)' }}>{h.date} · {h.day}</p>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
};

export default Dashboard;
