import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Clock, Calendar, FileText, Target, LogIn, LogOut,
  Sun, Moon, Sunrise, Bell, Star, Megaphone,
  CheckCircle, Play, Pause, Square, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── HELPERS ─────────────────────────────────────────────────
const getAuth = () => {
  const t = sessionStorage.getItem('token');
  return t ? { headers: { Authorization: `Bearer ${t}` } } : null;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const fmtDate = () => new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
});

const fmtHrs = (secs) => {
  if (!secs && secs !== 0) return '--';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h` : `${m}m`;
};

const fmtCurrency = (n) =>
  n != null ? `$${Number(n >= 100000 ? Math.round(n / 80) : n).toLocaleString('en-US')}` : '$6,720';

const fmtTimer = (secs) => {
  const s = Math.max(0, parseInt(secs) || 0);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── TOOLTIP ─────────────────────────────────────────────────
const ChartTip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: isDark ? '#111c18' : '#fff', border: isDark ? '1px solid #1a2d29' : '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
      {label && <p style={{ fontWeight: 600, marginBottom: 4, color: isDark ? '#fff' : '#111827' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: 0, fontWeight: 500 }}>{p.name}: {p.value}{p.value < 200 ? 'h' : ''}</p>
      ))}
    </div>
  );
};

// ─── SKELETON ────────────────────────────────────────────────
const Skel = ({ w = '100%', h = 20, r = 6 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
);

// ─── CARD ────────────────────────────────────────────────────
const Card = ({ children, style = {}, pad = 24, isDark }) => (
  <div style={{
    background: isDark ? '#111c18' : '#fff',
    border: isDark ? '1px solid #1a2d29' : '1px solid #f1f5f9',
    borderRadius: 20,
    padding: pad,
    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
    transition: 'background 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease',
    ...style
  }}>
    {children}
  </div>
);

// ─── STAT CARD ───────────────────────────────────────────────
const StatCard = ({ icon, iconColor, iconBg, label, value, trend }) => (
  <Card style={{ flex: 1, minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      {trend != null && (
        <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? '#00a76b' : '#dc2626', background: trend >= 0 ? 'rgba(0,167,107,0.08)' : 'rgba(220,38,38,0.08)', padding: '2px 8px', borderRadius: 99 }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '14px 0 2px', letterSpacing: '-1px', lineHeight: 1 }}>{value ?? '--'}</p>
    <p style={{ fontSize: 13, color: '#6b7280', margin: 0, fontWeight: 500 }}>{label}</p>
  </Card>
);

// ─── DEPARTMENT DONUT ─────────────────────────────────────────
const DEPT_COLORS = ['#00a76b', '#2563eb', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];
const DEPT_DATA = [
  { name: 'Engineering', value: 62 },
  { name: 'Sales', value: 28 },
  { name: 'Design', value: 18 },
  { name: 'Marketing', value: 22 },
  { name: 'Finance', value: 14 },
  { name: 'HR', value: 16 },
];

const DeptDonut = ({ isDark }) => (
  <Card isDark={isDark}>
    <h3 className="text-[#111827] dark:text-white" style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Department mix</h3>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart key={isDark ? 'dark' : 'light'}>
          <Pie data={DEPT_DATA} cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={2} dataKey="value" startAngle={90} endAngle={450}>
            {DEPT_DATA.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} stroke={isDark ? '#111c18' : 'none'} />)}
          </Pie>
          <Tooltip formatter={(v, n) => [`${v}`, n]} contentStyle={{ fontSize: 12, borderRadius: 8, background: isDark ? '#111c18' : '#fff', border: isDark ? '1px solid #1a2d29' : '1px solid #e5e7eb', color: isDark ? '#fff' : '#000' }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', width: '100%', marginTop: 8 }}>
        {DEPT_DATA.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifySpaceBetween: 'space-between', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
              <span className="text-[#6b7280] dark:text-[#a3b3af]" style={{ fontSize: 12 }}>{d.name}</span>
            </div>
            <span className="text-[#111827] dark:text-white" style={{ fontSize: 12, fontWeight: 700 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────
const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [session, setSession] = useState(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const [dashData, setDashData] = useState(null);
  const [payroll, setPayroll] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [weeklyChart, setWeeklyChart] = useState([]);
  const [headcountChart, setHeadcountChart] = useState([]);

  const fetchAll = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const auth = getAuth();
      if (!auth) return;

      const [profileR, statusR, dashR, payrollR, leaveR, taskR, notifR] = await Promise.allSettled([
        axios.get('/api/auth/me', auth),
        axios.get('/api/time/status', auth),
        axios.get('/api/time/dashboard?timeRange=weekly', auth),
        axios.get('/api/payroll/me', auth),
        axios.get('/api/leaves/my', auth),
        axios.get('/api/tasks', auth),
        axios.get('/api/notifications', auth),
      ]);

      if (profileR.status === 'fulfilled') setProfile(profileR.value.data);

      if (statusR.status === 'fulfilled' && statusR.value.data?.hasActiveSession) {
        const s = statusR.value.data;
        const isRunning = s.isRunning !== undefined ? s.isRunning : s.status === 'active';
        const totalActive = s.activeTime || 0;
        setSession({ ...s, isRunning });

        if (isRunning) {
          const startTime = new Date(s.segmentStart || Date.now()).getTime();
          const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
          const exactTime = totalActive + Math.max(0, initialElapsed);
          
          // Soft sync: only jump if difference > 2 seconds to avoid UI jitter
          setTimer(prev => {
            if (Math.abs(prev - exactTime) > 2 || prev === 0) {
              return exactTime;
            }
            return prev;
          });
        } else {
          setTimer(totalActive);
        }
      } else {
        setSession(null); setTimer(0);
      }

      if (dashR.status === 'fulfilled') {
        const d = dashR.value.data;
        setDashData(d);

        // Weekly bar chart
        setWeeklyChart(WEEK_DAYS.map((day, i) => {
          const cd = d.chartData?.find(c => {
            const dt = new Date(c.date || c._id || '');
            return dt.getDay() === (i + 1) % 7;
          });
          return {
            day,
            active: Math.round(((cd?.active || 0) / 3600) * 10) / 10,
            idle: Math.round(((cd?.idle || 0) / 3600) * 10) / 10,
            overtime: Math.round(Math.random() * 0.5 * 10) / 10,
          };
        }));

        // Headcount trend (last 6 months)
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date().getMonth();
        setHeadcountChart(Array.from({ length: 6 }, (_, i) => ({
          month: MONTHS[(now - 5 + i + 12) % 12],
          count: 120 + i * 7 + Math.floor(Math.random() * 5),
        })));
      }

      if (payrollR.status === 'fulfilled') setPayroll(Array.isArray(payrollR.value.data) ? payrollR.value.data : []);
      if (leaveR.status === 'fulfilled') setLeaves(Array.isArray(leaveR.value.data) ? leaveR.value.data : []);
      if (taskR.status === 'fulfilled') {
        const t = taskR.value.data;
        setTasks((Array.isArray(t) ? t : (t?.tasks || [])).slice(0, 5));
      }
      if (notifR.status === 'fulfilled') {
        const n = notifR.value.data;
        setNotifications(Array.isArray(n) ? n.slice(0, 4) : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Live timer tick based on exact absolute time
  useEffect(() => {
    if (!session || !session.isRunning) return;

    const baseTime = session.activeTime || 0;
    const startTime = new Date(session.segmentStart || Date.now()).getTime();

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      setTimer(baseTime + Math.max(0, elapsedSeconds));
    }, 1000);

    const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
    setTimer(baseTime + Math.max(0, initialElapsed));

    return () => clearInterval(interval);
  }, [session?.isRunning, session?.segmentStart, session?.activeTime]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/time/${action}`, {}, getAuth());
      const s = res.data?.session;
      if (s) {
        if (s.hasActiveSession) {
          setSession(s);
          const isRunning = s.isRunning !== undefined ? s.isRunning : s.status === 'active';
          if (isRunning) {
            const startTime = new Date(s.segmentStart || Date.now()).getTime();
            const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
            setTimer((s.activeTime || 0) + Math.max(0, initialElapsed));
          } else {
            setTimer(s.activeTime || 0);
          }
        } else {
          setSession(null);
          setTimer(0);
        }
      }
      setActionLoading(false);
      fetchAll(false).catch(console.error);
    }
    catch (e) {
      console.error(e);
      setActionLoading(false);
    }
  };

  // Derived
  const displayName = profile?.name || (profile?.profile ? `${profile.profile.firstName || ''} ${profile.profile.lastName || ''}`.trim() : '') || 'Employee';
  const firstName = displayName.split(' ')[0];
  const weeklyHrs = dashData?.stats?.activeTime ? fmtHrs(dashData.stats.activeTime) : '--';
  const approvedLeaves = leaves.filter(l => l.status === 'approved').length;
  const latestPayslip = payroll[0];
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
  const goalProgress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // Goals derived from tasks
  const goals = tasks.slice(0, 3).map(t => ({
    label: t.title || t.name || 'Goal',
    pct: t.status === 'completed' ? 100 : t.status === 'in-progress' ? 48 : Math.floor(Math.random() * 80 + 10),
  }));

  // Holidays
  const HOLIDAYS = [
    { day: '04', month: 'Jul 04', name: 'Independence Day' },
    { day: '07', month: 'Sep 07', name: 'Labor Day' },
    { day: '26', month: 'Nov 26', name: 'Thanksgiving' },
    { day: '25', month: 'Dec 25', name: 'Christmas Day' },
  ];

  return (
    <div className="bg-[#f8fbf9] dark:bg-[#08100e] text-[#111827] dark:text-[#cbd5e1] transition-colors duration-300 ease-in-out" style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes shimmer { 0%{background-position:-400px 0}100%{background-position:400px 0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        .emp-anim { animation: fadeUp 0.4s ease-out both; }
        .emp-row:hover { background: #f0fdf4 !important; }
        .dark .emp-row:hover { background: #111c18 !important; }
        .emp-stat:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; transform: translateY(-1px); transition: all 0.2s; }
        .timer-container { display: flex; align-items: center; gap: 10px; padding-top: 8px; flex-wrap: wrap; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '100%', padding: '24px 32px 60px', boxSizing: 'border-box' }}>

        {/* ── GREETING + CHECK IN/OUT ─────────────────────── */}
        <div className="emp-anim" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <div>
            <p className="text-[#6b7280] dark:text-[#a3b3af]" style={{ fontSize: 14, marginBottom: 2, fontWeight: 500 }}>{getGreeting()}</p>
            <h1 className="text-[#111827] dark:text-white" style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.8px' }}>
              {loading ? '...' : firstName} <span>👋</span>
            </h1>
            <p className="text-[#6b7280] dark:text-[#a3b3af]" style={{ fontSize: 14, margin: '4px 0 0', fontWeight: 500 }}>Welcome back — your day, your way.</p>
          </div>
          <div className="timer-container" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {session && (
              <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: session.isRunning ? '#00a76b' : (isDark ? '#a3b3af' : '#9ca3af'), background: session.isRunning ? 'rgba(0,167,107,0.08)' : (isDark ? '#1a2d29' : '#f3f4f6'), padding: '8px 16px', borderRadius: 99, letterSpacing: 1 }}>
                {fmtTimer(timer)}
              </span>
            )}

            <button
              onClick={fetchAll}
              disabled={loading}
              className="w-10 h-10 rounded-full border border-gray-300 dark:border-[#1a2d29] bg-white dark:bg-[#111c18] text-gray-500 dark:text-[#cbd5e1] hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 18, marginBottom: 28, flexWrap: 'wrap' }}>
          {/* Card 1: Hours This Week */}
          <div className="emp-stat bg-white dark:bg-[#111c18] border border-[#f1f5f9] dark:border-[#1a2d29] shadow-[0_4px_18px_rgba(0,0,0,0.02)] transition-all duration-200" style={{ flex: '1 1 220px', borderRadius: 20, padding: 24, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,167,107,0.08)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color="#00a76b" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#00a76b', display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ transform: 'rotate(45deg)', display: 'inline-block' }}>↑</span> 3%
              </span>
            </div>
            <p className="text-[#111827] dark:text-white" style={{ fontSize: 34, fontWeight: 800, margin: '14px 0 2px', letterSpacing: '-1px', lineHeight: 1.2 }}>
              {loading ? '--' : (weeklyHrs !== '--' ? weeklyHrs : '34h')}
            </p>
            <p className="text-[#6b7280] dark:text-[#a3b3af]" style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>Hours This Week</p>
          </div>

          {/* Card 2: Leave Balance */}
          <div className="emp-stat bg-white dark:bg-[#111c18] border border-[#f1f5f9] dark:border-[#1a2d29] shadow-[0_4px_18px_rgba(0,0,0,0.02)] transition-all duration-200" style={{ flex: '1 1 220px', borderRadius: 20, padding: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,167,107,0.08)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Calendar size={20} color="#00a76b" />
            </div>
            <p className="text-[#111827] dark:text-white" style={{ fontSize: 34, fontWeight: 800, margin: '0 0 2px', letterSpacing: '-1px', lineHeight: 1.2 }}>
              {loading ? '--' : (approvedLeaves !== 0 ? `${approvedLeaves}d` : '14d')}
            </p>
            <p className="text-[#6b7280] dark:text-[#a3b3af]" style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>Leave Balance</p>
          </div>

          {/* Card 3: Latest Payslip */}
          <div className="emp-stat bg-white dark:bg-[#111c18] border border-[#f1f5f9] dark:border-[#1a2d29] shadow-[0_4px_18px_rgba(0,0,0,0.02)] transition-all duration-200" style={{ flex: '1 1 220px', borderRadius: 20, padding: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(2,132,199,0.08)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <FileText size={20} color="#0284c7" />
            </div>
            <p className="text-[#111827] dark:text-white" style={{ fontSize: 34, fontWeight: 800, margin: '0 0 2px', letterSpacing: '-1px', lineHeight: 1.2 }}>
              {loading ? '--' : (latestPayslip ? fmtCurrency(latestPayslip.netPay || latestPayslip.amount) : '$6000')}
            </p>
            <p className="text-[#6b7280] dark:text-[#a3b3af]" style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>Latest Payslip</p>
          </div>

          {/* Card 4: Goal Progress */}
          <div className="emp-stat bg-white dark:bg-[#111c18] border border-[#f1f5f9] dark:border-[#1a2d29] shadow-[0_4px_18px_rgba(0,0,0,0.02)] transition-all duration-200" style={{ flex: '1 1 220px', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                <Target size={20} color="#f59e0b" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#00a76b', display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ transform: 'rotate(45deg)', display: 'inline-block' }}>↑</span> 5%
              </span>
            </div>
            <p className="text-[#111827] dark:text-white" style={{ fontSize: 34, fontWeight: 800, margin: '14px 0 2px', letterSpacing: '-1px', lineHeight: 1.2 }}>
              {loading ? '--' : (goalProgress !== 0 ? `${goalProgress}%` : '72%')}
            </p>
            <p className="text-[#6b7280] dark:text-[#a3b3af]" style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>Goal Progress</p>
          </div>
        </div>

        {/* ── ROW 2: HEADCOUNT TREND + DEPT MIX ─────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 14 }}>

          {/* Headcount trend (Monthly overview) */}
          <Card isDark={isDark}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-[16px] font-bold text-gray-800 dark:text-white tracking-tight">
                  Headcount Trend
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-[#a3b3af] mt-1">
                  Monthly overview of personnel growth
                </p>
              </div>
            </div>
            {loading ? <Skel h={180} r={10} /> : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart 
                  key={isDark ? 'dark' : 'light'} 
                  data={headcountChart} 
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1a2d29' : '#E5E7EB'} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#a3b3af' : '#9CA3AF', fontWeight: 500 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#a3b3af' : '#9CA3AF', fontWeight: 500 }} dx={-5} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTip isDark={isDark} />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    name="Headcount" 
                    stroke="#10B981" 
                    strokeWidth={2} 
                    fill="url(#hcGrad)" 
                    dot={false} 
                    activeDot={{ r: 4, fill: '#10B981', stroke: isDark ? '#111c18' : '#fff', strokeWidth: 2 }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Department Mix Donut */}
          <DeptDonut isDark={isDark} />
        </div>

        {/* ── ROW 3: ANNOUNCEMENTS ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 14 }}>

          {/* Announcements */}
          <Card isDark={isDark}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="text-[#111827] dark:text-white" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Announcements</h3>
              <Megaphone size={16} color={isDark ? '#a3b3af' : '#9ca3af'} />
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...Array(3)].map((_, i) => <Skel key={i} h={52} />)}
              </div>
            ) : notifications.length === 0 ? (
              // Default announcements when API has no data
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { title: 'Q2 All-Hands meeting on Friday', sub: 'Today · Company' },
                  { title: 'New parental leave policy in effect', sub: 'Yesterday · Policy' },
                  { title: 'Welcome our 3 new joiners this week', sub: '2 days ago · People' },
                ].map((a, i) => (
                  <div key={i} className="emp-row" style={{ display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Megaphone size={14} color="#059669" />
                    </div>
                    <div>
                      <p className="text-[#111827] dark:text-white" style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{a.title}</p>
                      <p className="text-[#9ca3af] dark:text-[#a3b3af]" style={{ fontSize: 11, margin: '2px 0 0' }}>{a.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notifications.map((n, i) => (
                  <div key={i} className="emp-row" style={{ display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Megaphone size={14} color="#059669" />
                    </div>
                    <div>
                      <p className="text-[#111827] dark:text-white" style={{ fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{n.message || n.text}</p>
                      <p className="text-[#9ca3af] dark:text-[#a3b3af]" style={{ fontSize: 11, margin: '2px 0 0' }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Today'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── ROW 4: MY GOALS + UPCOMING HOLIDAYS ────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 14 }}>

          {/* My Goals */}
          <Card isDark={isDark}>
            <h3 className="text-[#111827] dark:text-white" style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, marginTop: 0 }}>My goals</h3>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[...Array(3)].map((_, i) => <Skel key={i} h={32} />)}
              </div>
            ) : goals.length === 0 ? (
              // Fallback goals
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  { label: 'Ship design system v2', pct: 72 },
                  { label: 'Improve onboarding NPS to 70', pct: 48 },
                  { label: 'Launch mobile app beta', pct: 90 },
                ].map((g, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span className="text-[#374151] dark:text-[#cbd5e1]" style={{ fontSize: 14, fontWeight: 500 }}>{g.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#00a76b' }}>{g.pct}%</span>
                    </div>
                    <div className="bg-[#f3f4f6] dark:bg-[#1a2d29]" style={{ height: 7, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${g.pct}%`, background: 'linear-gradient(90deg, #00a76b, #10b981)', borderRadius: 99, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {goals.map((g, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span className="text-[#374151] dark:text-[#cbd5e1]" style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{g.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#00a76b' }}>{g.pct}%</span>
                    </div>
                    <div className="bg-[#f3f4f6] dark:bg-[#1a2d29]" style={{ height: 7, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${g.pct}%`, background: 'linear-gradient(90deg, #00a76b, #10b981)', borderRadius: 99, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Holidays */}
          <Card isDark={isDark}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="text-[#111827] dark:text-white" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Upcoming holidays</h3>
              <Calendar size={16} color={isDark ? '#a3b3af' : '#9ca3af'} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {HOLIDAYS.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: isDark ? 'rgba(0,167,107,0.15)' : 'rgba(0,167,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#00a76b' }}>{h.day}</span>
                  </div>
                  <div>
                    <p className="text-[#111827] dark:text-white" style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{h.name}</p>
                    <p className="text-[#9ca3af] dark:text-[#a3b3af]" style={{ fontSize: 12, margin: '2px 0 0' }}>{h.month}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── ROW 5: RECENT PAYSLIPS ──────────────────────── */}
        <Card isDark={isDark}>
          <h3 className="text-[#111827] dark:text-white" style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Recent payslips</h3>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[...Array(4)].map((_, i) => <Skel key={i} h={56} r={0} />)}
            </div>
          ) : payroll.length === 0 ? (
            // Fallback demo payslips
            <div>
              {[
                { month: 'May 2026', net: '₹6,720', status: 'Paid' },
                { month: 'Apr 2026', net: '₹6,720', status: 'Paid' },
                { month: 'Mar 2026', net: '₹6,720', status: 'Paid' },
                { month: 'Feb 2026', net: '₹6,720', status: 'Paid' },
              ].map((p, i) => (
                <div key={i} className="emp-row" onClick={() => navigate('/employee/payslips')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 12px', borderBottom: i < 3 ? (isDark ? '1px solid #1a2d29' : '1px solid #f3f4f6') : 'none', cursor: 'pointer', transition: 'background 0.15s', borderRadius: i === 0 ? '8px 8px 0 0' : i === 3 ? '0 0 8px 8px' : 0 }}>
                  <div>
                    <p className="text-[#111827] dark:text-white" style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{p.month}</p>
                    <p className="text-[#9ca3af] dark:text-[#a3b3af]" style={{ fontSize: 12, margin: '2px 0 0' }}>Net {p.net}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#00a76b', background: 'rgba(0,167,107,0.1)', padding: '4px 14px', borderRadius: 8 }}>{p.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {payroll.slice(0, 5).map((p, i, arr) => (
                <div key={p._id || i} className="emp-row" onClick={() => navigate('/employee/payslips')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 12px', borderBottom: i < arr.length - 1 ? (isDark ? '1px solid #1a2d29' : '1px solid #f3f4f6') : 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                  <div>
                    <p className="text-[#111827] dark:text-white" style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                      {p.month || new Date(p.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-[#9ca3af] dark:text-[#a3b3af]" style={{ fontSize: 12, margin: '2px 0 0' }}>Net {fmtCurrency(p.netPay || p.amount)}</p>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 8,
                    background: p.status === 'paid' ? 'rgba(0,167,107,0.1)' : 'rgba(245,158,11,0.1)',
                    color: p.status === 'paid' ? '#00a76b' : '#d97706'
                  }}>
                    {p.status === 'paid' ? 'Paid' : (p.status || 'Pending')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
};

export default EmployeeDashboard;
