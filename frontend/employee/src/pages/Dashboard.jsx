import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, LineChart, Line, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Clock, Calendar, FileText, CheckCircle,
  LogIn, LogOut, Briefcase, Target, Bell, Star,
  CalendarCheck, CalendarX, Cake, Gift, ArrowRight, CalendarPlus, User, Download,
  PartyPopper, Sparkles, Heart, Smile, TrendingUp, ChevronDown,
  AlertTriangle, Monitor, X, ExternalLink, RefreshCw, Activity
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { startDesktopTracker, stopDesktopTracker } from '@shared/services/desktopTrackerService';
import DesktopAppRequiredModal from '@shared/components/DesktopAppRequiredModal';

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
    className={`bg-white dark:bg-[#0f0d0a] border border-[#c5c0b1] dark:border-[#38352e] rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] ${className}`}
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
const Dashboard = () => {
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
  const [leaveQuotas, setLeaveQuotas] = useState({ sick: 10, earned: 20, casual: 12, emergency: 5 });
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [dbHolidays, setDbHolidays] = useState([]);
  const [eventFilter, setEventFilter] = useState('all');
  const [wishedEvents, setWishedEvents] = useState([]);
  const [attMetrics, setAttMetrics] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [trackerMissingModal, setTrackerMissingModal] = useState(false);
  const [timer, setTimer] = useState(0);

  // Charts
  const [timeRange, setTimeRange] = useState('weekly');
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);
  const timeRangeRef = useRef(null);
  const [weeklyChart, setWeeklyChart] = useState([]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (timeRangeRef.current && !timeRangeRef.current.contains(e.target)) {
        setTimeRangeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAll = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const uidParam = id ? `?userId=${id}` : '';
      const uidParamAmp = id ? `&userId=${id}` : '';

      const [profileRes, timerRes, dashRes, payrollRes, leaveRes, taskRes, notifRes, attRes, eventsRes, assignedEventsRes, quotasRes, holidaysRes] = await Promise.allSettled([
        api(id ? `/api/employees/${id}` : '/api/auth/me'),
        api(`/api/time/timer/status${uidParam}`),
        api(`/api/time/dashboard?timeRange=${timeRange}${uidParamAmp}`),
        api(`/api/payroll/me${uidParam}`),
        api(`/api/leaves/my${uidParam}`),
        api(`/api/tasks${uidParam}`),
        api(`/api/notifications${uidParam}`),
        api(`/api/attendance/me${uidParam}`),
        api(`/api/employees/events${uidParam}`),
        api(`/api/events/assigned${uidParam}`),
        api(`/api/leaves/my-quotas${uidParam}`),
        api('/api/holidays')
      ]);

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
      if (timerRes.status === 'fulfilled') setTimerStatus(timerRes.value.data);

      if (dashRes.status === 'fulfilled') {
        setDashData(dashRes.value.data);
      }

      if (payrollRes.status === 'fulfilled') setPayroll(Array.isArray(payrollRes.value.data) ? payrollRes.value.data : []);
      if (leaveRes.status === 'fulfilled') setLeaves(Array.isArray(leaveRes.value.data) ? leaveRes.value.data : []);
      if (quotasRes.status === 'fulfilled' && quotasRes.value.data) setLeaveQuotas(quotasRes.value.data);
      if (taskRes.status === 'fulfilled') setTasks(Array.isArray(taskRes.value.data) ? taskRes.value.data : (taskRes.value.data?.data || []));
      if (notifRes.status === 'fulfilled') setNotifications(Array.isArray(notifRes.value.data) ? notifRes.value.data : []);

      if (eventsRes.status === 'fulfilled') {
        const rawEvents = Array.isArray(eventsRes.value.data) ? eventsRes.value.data : [];
        setEvents(rawEvents.filter(e => e.daysLeft >= 0));
      }
      if (assignedEventsRes && assignedEventsRes.status === 'fulfilled') {
        setAssignedEvents(Array.isArray(assignedEventsRes.value.data?.data) ? assignedEventsRes.value.data.data : []);
      }

      if (holidaysRes.status === 'fulfilled') {
        const rawHolidays = Array.isArray(holidaysRes.value.data) ? holidaysRes.value.data : (holidaysRes.value.data?.data || []);
        if (rawHolidays.length > 0) {
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          const parsed = rawHolidays.map(h => {
            const hDate = new Date(h.date || h.startDate);
            const diffTime = hDate - todayDate;
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return {
              name: h.title || h.name,
              type: h.type || 'Holiday',
              date: hDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
              daysLeft
            };
          }).filter(h => h.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3);
          setDbHolidays(parsed);
        }
      }

      if (attRes.status === 'fulfilled') {
        const att = Array.isArray(attRes.value.data) ? attRes.value.data : [];
        setAttendance(att);
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

        const presentMonth = thisMonthAtt.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const effectiveMonth = presentMonth + (halfDays * 0.5);
        const presentWeek = thisWeekAtt.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const halfWeek = thisWeekAtt.filter(a => a.status === 'Half Day').length;
        const effectiveWeek = presentWeek + (halfWeek * 0.5);

        setAttMetrics({
          thisWeek: effectiveWeek,
          thisMonth: effectiveMonth,
          workingDays: workingDays,
          lateCount: lateCount,
          halfDays: halfDays,
          percentage: workingDays > 0 ? Math.round((effectiveMonth / workingDays) * 100) : 100
        });

        const getDayValue = (dateObj) => {
          if (dateObj > now) return null;
          const record = att.find(a => new Date(a.date).toDateString() === dateObj.toDateString());
          if (!record) return 0;
          if (record.status === 'Present' || record.status === 'Late') return 100;
          if (record.status === 'Half Day') return 50;
          return 0;
        };

        let chart = [];
        if (timeRange === 'weekly') {
          chart = WEEK_DAYS.map((dayName, i) => {
            const dateObj = new Date(startOfWeek);
            dateObj.setDate(startOfWeek.getDate() + i);
            return { day: dayName, active: getDayValue(dateObj) };
          });
        } else {
          const daysInMonth = now.getDate();
          for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(now.getFullYear(), now.getMonth(), i);
            const dStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            chart.push({ day: dStr, active: getDayValue(dateObj) });
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
      const trackerRes = await startDesktopTracker(token());
      if (!trackerRes.success) {
        setTrackerMissingModal(true);
        return;
      }

      await axios.post('/api/attendance/clock-in', {}, { headers: { Authorization: `Bearer ${token()}` } });
      try {
        await axios.post('/api/time/start', {}, { headers: { Authorization: `Bearer ${token()}` } });
      } catch (_) { }

      setTimerStatus(s => ({ ...s, isRunning: true }));
      toast.success('Check-in successful & Desktop Tracker started!', {
        duration: 3500,
        style: {
          borderRadius: '12px',
          background: '#1c1917',
          color: '#fff',
          border: '1px solid #10b981',
          fontSize: '13px',
          fontWeight: '600'
        }
      });
      fetchAll(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-in failed');
    } finally { setCheckInLoading(false); }
  };

  const handleCheckOut = async () => {
    setCheckInLoading(true);
    try {
      // 1. Attempt to open desktop tracker window & show confirmation modal
      const trackerActive = await stopDesktopTracker();
      if (trackerActive) {
        toast('Please confirm check-out in FluidHR Tracker app.', {
          icon: '⚡',
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#1c1917',
            color: '#fff',
            border: '1px solid #00a76b',
            fontSize: '13px',
            fontWeight: '600'
          }
        });
        return;
      }

      // 2. Fallback if desktop app is not running: check out directly
      await axios.put('/api/attendance/clock-out', {}, { headers: { Authorization: `Bearer ${token()}` } });
      try {
        await axios.post('/api/time/stop', {}, { headers: { Authorization: `Bearer ${token()}` } });
      } catch (_) { }
      setTimerStatus(s => ({ ...s, isRunning: false }));
      toast.success('Checked out successfully & Tracker stopped.');
      fetchAll(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-out failed');
    } finally { setCheckInLoading(false); }
  };

  // ── Derived Data from MongoDB ──
  const isCheckedIn = timerStatus?.isRunning;
  const checkInTime = attMetrics?.today?.checkInTime
    ? new Date(attMetrics.today.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : (timerStatus?.startTime ? new Date(timerStatus.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : null);
  const displayName = profile?.name || (profile?.profile ? `${profile.profile.firstName || ''} ${profile.profile.lastName || ''}`.trim() : '') || 'Employee';
  const firstName = displayName.split(' ')[0];

  const todayHours = fmtHrs(timer);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const todayDateStr = now.toISOString().split('T')[0];

  const pastDaysWeeklySeconds = attendance
    .filter(a => {
      const d = new Date(a.date);
      return d >= startOfWeek && a.date !== todayDateStr;
    })
    .reduce((sum, a) => sum + ((Number(a.totalHours) || 0) * 3600), 0);

  const totalWeeklySeconds = pastDaysWeeklySeconds + (timer || 0);
  const weeklyHours = fmtHrs(totalWeeklySeconds);

  const approvedLeavesArray = leaves.filter(l => l.status === 'approved');
  const usedEarned = approvedLeavesArray.filter(l => l.leaveType === 'earned').reduce((acc, curr) => acc + (curr.totalDays || 0), 0);
  const usedSick = approvedLeavesArray.filter(l => l.leaveType === 'sick').reduce((acc, curr) => acc + (curr.totalDays || 0), 0);
  const usedCasual = approvedLeavesArray.filter(l => l.leaveType === 'casual').reduce((acc, curr) => acc + (curr.totalDays || 0), 0);

  const totalAllocated = (leaveQuotas.sick || 10) + (leaveQuotas.earned || 20) + (leaveQuotas.casual || 12) + (leaveQuotas.emergency || 5);
  const totalUsedLeaves = usedEarned + usedSick + usedCasual;
  const totalLeaveBalance = totalAllocated - totalUsedLeaves;

  const approvedLeaves = approvedLeavesArray.length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const leavesTakenThisMonth = leaves.filter(l => l.status === 'approved' && new Date(l.startDate).getMonth() === new Date().getMonth()).length;

  const completedTasks = tasks.filter(t => (t.status || '').toLowerCase() === 'completed').length;
  const ongoingTasks = tasks.filter(t => ['in progress', 'in-progress', 'pending'].includes((t.status || '').toLowerCase())).length;
  const upcomingTasks = tasks.filter(t => ['upcoming', 'to do', 'todo', 'ongoing'].includes((t.status || '').toLowerCase())).length;
  const totalTasks = tasks.length;
  const pendingTasks = totalTasks - completedTasks - ongoingTasks - upcomingTasks;

  const recentPayslips = payroll.length > 0 ? payroll.slice(0, 3) : [
    { month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }), createdAt: new Date(), netPay: 45000, amount: 45000 },
    { month: new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString('default', { month: 'long', year: 'numeric' }), createdAt: new Date(new Date().setMonth(new Date().getMonth() - 1)), netPay: 45000, amount: 45000 }
  ];

  const allHolidaysFallback = [
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

  const holidaysList = dbHolidays.length > 0 ? dbHolidays : allHolidaysFallback
    .map(h => {
      const parts = h.dateStr.split('-');
      const hDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const diffTime = hDate - todayDate;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        name: h.name,
        type: h.type,
        date: hDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-[#F8F9FB] dark:bg-[#110e0c] w-full h-full">
        <div className="relative flex justify-center items-center h-20 w-20">
          <div className="absolute animate-ping w-16 h-16 rounded-full bg-[#00a76b] opacity-20"></div>
          <Activity className="animate-bounce text-[#00a76b] relative z-10" size={42} />
        </div>
        <p className="font-bold text-xl text-gray-800 dark:text-gray-200 mt-2 tracking-wide">
          Loading Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4 font-['Inter',sans-serif]" style={{ color: 'var(--zap-charcoal)' }}>

      {/* 1. WELCOME SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-[#201515] dark:text-white leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
            {getGreeting()}, {firstName}! 👋
          </h1>
          <p className="text-[#939084] mt-1">Have a productive day at work.</p>
        </div>
        <div className="text-right hidden sm:flex items-center pt-2">
          <p className="text-[#939084] font-medium flex items-center gap-2">
            <Calendar size={16} />
            <span>{fmtDate()}</span>
          </p>
        </div>
      </div>

      {/* 2. TODAY'S SUMMARY (5 tinted cards) */}
      <SectionHeader title="Today's Summary" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Present Card */}
        <Card className="hover:-translate-y-1 hover:rounded-t-[10px] hover:border-[#16a34a] cursor-pointer relative group overflow-hidden" onClick={() => navigate('/employee/attendance')}>
          <div className="pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#dcfce7] dark:bg-[#16a34a]/20 flex items-center justify-center text-[#16a34a] dark:text-[#16a34a]">
                <CheckCircle size={16} stroke="#16a34a" className="text-[#16a34a] dark:text-[#16a34a]" />
              </div>
              <span className="text-xs font-semibold text-[#36342e] dark:text-[#e5e2da]">Today's Attendance</span>
            </div>
            <p className="text-[18px] font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{isCheckedIn ? 'Present' : 'Not Checked-In'}</p>
            <p className="text-xs text-[#939084] mt-1">{isCheckedIn ? (checkInTime ? `Checked in at ${checkInTime}` : 'Checked in successfully') : 'Please check in'}</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-[#00a76b] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none flex items-center justify-center gap-1">
            View Attendance <ArrowRight size={12} />
          </div>
        </Card>

        {/* Working Hours */}
        <Card className="hover:-translate-y-1 hover:rounded-t-[10px] hover:border-[#0284c7] cursor-pointer relative group overflow-hidden" onClick={() => navigate('/employee/attendance')}>
          <div className="pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#e0f2fe] dark:bg-[#0284c7]/20 flex items-center justify-center text-[#0284c7] dark:text-[#0284c7]">
                <Clock size={16} stroke="#0284c7" className="text-[#0284c7] dark:text-[#0284c7]" />
              </div>
              <span className="text-xs font-semibold text-[#36342e] dark:text-[#e5e2da]">Working Hours</span>
            </div>
            <p className="text-[18px] font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{todayHours}</p>
            <p className="text-xs text-[#939084] mt-1">Today's working hours</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-[#3b82f6] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none flex items-center justify-center gap-1">
            View Attendance <ArrowRight size={12} />
          </div>
        </Card>

        {/* Total Weekly Hours */}
        <Card className="hover:-translate-y-1 hover:rounded-t-[10px] hover:border-[#6366f1] cursor-pointer relative group overflow-hidden" onClick={() => navigate('/employee/attendance')}>
          <div className="pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#ede9fe] dark:bg-[#6366f1]/20 flex items-center justify-center text-[#6366f1] dark:text-[#6366f1]">
                <TrendingUp size={16} stroke="#6366f1" className="text-[#6366f1] dark:text-[#6366f1]" />
              </div>
              <span className="text-xs font-semibold text-[#36342e] dark:text-[#e5e2da]">Total Weekly Hours</span>
            </div>
            <p className="text-[18px] font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{weeklyHours}</p>
            <p className="text-xs text-[#939084] mt-1">This week's working hours</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-[#6366f1] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none flex items-center justify-center gap-1">
            View Attendance <ArrowRight size={12} />
          </div>
        </Card>

        {/* Pending Tasks */}
        <Card className="hover:-translate-y-1 hover:rounded-t-[10px] hover:border-[#9333ea] cursor-pointer relative group overflow-hidden" onClick={() => navigate('/employee/task-management')}>
          <div className="pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#f3e8ff] dark:bg-[#9333ea]/20 flex items-center justify-center text-[#9333ea] dark:text-[#9333ea]">
                <Briefcase size={16} stroke="#9333ea" className="text-[#9333ea] dark:text-[#9333ea]" />
              </div>
              <span className="text-xs font-semibold text-[#36342e] dark:text-[#e5e2da]">Pending Tasks</span>
            </div>
            <p className="text-[18px] font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{pendingTasks}</p>
            <p className="text-xs text-[#939084] mt-1">Today's pending tasks</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-[#a855f7] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none flex items-center justify-center gap-1">
            View My Tasks <ArrowRight size={12} />
          </div>
        </Card>

        {/* Leave Balance */}
        <Card className="hover:-translate-y-1 hover:rounded-t-[10px] hover:border-[#ea580c] cursor-pointer relative group overflow-hidden" onClick={() => navigate('/employee/leave')}>
          <div className="pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#ffedd5] dark:bg-[#ea580c]/20 flex items-center justify-center text-[#ea580c] dark:text-[#ea580c]">
                <CalendarCheck size={16} stroke="#ea580c" className="text-[#ea580c] dark:text-[#ea580c]" />
              </div>
              <span className="text-xs font-semibold text-[#36342e] dark:text-[#e5e2da]">Leave Balance</span>
            </div>
            <p className="text-[18px] font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{totalLeaveBalance}</p>
            <p className="text-xs text-[#939084] mt-1">Available leave days</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-[#f97316] text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none flex items-center justify-center gap-1">
            View Leave Balance <ArrowRight size={12} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        {/* 3. ATTENDANCE SUMMARY */}
        <div className="flex flex-col h-full">
          <SectionHeader
            title="Attendance Overview"
            action={
              <div className="relative" ref={timeRangeRef}>
                <button
                  type="button"
                  onClick={() => setTimeRangeOpen(prev => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#d5d0c1] dark:border-[#38352e] bg-white dark:bg-[#1a1714] text-xs font-semibold text-[#36342e] dark:text-[#e5e2da] hover:border-[#00a76b] hover:bg-[#f7f6f2] dark:hover:bg-[#25211e] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer select-none"
                >
                  <Calendar size={13} className="text-[#00a76b]" />
                  <span>{timeRange === 'weekly' ? 'This Week' : 'This Month'}</span>
                  <ChevronDown size={13} className={`text-[#939084] transition-transform duration-200 ${timeRangeOpen ? 'rotate-180 text-[#00a76b]' : ''}`} />
                </button>

                {timeRangeOpen && (
                  <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-[#1a1714] border border-[#d5d0c1] dark:border-[#38352e] rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.08)] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setTimeRange('weekly'); setTimeRangeOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${timeRange === 'weekly'
                        ? 'bg-[#00a76b]/10 text-[#00a76b] font-bold'
                        : 'text-[#4b4841] dark:text-[#cac6ba] hover:bg-[#f5f3ee] dark:hover:bg-[#25211e] font-medium'
                        }`}
                    >
                      <span>This Week</span>
                      {timeRange === 'weekly' && <span className="w-1.5 h-1.5 rounded-full bg-[#00a76b]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTimeRange('monthly'); setTimeRangeOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${timeRange === 'monthly'
                        ? 'bg-[#00a76b]/10 text-[#00a76b] font-bold'
                        : 'text-[#4b4841] dark:text-[#cac6ba] hover:bg-[#f5f3ee] dark:hover:bg-[#25211e] font-medium'
                        }`}
                    >
                      <span>This Month</span>
                      {timeRange === 'monthly' && <span className="w-1.5 h-1.5 rounded-full bg-[#00a76b]" />}
                    </button>
                  </div>
                )}
              </div>
            }
          />
          <Card className="flex-1 flex flex-col justify-between">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyChart} margin={{ top: 35, right: 25, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#e5e7eb" className="stroke-gray-200 dark:stroke-[#28251e]" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#939084' }} dy={5} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#939084' }}
                    tickFormatter={(val) => `${val}%`}
                    domain={[0, 135]}
                    ticks={[0, 25, 50, 75, 100]}
                    width={45}
                    tickMargin={6}
                  />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="active" stroke="#00a76b" strokeWidth={3} dot={{ fill: '#00a76b', strokeWidth: 2, r: 5 }}>
                    <LabelList
                      dataKey="active"
                      position="top"
                      offset={12}
                      formatter={(val) => `${val}%`}
                      className="fill-gray-700 dark:fill-gray-200 text-[11px] font-bold"
                      style={{ fontSize: '11px', fontWeight: 'bold' }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stat Cards below Attendance Chart */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-[#fff7ed] dark:bg-[#78350f]/40 p-3.5 rounded-xl border border-[#fed7aa] dark:border-[#92400e]/50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#c2410c] dark:text-[#fb923c] font-semibold">Late Arrivals</p>
                  <p className="text-[20px] font-bold text-[#ea580c] dark:text-[#fdba74] mt-0.5" style={{ fontFamily: 'Manrope, sans-serif' }}>{attMetrics?.lateCount || 0}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[#ffedd5] dark:bg-[#ea580c]/20 flex items-center justify-center text-[#ea580c]">
                  <Clock size={18} />
                </div>
              </div>
              <div className="bg-[#fef2f2] dark:bg-[#7f1d1d]/40 p-3.5 rounded-xl border border-[#fecaca] dark:border-[#991b1b]/50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#b91c1c] dark:text-[#f87171] font-semibold">Absences</p>
                  <p className="text-[20px] font-bold text-[#dc2626] dark:text-[#fca5a5] mt-0.5" style={{ fontFamily: 'Manrope, sans-serif' }}>{leavesTakenThisMonth}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[#fee2e2] dark:bg-[#dc2626]/20 flex items-center justify-center text-[#dc2626]">
                  <CalendarX size={18} />
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* 4. MY TASKS OVERVIEW */}
        <div className="flex flex-col h-full">
          <SectionHeader title="My Tasks Overview" />
          <div className="rounded-2xl flex-1 flex flex-col">
            <Card className="flex-1 flex flex-col justify-between">
              <div className="h-64 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={totalTasks === 0 ? [{ name: 'No Tasks', value: 1, color: '#e5e7eb' }] : [
                      { name: 'Completed', value: completedTasks, color: '#8b5cf6' },
                      { name: 'Ongoing', value: ongoingTasks, color: '#f59e0b' },
                      { name: 'Upcoming', value: upcomingTasks, color: '#ef4444' },
                      { name: 'Pending', value: pendingTasks, color: '#3b82f6' }
                    ]} cx="50%" cy="50%" innerRadius={75} outerRadius={105} dataKey="value" stroke="none" paddingAngle={3}>
                      {
                        (totalTasks === 0 ? [{ color: '#e5e7eb' }] : [{ color: '#8b5cf6' }, { color: '#f59e0b' }, { color: '#ef4444' }, { color: '#3b82f6' }]).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      }
                    </Pie>
                    <Tooltip position={{ y: -10 }} isAnimationActive={false} contentStyle={{ borderRadius: '8px', border: '1px solid #38332c', backgroundColor: '#1e1a17', color: '#fff', zIndex: 100 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-[#201515] dark:text-white leading-none">{totalTasks}</span>
                  <span className="text-[11px] font-bold text-[#939084] tracking-wider uppercase mt-1">Total Tasks</span>
                </div>
              </div>

              {/* 4 Stat Cards below Pie Chart */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200/60 dark:border-blue-800/40 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
                    <span className="text-[18px] font-bold text-blue-700 dark:text-blue-300 leading-none">{pendingTasks}</span>
                  </div>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Pending</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                    <span className="text-[18px] font-bold text-amber-700 dark:text-amber-300 leading-none">{ongoingTasks}</span>
                  </div>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">In Progress</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-200/60 dark:border-purple-800/40 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#8b5cf6]"></span>
                    <span className="text-[18px] font-bold text-purple-700 dark:text-purple-300 leading-none">{completedTasks}</span>
                  </div>
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">Completed</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200/60 dark:border-red-800/40 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                    <span className="text-[18px] font-bold text-red-700 dark:text-red-300 leading-none">{upcomingTasks}</span>
                  </div>
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">Overdue</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 6. LEAVE SUMMARY */}
      <div>
        <SectionHeader title="Leave Summary" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Leaves */}
          <div
            onClick={() => navigate('/employee/leave')}
            className="group border border-gray-200/80 dark:border-[#38352e] hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all duration-300 rounded-2xl p-4 flex justify-between items-center bg-white dark:bg-[#1a1714] hover:shadow-md cursor-pointer hover:-translate-y-0.5"
          >
            <div>
              <p className="text-xs text-[#939084] dark:text-[#a09c8d] font-semibold uppercase tracking-wider mb-1">Total Leaves</p>
              <p className="text-2xl font-bold text-[#36342e] dark:text-[#e5e2da]" style={{ fontFamily: 'Manrope, sans-serif' }}>{totalAllocated}</p>
              <p className="text-[10px] text-[#939084] dark:text-[#a09c8d] mt-1">Days Allocated</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/60 p-2.5 rounded-xl text-blue-600 dark:text-blue-400 transition-colors duration-300">
              <Calendar size={20} />
            </div>
          </div>

          {/* Used Leaves */}
          <div
            onClick={() => navigate('/employee/leave')}
            className="group border border-gray-200/80 dark:border-[#38352e] hover:border-orange-500 dark:hover:border-orange-400 hover:bg-orange-50/20 dark:hover:bg-orange-950/20 transition-all duration-300 rounded-2xl p-4 flex justify-between items-center bg-white dark:bg-[#1a1714] hover:shadow-md cursor-pointer hover:-translate-y-0.5"
          >
            <div>
              <p className="text-xs text-[#939084] dark:text-[#a09c8d] font-semibold uppercase tracking-wider mb-1">Used Leaves</p>
              <p className="text-2xl font-bold text-[#36342e] dark:text-[#e5e2da]" style={{ fontFamily: 'Manrope, sans-serif' }}>{totalUsedLeaves}</p>
              <p className="text-[10px] text-[#939084] dark:text-[#a09c8d] mt-1">Days Used</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/60 p-2.5 rounded-xl text-orange-600 dark:text-orange-400 transition-colors duration-300">
              <CalendarCheck size={20} />
            </div>
          </div>

          {/* Pending Leaves */}
          <div
            onClick={() => navigate('/employee/leave')}
            className="group border border-gray-200/80 dark:border-[#38352e] hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 transition-all duration-300 rounded-2xl p-4 flex justify-between items-center bg-white dark:bg-[#1a1714] hover:shadow-md cursor-pointer hover:-translate-y-0.5"
          >
            <div>
              <p className="text-xs text-[#939084] dark:text-[#a09c8d] font-semibold uppercase tracking-wider mb-1">Pending Leaves</p>
              <p className="text-2xl font-bold text-[#36342e] dark:text-[#e5e2da]" style={{ fontFamily: 'Manrope, sans-serif' }}>{pendingLeaves}</p>
              <p className="text-[10px] text-[#939084] dark:text-[#a09c8d] mt-1">Requests Pending</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/60 p-2.5 rounded-xl text-purple-600 dark:text-purple-400 transition-colors duration-300">
              <CalendarX size={20} />
            </div>
          </div>

          {/* Approved Leaves */}
          <div
            onClick={() => navigate('/employee/leave')}
            className="group border border-gray-200/80 dark:border-[#38352e] hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all duration-300 rounded-2xl p-4 flex justify-between items-center bg-white dark:bg-[#1a1714] hover:shadow-md cursor-pointer hover:-translate-y-0.5"
          >
            <div>
              <p className="text-xs text-[#939084] dark:text-[#a09c8d] font-semibold uppercase tracking-wider mb-1">Approved Leaves</p>
              <p className="text-2xl font-bold text-[#36342e] dark:text-[#e5e2da]" style={{ fontFamily: 'Manrope, sans-serif' }}>{approvedLeaves}</p>
              <p className="text-[10px] text-[#939084] dark:text-[#a09c8d] mt-1">Days Approved</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 transition-colors duration-300">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* 5. QUICK ACTIONS */}
      <SectionHeader title="Quick Actions" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {isCheckedIn ? (
          <button
            onClick={handleCheckOut}
            disabled={checkInLoading}
            className="flex items-center justify-center gap-2.5 px-3 py-2.5 bg-white dark:bg-[#1a1714] border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-950/40 hover:border-red-400 dark:hover:border-red-700 rounded-2xl w-full h-14 transition-all duration-300 shadow-2xs hover:shadow-md cursor-pointer active:scale-[0.98]"
          >
            <LogOut size={20} className="shrink-0" />
            <span className="text-xs font-bold whitespace-nowrap">Check Out</span>
          </button>
        ) : (
          <button
            onClick={handleCheckIn}
            disabled={checkInLoading}
            className="flex items-center justify-center gap-2.5 px-3 py-2.5 bg-white dark:bg-[#1a1714] border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 hover:border-emerald-400 dark:hover:border-emerald-700 rounded-2xl w-full h-14 transition-all duration-300 shadow-2xs hover:shadow-md cursor-pointer active:scale-[0.98]"
          >
            <LogIn size={20} className="shrink-0" />
            <span className="text-xs font-bold whitespace-nowrap">Check In</span>
          </button>
        )}

        {[
          { icon: <CalendarPlus size={20} />, label: 'Apply Leave', style: 'border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 hover:border-blue-400 dark:hover:border-blue-700', to: '/employee/leave' },
          { icon: <Briefcase size={20} />, label: 'My Tasks', style: 'border-purple-200 dark:border-purple-900/60 text-purple-600 dark:text-purple-400 hover:bg-purple-50/70 dark:hover:bg-purple-950/40 hover:border-purple-400 dark:hover:border-purple-700', to: '/employee/task-management' },
          { icon: <Clock size={20} />, label: 'Attendance', style: 'border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-amber-950/40 hover:border-amber-400 dark:hover:border-amber-700', to: '/employee/attendance' },
          { icon: <FileText size={20} />, label: 'Payslip', style: 'border-pink-200 dark:border-pink-900/60 text-pink-600 dark:text-pink-400 hover:bg-pink-50/70 dark:hover:bg-pink-950/40 hover:border-pink-400 dark:hover:border-pink-700', to: '/employee/payslips' },
          { icon: <User size={20} />, label: 'My Profile', style: 'border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 hover:border-emerald-400 dark:hover:border-emerald-700', to: '/employee/profile' }
        ].map((act, i) => (
          <button
            key={i}
            onClick={() => navigate(act.to)}
            className={`flex items-center justify-center gap-2.5 px-3 py-2.5 bg-white dark:bg-[#1a1714] border ${act.style} rounded-2xl w-full h-14 transition-all duration-300 shadow-2xs hover:shadow-md cursor-pointer active:scale-[0.98]`}
          >
            <span className="shrink-0">{act.icon}</span>
            <span className="text-xs font-bold whitespace-nowrap">{act.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* 8. UPCOMING HOLIDAYS */}
        <div>
          <SectionHeader title="Upcoming Holidays" />
          <div className="relative group overflow-hidden rounded-2xl cursor-pointer" onClick={() => navigate('/employee/holidays')}>
            <Card className="h-72 overflow-y-auto">
              <div className="space-y-4">
                {holidaysList.map((h, i) => (
                  <div key={i} className="flex gap-4 items-center border-b border-[#eceae3] dark:border-[#38352e] pb-4 last:border-0 last:pb-0">
                    <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-center min-w-[56px] p-2 border border-indigo-100 dark:border-indigo-800/50">
                      <p className="text-xl font-bold leading-none">{h.date.split(' ')[0]}</p>
                      <p className="text-[10px] font-bold uppercase mt-1">{h.date.split(' ')[1]}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-[#201515] dark:text-white">{h.name}</p>
                      <p className="text-xs text-[#939084] mt-0.5">{h.type}</p>
                    </div>
                    <span className="text-[11px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 px-3 py-1 rounded-full whitespace-nowrap shadow-xs">
                      In {h.daysLeft} days
                    </span>
                  </div>
                ))}
              </div>
            </Card>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-r from-indigo-600 to-sky-600 text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10 pointer-events-none">
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
                      <div className="bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl text-center min-w-[56px] p-2 border border-orange-100 dark:border-orange-800/50 relative">
                        <p className="text-xl font-bold leading-none">{evtDate.getDate()}</p>
                        <p className="text-[10px] font-bold uppercase mt-1">{evtDate.toLocaleString('default', { month: 'short' })}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-[#201515] dark:text-white">{e.title}</p>
                        <p className="text-xs text-[#939084] line-clamp-1 mt-0.5">{e.description || 'No description'}</p>
                      </div>
                      <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/40 px-2.5 py-0.5 rounded-full whitespace-nowrap">{e.startTime}</p>
                    </div>
                  );
                }) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-800/40 flex items-center justify-center text-orange-500 mb-2.5">
                      <Calendar size={22} />
                    </div>
                    <p className="text-sm font-semibold text-[#201515] dark:text-white">No Upcoming Events</p>
                    <p className="text-xs text-[#939084] mt-0.5">No meetings or events scheduled</p>
                  </div>
                )}
              </div>
            </Card>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-center py-2 text-xs font-bold translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10 pointer-events-none">
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
                  <div key={idx} className="flex items-center justify-between p-3 border border-[#eceae3] dark:border-[#38352e] rounded-xl bg-white dark:bg-[#14120e] hover:border-[#00a76b] transition-colors">
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
                        ₹ ******
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
                { id: 'all', label: 'All Celebrations', icon: PartyPopper, count: events.length },
                { id: 'birthday', label: 'Birthdays', icon: Cake, count: events.filter(e => e.type === 'birthday').length },
                { id: 'anniversary', label: 'Anniversaries', icon: Sparkles, count: events.filter(e => e.type === 'anniversary').length },
              ].map((tab) => {
                const isActive = eventFilter === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setEventFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${isActive
                      ? 'bg-[#00a76b] text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                  >
                    <Icon size={14} className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive
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
                        className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between border ${isToday
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
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-[#14120e] shadow-sm flex items-center justify-center border border-gray-100 dark:border-[#2f2b24]">
                              {isBirthday ? (
                                <Cake size={11} className="text-amber-500" />
                              ) : (
                                <Sparkles size={11} className="text-amber-500" />
                              )}
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
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shrink-0 cursor-pointer ${isWished
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#00a76b] dark:text-emerald-400 border border-[#00a76b]/30 dark:border-emerald-800/40 shadow-xs'
                              : isToday || isPast
                                ? 'bg-[#00a76b] hover:bg-[#008f5b] text-white shadow-sm shadow-[#00a76b]/20 active:scale-95'
                                : 'bg-white hover:bg-gray-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-neutral-700 active:scale-95'
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

      {/* ⚠️ FluidHR Desktop Application Missing Modal */}
      <DesktopAppRequiredModal
        isOpen={trackerMissingModal}
        onClose={() => setTrackerMissingModal(false)}
        onRetry={handleCheckIn}
        token={token()}
        isRetrying={checkInLoading}
      />
    </div>
  );
};

export default Dashboard;
