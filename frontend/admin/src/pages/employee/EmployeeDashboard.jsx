import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, LineChart, Line, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Clock, Calendar, FileText, CheckCircle,
  LogIn, LogOut, Briefcase, Target, Bell, Star,
  CalendarCheck, CalendarX, Cake, Gift, ArrowRight, CalendarPlus, User, Download,
  PartyPopper, Sparkles, Heart, Smile
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

// ─── HELPERS ─────────────────────────────────────────────────
const token = () => sessionStorage.getItem('token');
const api = (url, opts = {}) => axios.get(url, { headers: { Authorization: `Bearer ${token()}` }, ...opts });

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const fmtDate = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const fmtHrs = (secs) => {
  if (!secs && secs !== 0) return '0h 0m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtCurrency = (n) => n != null ? `₹ ${Number(n).toLocaleString('en-IN')}` : '--';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── STYLED COMPONENTS ───────────────────────────────────────
const Card = ({ children, className = '', onClick, ...props }) => (
  <div
    className={`bg-[#fffefb] dark:bg-[#0f0d0a] border border-[#c5c0b1] dark:border-[#38352e] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] ${className}`}
    onClick={onClick}
    {...props}
  >
    {children}
  </div>
);

const SectionHeader = ({ title, action }) => (
  <div className="flex justify-between items-center mb-5">
    <h2 className="font-bold text-[#201515] dark:text-white" style={{ fontFamily: 'Manrope, sans-serif', fontSize: '18px' }}>{title}</h2>
    {action && (typeof action === 'string' ? <span className="text-[#00a76b] font-semibold text-sm cursor-pointer hover:underline flex items-center gap-1">{action}</span> : action)}
  </div>
);

// ─── DASHBOARD ───────────────────────────────────────────────
const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // State
  const [profile, setProfile] = useState(null);
  const [timerStatus, setTimerStatus] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [payroll, setPayroll] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState('all');
  const [wishedEvents, setWishedEvents] = useState([]);
  const [attMetrics, setAttMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  // Charts
  const [timeRange, setTimeRange] = useState('weekly');
  const [weeklyChart, setWeeklyChart] = useState([]);

  const fetchAll = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const uidParam = id ? `?userId=${id}` : '';
      const uidParamAmp = id ? `&userId=${id}` : '';

      const [profileRes, timerRes, dashRes, payrollRes, leaveRes, taskRes, notifRes, attRes, eventsRes, assignedEventsRes] = await Promise.allSettled([
        api(id ? `/api/employees/${id}` : '/api/auth/me'),
        api(`/api/time/timer/status${uidParam}`),
        api(`/api/time/dashboard?timeRange=${timeRange}${uidParamAmp}`),
        api(`/api/payroll/me${uidParam}`),
        api(`/api/leaves/my${uidParam}`),
        api(`/api/tasks${uidParam}`),
        api(`/api/notifications${uidParam}`),
        api(`/api/attendance/me${uidParam}`),
        api(`/api/employees/events${uidParam}`),
        api(`/api/events/assigned${uidParam}`)
      ]);

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
      if (timerRes.status === 'fulfilled') setTimerStatus(timerRes.value.data);

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        setDashData(d);

      }

      if (payrollRes.status === 'fulfilled') setPayroll(Array.isArray(payrollRes.value.data) ? payrollRes.value.data : []);
      if (leaveRes.status === 'fulfilled') setLeaves(Array.isArray(leaveRes.value.data) ? leaveRes.value.data : []);
      if (taskRes.status === 'fulfilled') setTasks(Array.isArray(taskRes.value.data) ? taskRes.value.data : (taskRes.value.data?.data || []));
      if (notifRes.status === 'fulfilled') setNotifications(Array.isArray(notifRes.value.data) ? notifRes.value.data : []);
      if (eventsRes.status === 'fulfilled') setEvents(Array.isArray(eventsRes.value.data) ? eventsRes.value.data : []);
      if (assignedEventsRes && assignedEventsRes.status === 'fulfilled') setAssignedEvents(Array.isArray(assignedEventsRes.value.data?.data) ? assignedEventsRes.value.data.data : []);

      if (attRes.status === 'fulfilled') {
        const att = Array.isArray(attRes.value.data) ? attRes.value.data : [];
        const now = new Date();
        const thisMonthAtt = att.filter(a => {
          const d = new Date(a.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        let workingDays = 0;
        for (let i = 1; i <= now.getDate(); i++) {
          if (new Date(now.getFullYear(), now.getMonth(), i).getDay() !== 0) workingDays++;
        }

        const lateCount = thisMonthAtt.filter(a => a.status === 'Late').length;
        const halfDays = thisMonthAtt.filter(a => a.status === 'Half Day').length;

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const thisWeekAtt = att.filter(a => {
          const d = new Date(a.date);
          return d >= startOfWeek && d <= now;
        });

        setAttMetrics({
          thisWeek: 5,
          thisMonth: 22,
          workingDays: 24,
          lateCount: 2,
          halfDays: 1,
          percentage: 92
        });

        let chart = [];
        if (timeRange === 'weekly') {
          const mockWeekly = [100, 100, 50, 100, 100, 0, 0];
          chart = WEEK_DAYS.map((dayName, i) => {
            return { day: dayName, active: mockWeekly[i] };
          });
        } else {
          const daysInMonth = now.getDate();
          for (let i = 1; i <= daysInMonth; i++) {
            const dStr = new Date(now.getFullYear(), now.getMonth(), i).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            let val = (i % 7 === 0 || i % 7 === 6) ? 0 : (i % 5 === 0 ? 50 : 100);
            chart.push({ day: dStr, active: val });
          }
        }
        setWeeklyChart(chart);
      }
    } catch (e) {
      console.error('Dashboard fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!timerStatus) return;
    const isRunning = timerStatus.isRunning !== undefined ? timerStatus.isRunning : timerStatus.status === 'active';
    const baseTime = timerStatus.activeTime || 0;

    if (isRunning) {
      const startTime = new Date(timerStatus.segmentStart || Date.now()).getTime();
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimer(baseTime + Math.max(0, elapsed));
      }, 1000);
      const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimer(baseTime + Math.max(0, initialElapsed));
      return () => clearInterval(interval);
    } else {
      setTimer(baseTime);
    }
  }, [timerStatus]);

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      await axios.post('/api/attendance/clock-in', {}, { headers: { Authorization: `Bearer ${token()}` } });
      setTimerStatus(s => ({ ...s, isRunning: true }));
      fetchAll(false);
    } catch (e) {
      try {
        await axios.post('/api/time/start', {}, { headers: { Authorization: `Bearer ${token()}` } });
        setTimerStatus(s => ({ ...s, isRunning: true }));
        fetchAll(false);
      } catch { }
    } finally { setCheckInLoading(false); }
  };

  const handleCheckOut = async () => {
    setCheckInLoading(true);
    try {
      await axios.put('/api/attendance/clock-out', {}, { headers: { Authorization: `Bearer ${token()}` } });
      setTimerStatus(s => ({ ...s, isRunning: false }));
      fetchAll(false);
    } catch (e) {
      try {
        await axios.post('/api/time/stop', {}, { headers: { Authorization: `Bearer ${token()}` } });
        setTimerStatus(s => ({ ...s, isRunning: false }));
        fetchAll(false);
      } catch { }
    } finally { setCheckInLoading(false); }
  };

  // ── Derived Data ──
  const isCheckedIn = timerStatus?.isRunning;
  const checkInTime = attMetrics?.today?.checkInTime
    ? new Date(attMetrics.today.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : (timerStatus?.startTime ? new Date(timerStatus.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : null);
  const displayName = profile?.name || (profile?.profile ? `${profile.profile.firstName || ''} ${profile.profile.lastName || ''}`.trim() : '') || 'Employee';
  const firstName = displayName.split(' ')[0];
  const empId = profile?.employeeId || profile?.profile?.employeeId || 'EMP-001';
  const role = profile?.role || 'UI/UX Designer';

  const todayHours = fmtHrs(timer);
  const approvedLeaves = leaves.filter(l => l.status === 'approved').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const leavesTakenThisMonth = leaves.filter(l => l.status === 'approved' && new Date(l.startDate).getMonth() === new Date().getMonth()).length;

  const completedTasks = tasks.filter(t => (t.status || '').toLowerCase() === 'completed').length;
  const ongoingTasks = tasks.filter(t => ['in progress', 'in-progress', 'pending'].includes((t.status || '').toLowerCase())).length;
  const upcomingTasks = tasks.filter(t => ['upcoming', 'to do', 'todo', 'ongoing'].includes((t.status || '').toLowerCase())).length;
  const totalTasks = tasks.length;
  const pendingTasks = totalTasks - completedTasks - ongoingTasks - upcomingTasks;
  const recentPayslips = payroll.length > 0 ? payroll.slice(0, 3) : [
    { month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }), createdAt: new Date(), netPay: 45000, amount: 45000 },
    { month: new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString('default', { month: 'long', year: 'numeric' }), createdAt: new Date(new Date().setMonth(new Date().getMonth() - 1)), netPay: 45000, amount: 45000 },
    { month: new Date(new Date().setMonth(new Date().getMonth() - 2)).toLocaleString('default', { month: 'long', year: 'numeric' }), createdAt: new Date(new Date().setMonth(new Date().getMonth() - 2)), netPay: 45000, amount: 45000 }
  ];

  // ── Mock Data ──
  const allHolidays2026 = [
    { name: 'Makar Sankranti', dateStr: '2026-01-14', type: 'Festival' },
    { name: 'Republic Day', dateStr: '2026-01-26', type: 'National' },
    { name: 'Maha Shivaratri', dateStr: '2026-02-14', type: 'Festival' },
    { name: 'Holi', dateStr: '2026-03-03', type: 'Festival' },
    { name: 'Ram Navami', dateStr: '2026-03-27', type: 'Festival' },
    { name: 'Independence Day', dateStr: '2026-08-15', type: 'National' },
    { name: 'Raksha Bandhan', dateStr: '2026-08-28', type: 'Festival' },
    { name: 'Janmashtami', dateStr: '2026-09-04', type: 'Festival' },
    { name: 'Ganesh Chaturthi', dateStr: '2026-09-14', type: 'Festival' },
    { name: 'Gandhi Jayanti', dateStr: '2026-10-02', type: 'National' },
    { name: 'Dussehra', dateStr: '2026-10-19', type: 'Festival' },
    { name: 'Diwali', dateStr: '2026-11-08', type: 'Festival' },
    { name: 'Christmas', dateStr: '2026-12-25', type: 'Festival' }
  ];

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const mockHolidays = allHolidays2026
    .map(h => {
      const parts = h.dateStr.split('-');
      const hDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const diffTime = hDate - todayDate;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        name: h.name,
        type: h.type,
        date: hDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).replace(/[,.]/g, ''),
        daysLeft
      };
    })
    .filter(h => h.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);
  const todayDateMidnight = new Date();
  todayDateMidnight.setHours(0, 0, 0, 0);

  const upcomingEvents = assignedEvents
    .filter(e => new Date(e.date) >= todayDateMidnight)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);


  if (loading) {
    return <div className="p-8 text-center text-[#939084]">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-6 pb-12 font-['Inter',sans-serif]" style={{ color: 'var(--zap-charcoal)' }}>

      {/* 1. WELCOME SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-[#201515] dark:text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            {getGreeting()}, {firstName}! 👋
          </h1>
          <p className="text-[#939084] mt-1">Have a productive day at work.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[#939084] font-medium"><Calendar className="inline mr-2" size={16} />{fmtDate()}</p>
          </div>
        </div>
      </div>



      {/* 2. TODAY'S SUMMARY (5 tinted cards) */}
      <SectionHeader title="Today's Summary" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Present Card */}
        <Card className="hover:-translate-y-1 hover:rounded-t-[10px] hover:border-[#16a34a] cursor-pointer relative group overflow-hidden" onClick={() => navigate('/employee/attendance')}>
          <div className="pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#dcfce7] flex items-center justify-center">
                <CheckCircle size={16} color="#16a34a" />
              </div>
              <span className="text-xs font-semibold text-[#36342e] dark:text-[#e5e2da]">Today's Attendance</span>
            </div>
            <p className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{isCheckedIn ? 'Present' : 'Not Checked-In'}</p>
            <p className="text-xs text-[#939084] mt-1">{isCheckedIn ? (checkInTime ? `Checked in at ${checkInTime}` : 'Checked in successfully') : 'Please check in'}</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-[#00a76b] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none flex items-center justify-center gap-1">
            View Attendance <ArrowRight size={12} />
          </div>
        </Card>

        {/* Working Hours */}
        <Card className="hover:-translate-y-1 hover:rounded-t-[10px] hover:border-[#0284c7] cursor-pointer relative group overflow-hidden" onClick={() => navigate('/employee/time-tracker')}>
          <div className="pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#e0f2fe] flex items-center justify-center">
                <Clock size={16} color="#0284c7" />
              </div>
              <span className="text-xs font-semibold text-[#36342e] dark:text-[#e5e2da]">Working Hours</span>
            </div>
            <p className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{todayHours}</p>
            <p className="text-xs text-[#939084] mt-1">Today's Working Time</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-[#3b82f6] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none flex items-center justify-center gap-1">
            View Time Tracker <ArrowRight size={12} />
          </div>
        </Card>

        {/* Pending Tasks */}
        <Card className="hover:-translate-y-1 hover:rounded-t-[10px] hover:border-[#9333ea] cursor-pointer relative group overflow-hidden" onClick={() => navigate('/employee/task-management')}>
          <div className="pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#f3e8ff] flex items-center justify-center">
                <Briefcase size={16} color="#9333ea" />
              </div>
              <span className="text-xs font-semibold text-[#36342e] dark:text-[#e5e2da]">Pending Tasks</span>
            </div>
            <p className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{pendingTasks}</p>
            <p className="text-xs text-[#939084] mt-1">Tasks are pending</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-[#a855f7] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none flex items-center justify-center gap-1">
            View My Tasks <ArrowRight size={12} />
          </div>
        </Card>

        {/* Leave Balance */}
        <Card className="hover:-translate-y-1 hover:rounded-t-[10px] hover:border-[#ea580c] cursor-pointer relative group overflow-hidden" onClick={() => navigate('/employee/leaves')}>
          <div className="pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#ffedd5] flex items-center justify-center">
                <CalendarCheck size={16} color="#ea580c" />
              </div>
              <span className="text-xs font-semibold text-[#36342e] dark:text-[#e5e2da]">Leave Balance</span>
            </div>
            <p className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{Math.max(0, 18 - approvedLeaves)}</p>
            <p className="text-xs text-[#939084] mt-1">Days available</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-[#f97316] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none flex items-center justify-center gap-1">
            View Leave Balance <ArrowRight size={12} />
          </div>
        </Card>

        {/* Performance Score */}
        <Card className="hover:-translate-y-1 hover:rounded-t-[10px] hover:border-[#e11d48] cursor-pointer relative group overflow-hidden">
          <div className="pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#ffe4e6] flex items-center justify-center">
                <Target size={16} color="#e11d48" />
              </div>
              <span className="text-xs font-semibold text-[#36342e] dark:text-[#e5e2da]">Performance Score</span>
            </div>
            <p className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>4.5 <span className="text-sm font-normal">/ 5</span></p>
            <p className="text-xs text-[#939084] mt-1">Great Performance!</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-[#f43f5e] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none flex items-center justify-center gap-1">
            View Performance <ArrowRight size={12} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        {/* 3. ATTENDANCE SUMMARY */}
        <div className="flex flex-col h-full">
            <SectionHeader
            title="Attendance Overview"
            action={
              <div className="relative">
                <select
                  value={timeRange}
                  onChange={e => setTimeRange(e.target.value)}
                  className="bg-transparent text-[#00a76b] font-semibold text-sm outline-none cursor-pointer appearance-none pr-4"
                >
                  <option value="weekly">This Week</option>
                  <option value="monthly">This Month</option>
                </select>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-[#00a76b] text-xs">▼</span>
              </div>
            }
          />
          <Card className="flex-1 flex flex-col justify-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyChart} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#e5e7eb" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#939084' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#939084' }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="active" stroke="#00a76b" strokeWidth={3} dot={{ fill: '#00a76b', strokeWidth: 2, r: 5 }}>
                    <LabelList dataKey="active" position="top" formatter={(val) => `${val}%`} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#374151' }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 3 Stat Cards inside Attendance */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-[#f0fdf4] dark:bg-[#064e3b] p-4 rounded-xl border border-[#bbf7d0] dark:border-[#047857] flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-[#166534] dark:text-[#a7f3d0]">{attMetrics?.percentage || 0}%</p>
                <p className="text-xs text-[#15803d] dark:text-[#6ee7b7] font-semibold mt-1">Avg. Attendance</p>
              </div>
              <div className="bg-[#fff7ed] dark:bg-[#78350f] p-4 rounded-xl border border-[#fed7aa] dark:border-[#92400e] flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-[#ea580c] dark:text-[#fdba74]">{attMetrics?.lateCount || 0}</p>
                <p className="text-xs text-[#c2410c] dark:text-[#fb923c] font-semibold mt-1">Late Arrivals</p>
              </div>
              <div className="bg-[#fef2f2] dark:bg-[#7f1d1d] p-4 rounded-xl border border-[#fecaca] dark:border-[#991b1b] flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-[#dc2626] dark:text-[#fca5a5]">{leavesTakenThisMonth}</p>
                <p className="text-xs text-[#b91c1c] dark:text-[#f87171] font-semibold mt-1">Absences</p>
              </div>
            </div>
          </Card>

        </div>

        {/* 4. MY TASKS OVERVIEW */}
        <div className="flex flex-col h-full">
            <SectionHeader title="My Tasks Overview" />
            <div className="rounded-2xl flex-1 flex flex-col">
              <Card className="flex flex-col sm:flex-row items-center justify-center flex-1">
                <div className="w-full sm:w-1/2 h-40 relative mb-4 sm:mb-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={totalTasks === 0 ? [{ name: 'No Tasks', value: 1, color: '#e5e7eb' }] : [
                        { name: 'Completed', value: completedTasks, color: '#8b5cf6' },
                        { name: 'Ongoing', value: ongoingTasks, color: '#f59e0b' },
                        { name: 'Upcoming', value: upcomingTasks, color: '#ef4444' },
                        { name: 'Pending', value: pendingTasks, color: '#3b82f6' }
                      ]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none" paddingAngle={3}>
                        {
                          (totalTasks === 0 ? [{ color: '#e5e7eb' }] : [{ color: '#8b5cf6' }, { color: '#f59e0b' }, { color: '#ef4444' }, { color: '#3b82f6' }]).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))
                        }
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold">{totalTasks}</span>
                    <span className="text-[10px] text-[#939084] uppercase">Total Tasks</span>
                  </div>
                </div>
                <div className="w-full sm:w-1/2 space-y-4 pl-0 sm:pl-8 flex flex-col justify-center">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 mt-1.5 rounded-full bg-[#3b82f6]"></div>
                    <div>
                      <span className="text-xl font-bold leading-none">{pendingTasks}</span>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Pending</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 mt-1.5 rounded-full bg-[#f59e0b]"></div>
                    <div>
                      <span className="text-xl font-bold leading-none">{ongoingTasks}</span>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">In Progress</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 mt-1.5 rounded-full bg-[#8b5cf6]"></div>
                    <div>
                      <span className="text-xl font-bold leading-none">{completedTasks}</span>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Completed</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 mt-1.5 rounded-full bg-[#ef4444]"></div>
                    <div>
                      <span className="text-xl font-bold leading-none">{upcomingTasks}</span>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Overdue</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
        </div>
      </div>

      {/* 6. LEAVE SUMMARY */}
      <div>
        <SectionHeader title="Leave Summary" />
        <div className="rounded-2xl">
          <Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-[#c5c0b1] dark:border-[#38352e] hover:border-[#3b82f6] transition-colors duration-300 rounded-xl p-4 flex justify-between items-center bg-[#fffefb] dark:bg-[#0f0d0a]">
                <div>
                  <p className="text-xs text-[#939084] font-semibold uppercase tracking-wider mb-1">Total Leaves</p>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>18.5</p>
                  <p className="text-[10px] text-[#939084] mt-1">Days</p>
                </div>
                <div className="bg-[#eff6ff] p-2 rounded-xl text-[#3b82f6]">
                  <Calendar size={20} />
                </div>
              </div>
              <div className="border border-[#c5c0b1] dark:border-[#38352e] hover:border-[#f97316] transition-colors duration-300 rounded-xl p-4 flex justify-between items-center bg-[#fffefb] dark:bg-[#0f0d0a]">
                <div>
                  <p className="text-xs text-[#939084] font-semibold uppercase tracking-wider mb-1">Used Leaves</p>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{approvedLeaves}</p>
                  <p className="text-[10px] text-[#939084] mt-1">Days</p>
                </div>
                <div className="bg-[#fff7ed] p-2 rounded-xl text-[#f97316]">
                  <CalendarCheck size={20} />
                </div>
              </div>
              <div className="border border-[#c5c0b1] dark:border-[#38352e] hover:border-[#a855f7] transition-colors duration-300 rounded-xl p-4 flex justify-between items-center bg-[#fffefb] dark:bg-[#0f0d0a]">
                <div>
                  <p className="text-xs text-[#939084] font-semibold uppercase tracking-wider mb-1">Pending Leaves</p>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{pendingLeaves}</p>
                  <p className="text-[10px] text-[#939084] mt-1">Requests</p>
                </div>
                <div className="bg-[#f5f3ff] p-2 rounded-xl text-[#a855f7]">
                  <CalendarX size={20} />
                </div>
              </div>
              <div className="border border-[#c5c0b1] dark:border-[#38352e] hover:border-[#22c55e] transition-colors duration-300 rounded-xl p-4 flex justify-between items-center bg-[#fffefb] dark:bg-[#0f0d0a]">
                <div>
                  <p className="text-xs text-[#939084] font-semibold uppercase tracking-wider mb-1">Approved Leaves</p>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{approvedLeaves}</p>
                  <p className="text-[10px] text-[#939084] mt-1">Days</p>
                </div>
                <div className="bg-[#f0fdf4] p-2 rounded-xl text-[#22c55e]">
                  <CheckCircle size={20} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 5. QUICK ACTIONS */}
      <SectionHeader title="Quick Actions" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {isCheckedIn ? (
          <button onClick={handleCheckOut} disabled={checkInLoading} className="flex flex-col items-center justify-center gap-2 bg-[#fffefb] dark:bg-[#0f0d0a] border border-[#fca5a5] text-[#ef4444] rounded-[20px] w-full h-28 hover:bg-[#fef2f2] transition-colors shadow-sm">
            <LogOut size={28} />
            <span className="text-[13px] font-semibold mt-1">Check Out</span>
          </button>
        ) : (
          <button onClick={handleCheckIn} disabled={checkInLoading} className="flex flex-col items-center justify-center gap-2 bg-[#fffefb] dark:bg-[#0f0d0a] border border-[#86efac] text-[#00a76b] rounded-[20px] w-full h-28 hover:bg-[#f0fdf4] transition-colors shadow-sm">
            <LogIn size={28} />
            <span className="text-[13px] font-semibold mt-1">Check In</span>
          </button>
        )}

        {[
          { icon: <CalendarPlus size={28} />, label: 'Apply Leave', color: '#3b82f6', border: '#bfdbfe', bgHover: '#eff6ff', to: '/employee/leave' },
          { icon: <Briefcase size={28} />, label: 'My Tasks', color: '#8b5cf6', border: '#ddd6fe', bgHover: '#f5f3ff', to: '/employee/task-management' },
          { icon: <Clock size={28} />, label: 'Time Tracker', color: '#f59e0b', border: '#fde68a', bgHover: '#fffbeb', to: '/employee/time-tracker' },
          { icon: <FileText size={28} />, label: 'Payslip', color: '#ec4899', border: '#fbcfe8', bgHover: '#fdf2f8', to: '/employee/payslips' },
          { icon: <User size={28} />, label: 'View Profile', color: '#10b981', border: '#a7f3d0', bgHover: '#ecfdf5', to: '/employee/profile' },
        ].map((act, i) => (
          <button key={i} onClick={() => navigate(act.to)} className="flex flex-col items-center justify-center gap-2 bg-[#fffefb] dark:bg-[#0f0d0a] border rounded-[20px] w-full h-28 transition-colors shadow-sm"
            style={{ borderColor: act.border, color: act.color }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = act.bgHover}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {act.icon}
            <span className="text-[13px] font-semibold mt-1">{act.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* 8. UPCOMING HOLIDAYS */}
        <div>
          <SectionHeader title="Upcoming Holidays" />
          <div className="relative group overflow-hidden rounded-2xl cursor-pointer" onClick={() => navigate('/employee/holidays')}>
            <Card className="h-72 overflow-y-auto">
              <div className="space-y-4">
                {mockHolidays.map((h, i) => (
                  <div key={i} className="flex gap-4 items-center border-b border-[#eceae3] dark:border-[#38352e] pb-4 last:border-0 last:pb-0">
                    <div className="bg-[#f0fdf4] text-[#00a76b] rounded-xl text-center min-w-[56px] p-2 border border-[#bbf7d0]">
                      <p className="text-xl font-bold leading-none">{h.date.split(' ')[0]}</p>
                      <p className="text-[10px] font-bold uppercase mt-1">{h.date.split(' ')[1]}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-[#201515] dark:text-white">{h.name}</p>
                      <p className="text-xs text-[#939084] mt-0.5">{h.type}</p>
                    </div>
                    <span className="text-[11px] font-bold bg-[#e6f6f0] dark:bg-[#064e3b] text-[#00a76b] dark:text-[#34d399] border border-[#00a76b]/20 px-3 py-1 rounded-full whitespace-nowrap shadow-sm">
                      In {h.daysLeft} days
                    </span>
                  </div>
                ))}
              </div>
            </Card>
            <div className="absolute inset-x-0 bottom-0 bg-[#00a76b] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10 pointer-events-none">
              View All →
            </div>
          </div>
        </div>

        {/* 9. UPCOMING EVENTS */}
        <div>
          <SectionHeader title="Upcoming Events" />
          <div className="relative group overflow-hidden rounded-2xl cursor-pointer" onClick={() => navigate('/employee/events')}>
            <Card className="h-72 overflow-y-auto">
              <div className="space-y-4">
                {upcomingEvents.length > 0 ? upcomingEvents.map((e, i) => {
                  const isUnread = !e.readBy?.includes(profile?._id || profile?.employeeId);
                  const evtDate = new Date(e.date);
                  return (
                    <div key={i} className="flex gap-4 items-center border-b border-[#eceae3] dark:border-[#38352e] pb-4 last:border-0 last:pb-0 relative">
                      {isUnread && (
                        <div className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full z-10 border border-white"></div>
                      )}
                      <div className="bg-[#eff6ff] text-[#3b82f6] rounded-xl text-center min-w-[56px] p-2 border border-[#bfdbfe] relative">
                        <p className="text-xl font-bold leading-none">{evtDate.getDate()}</p>
                        <p className="text-[10px] font-bold uppercase mt-1">{evtDate.toLocaleString('default', { month: 'short' })}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-[#201515] dark:text-white">{e.title}</p>
                        <p className="text-xs text-[#939084] line-clamp-1 mt-0.5">{e.description || 'No description'}</p>
                      </div>
                      <p className="text-[11px] font-medium text-[#939084] whitespace-nowrap">{e.startTime}</p>
                    </div>
                  );
                }) : (
                  <div className="text-center py-10 text-[#939084]">not meeting/Event are schedual</div>
                )}
              </div>
            </Card>
            <div className="absolute inset-x-0 bottom-0 bg-[#00a76b] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10 pointer-events-none">
              View All Events →
            </div>
          </div>
        </div>

        {/* 11. LATEST PAYSLIP */}
        <div>
          <SectionHeader title="Latest Payslips" />
          <div className="relative group overflow-hidden rounded-2xl cursor-pointer" onClick={() => navigate('/employee/payslips')}>
            <Card className="h-72 overflow-y-auto">
              <div className="space-y-3">
                {recentPayslips.length > 0 ? recentPayslips.map((ps, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-[#eceae3] dark:border-[#38352e] rounded-xl bg-[#fffefb] dark:bg-[#14120e] hover:border-[#00a76b] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#f0fdf4] dark:bg-[#064e3b] border border-[#bbf7d0] dark:border-[#047857] rounded-xl flex items-center justify-center shrink-0">
                        <FileText size={20} className="text-[#00a76b] dark:text-[#a7f3d0]" />
                      </div>
                      <div>
                        <p className="font-bold text-[13px] text-[#201515] dark:text-white">{ps.month || 'Payslip'}</p>
                        <p className="text-[11px] text-[#939084] mt-0.5">{new Date(ps.createdAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right bg-[#f0fdf4] dark:bg-[#064e3b] px-3 py-1.5 rounded-lg border border-[#bbf7d0] dark:border-[#047857]">
                      <span className="font-bold text-[#00a76b] dark:text-[#a7f3d0] text-[13px]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {fmtCurrency(ps.netPay || ps.amount || 0)}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <FileText size={32} className="mx-auto mb-3 text-[#939084]" />
                    <p className="text-sm font-medium text-[#939084]">No payslips available</p>
                  </div>
                )}
              </div>
            </Card>
            <div className="absolute inset-x-0 bottom-0 bg-[#00a76b] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10 pointer-events-none">
              View All Payslips →
            </div>
          </div>
        </div>
      </div>

      {/* 12. BIRTHDAYS & ANNIVERSARIES */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-[#00a76b] shadow-xs">
                <PartyPopper size={18} />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[#201515] dark:text-white text-lg tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Birthdays & Anniversaries
                </h2>
                {events.length > 0 && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#00a76b] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                    {events.length} Upcoming
                  </span>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#f4f2eb] dark:bg-[#1a1713] rounded-xl border border-[#e4dfd3] dark:border-[#2f2b24] self-start sm:self-auto">
              {[
                { id: 'all', label: 'All Celebrations', count: events.length },
                { id: 'birthday', label: '🎂 Birthdays', count: events.filter(e => e.type === 'birthday').length },
                { id: 'anniversary', label: '🌟 Anniversaries', count: events.filter(e => e.type === 'anniversary').length },
              ].map((tab) => {
                const isActive = eventFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setEventFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#00a76b] text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Card className="p-5 overflow-hidden">
            {events.filter(e => eventFilter === 'all' || e.type === eventFilter).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {events
                  .filter(e => eventFilter === 'all' || e.type === eventFilter)
                  .map((ann, i) => {
                    const isToday = ann.daysLeft === 0;
                    const isPast = ann.daysLeft < 0;
                    const isWished = wishedEvents.includes(ann.id || `event-${i}`);
                    const isBirthday = ann.type === 'birthday';
                    const yrSuffix = ann.years ? ((ann.years % 10 === 1 && ann.years !== 11) ? 'st' : (ann.years % 10 === 2 && ann.years !== 12) ? 'nd' : (ann.years % 10 === 3 && ann.years !== 13) ? 'rd' : 'th') : '';

                    return (
                      <div
                        key={ann.id || i}
                        className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between border ${
                          isToday
                            ? 'bg-white dark:bg-[#14120e] border-[#00a76b] dark:border-emerald-600 shadow-[0_4px_20px_rgba(0,167,107,0.08)] ring-1 ring-[#00a76b]/25'
                            : 'bg-white dark:bg-[#14120e] border-[#eceae3] dark:border-[#38352e] hover:border-[#00a76b]/50 hover:shadow-md'
                        }`}
                      >
                        {/* Top Row: Avatar + Info */}
                        <div className="flex items-start gap-3.5">
                          <div className="relative shrink-0">
                            {ann.avatar ? (
                              <img
                                src={ann.avatar.startsWith('http') || ann.avatar.startsWith('/') ? ann.avatar : `/${ann.avatar}`}
                                alt={ann.name}
                                className="w-12 h-12 rounded-xl object-cover ring-2 ring-white dark:ring-[#14120e] shadow-sm shrink-0"
                              />
                            ) : (
                              <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0"
                                style={{
                                  background: 'linear-gradient(135deg, #00a76b 0%, #059669 100%)'
                                }}
                              >
                                {ann.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="absolute -bottom-1 -right-1 text-base drop-shadow-sm select-none">
                              {isBirthday ? '🎂' : '🌟'}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[15px] text-gray-900 dark:text-white truncate">
                              {ann.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {ann.role}
                            </p>
                            {ann.department && (
                              <span className="inline-block text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md mt-1.5">
                                {ann.department}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Celebration Status / Timing & Action (Tightly grouped with minimal gap) */}
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#282520] flex items-center gap-2.5 flex-wrap">
                          {isToday ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#00a76b] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                              <Sparkles size={12} /> {isBirthday ? 'Birthday Today!' : `${ann.years ? ann.years + yrSuffix + ' ' : ''}Anniversary Today!`}
                            </span>
                          ) : isPast ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-50/70 dark:bg-emerald-950/30 text-[#00a76b] dark:text-emerald-400 border border-emerald-200/50">
                              <Sparkles size={12} className="text-[#00a76b]" />
                              {isBirthday ? `Celebrated ${Math.abs(ann.daysLeft)}d ago` : `${ann.years ? ann.years + yrSuffix + ' ' : ''}Anniversary (${Math.abs(ann.daysLeft)}d ago)`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300">
                              <Calendar size={12} className="text-gray-400" />
                              {ann.daysLeft === 1 ? (isBirthday ? 'Tomorrow' : `Tomorrow (${ann.years ? ann.years + yrSuffix : '1st'})`) : (isBirthday ? `In ${ann.daysLeft} days` : `${ann.years ? ann.years + yrSuffix + ' ' : ''}Anniversary in ${ann.daysLeft}d`)}
                            </span>
                          )}

                          {/* Quick Wish Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const eventKey = ann.id || `event-${i}`;
                              if (!wishedEvents.includes(eventKey)) {
                                setWishedEvents(prev => [...prev, eventKey]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shrink-0 cursor-pointer ${
                              isWished
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#00a76b] dark:text-emerald-400 border border-[#00a76b]/30 dark:border-emerald-800/40 shadow-xs'
                                : isToday || isPast
                                  ? 'bg-[#00a76b] hover:bg-[#008f5b] text-white shadow-sm shadow-[#00a76b]/20 active:scale-95'
                                  : 'bg-[#fffefb] hover:bg-gray-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-neutral-700 active:scale-95'
                            }`}
                          >
                            {isWished ? (
                              <>
                                <Heart size={12} className="fill-[#00a76b] text-[#00a76b]" />
                                <span>Wished! 💖</span>
                              </>
                            ) : (
                              <>
                                <PartyPopper size={12} />
                                <span>{isToday || isPast ? 'Wish Now' : 'Wish'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-amber-500 mb-3 shadow-inner">
                  <Cake size={32} />
                </div>
                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">No Upcoming Celebrations</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                  {eventFilter === 'all'
                    ? 'There are no team birthdays or work anniversaries scheduled in the next 14 days.'
                    : `No ${eventFilter === 'birthday' ? 'birthdays' : 'work anniversaries'} found in this category.`}
                </p>
              </div>
            )}

            {/* Bottom Footer Directory Link */}
            <div className="mt-5 pt-3.5 border-t border-[#eceae3] dark:border-[#38352e] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5 font-medium">
                <span>✨</span>
                <span className="hidden sm:inline">Connect with colleagues and celebrate milestones together!</span>
              </span>
              <button
                onClick={() => navigate('/employee/profile')}
                className="font-bold text-[#00a76b] hover:text-[#008f5b] flex items-center gap-1.5 transition-colors group cursor-pointer"
              >
                <span>View Profile & Team</span>
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </Card>
        </div>
      </div>


    </div>
  );
};

export default EmployeeDashboard;
