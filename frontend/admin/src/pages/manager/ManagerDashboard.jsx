import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import {
  Users, UserCheck, ClipboardList, TrendingUp, AlertCircle, Briefcase, Calendar as CalendarIcon,
  CheckCircle2, Clock, MoreHorizontal, Star, Bell, ArrowRight, Plus, Check, MapPin, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QuickActionsRow from '../../components/QuickActionsRow';

// ─── UTILS ─────────────────────────────────────────────────────────────
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

// ─── STYLED COMPONENTS ────────────────────────────────────────────────
const Card = ({ children, className = '', style = {}, ...props }) => (
  <div
    style={style}
    className={`bg-white dark:bg-[#161311] border border-[#eceae3] dark:border-[#28251e] rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${className}`}
    {...props}
  >
    {children}
  </div>
);

const getEmpId = (emp) => {
  if (!emp) return '';
  if (typeof emp === 'string') return emp;
  return (emp._id || emp.employeeId || emp.id || emp.user || emp.userId || '').toString();
};

const isSameEmp = (empA, empB) => {
  if (!empA || !empB) return false;
  const idA = getEmpId(empA);
  const idB = getEmpId(empB);
  if (idA && idB && idA === idB) return true;

  const userA = (empA?.user || empA?.userId || '').toString();
  const userB = (empB?.user || empB?.userId || '').toString();
  if (userA && idB && userA === idB) return true;
  if (idA && userB && idA === userB) return true;
  if (userA && userB && userA === userB) return true;

  const codeA = (empA?.employeeId || '').toString().toLowerCase().trim();
  const codeB = (empB?.employeeId || '').toString().toLowerCase().trim();
  if (codeA && codeB && codeA === codeB) return true;

  const nameA = (empA?.fullName || empA?.name || (empA?.firstName ? `${empA.firstName} ${empA.lastName || ''}` : '')).toLowerCase().replace(/\s+/g, ' ').trim();
  const nameB = (empB?.fullName || empB?.name || (empB?.firstName ? `${empB.firstName} ${empB.lastName || ''}` : '')).toLowerCase().replace(/\s+/g, ' ').trim();
  if (nameA && nameB && nameA === nameB) return true;

  return false;
};

const isTodayDate = (dateVal) => {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
};

const isDateInLeaveRange = (targetDateStr, startDate, endDate) => {
  if (!startDate) return false;
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = endDate ? new Date(endDate) : new Date(startDate);
  end.setHours(23, 59, 59, 999);

  return target >= start && target <= end;
};

const SectionHeader = ({ title, action }) => (
  <div className="flex justify-between items-center mb-5">
    <h2 className="font-bold text-[#1e293b] dark:text-white" style={{ fontFamily: 'Manrope, sans-serif', fontSize: '16px' }}>{title}</h2>
    {action && (typeof action === 'string' ? <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">{action}</span> : action)}
  </div>
);

const Dropdown = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  const selectedOpt = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-[#1f1b17] border border-slate-200 dark:border-[#28251e] text-slate-700 dark:text-slate-200 hover:border-[#00a76b] hover:bg-emerald-50/30 dark:hover:bg-[#28251e] transition-all cursor-pointer shadow-xs select-none"
      >
        <span>{selectedOpt?.label}</span>
        <ChevronRight size={13} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90 text-[#00a76b]' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-[#1f1b17] border border-slate-200/80 dark:border-[#28251e] rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${isSelected
                  ? 'bg-emerald-50 dark:bg-[#28251e] text-[#00a76b] font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#28251e]/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={13} className="text-[#00a76b]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── MOCK DATA FALLBACKS ─────────────────────────────────────────────
const MOCK_GOALS = [
  { name: 'Project Delivery', progress: 75, color: '#22c55e' },
  { name: 'Quality & Excellence', progress: 60, color: '#3b82f6' },
  { name: 'Team Learning', progress: 70, color: '#a855f7' }
];

const MOCK_PROJECTS = [
  { name: 'HRMS Redesign', due: '05 Aug 2026', progress: 70, status: 'On Track', color: '#22c55e' },
  { name: 'Mobile Application', due: '15 Aug 2026', progress: 45, status: 'At Risk', color: '#f97316' },
  { name: 'Performance Module', due: '28 Jul 2026', progress: 90, status: 'On Track', color: '#8b5cf6' },
  { name: 'Analytics Dashboard', due: '12 Aug 2026', progress: 60, status: 'At Risk', color: '#f59e0b' }
];

const MOCK_WEEKLY_TREND = [
  { day: 'Mon', worked: 70, tasks: 25 },
  { day: 'Tue', worked: 75, tasks: 45 },
  { day: 'Wed', worked: 50, tasks: 35 },
  { day: 'Thu', worked: 80, tasks: 60 },
  { day: 'Fri', worked: 45, tasks: 20 },
  { day: 'Sat', worked: 15, tasks: 10 },
  { day: 'Sun', worked: 30, tasks: 15 }
];

// ─── DASHBOARD ────────────────────────────────────────────────────────
const ManagerDashboard = () => {
  const navigate = useNavigate();

  // ─ State ─
  const [profile, setProfile] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredStatCard, setHoveredStatCard] = useState(null);
  const [hoveredWorkload, setHoveredWorkload] = useState(null);
  const [hoveredTaskDonut, setHoveredTaskDonut] = useState(null);

  // ─ Filters ─
  const [attFilter, setAttFilter] = useState('weekly');
  const [attTrendData, setAttTrendData] = useState([]);
  const [taskFilter, setTaskFilter] = useState('monthly');
  const [perfFilter, setPerfFilter] = useState('monthly');
  const [goalFilter, setGoalFilter] = useState('quarterly');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [profRes, empRes, taskRes, attRes, projRes, notifRes, eventsRes, todayAttRes, leavesRes, managerLeavesRes] = await Promise.allSettled([
        api('/api/auth/me'),
        api('/api/employees'),
        api('/api/tasks'),
        api('/api/attendance'),
        api('/api/projects'),
        api('/api/notifications'),
        api('/api/events'),
        api('/api/attendance/today'),
        api('/api/leaves'),
        api('/api/leaves/manager')
      ]);

      if (profRes.status === 'fulfilled') setProfile(profRes.value.data);
      if (empRes.status === 'fulfilled') setTeamMembers(Array.isArray(empRes.value.data) ? empRes.value.data : []);
      if (taskRes.status === 'fulfilled') setTasks(Array.isArray(taskRes.value.data) ? taskRes.value.data : (taskRes.value.data?.data || []));

      let allAtt = [];
      if (attRes.status === 'fulfilled') {
        const d = attRes.value.data;
        const list = Array.isArray(d) ? d : (d?.data || d?.attendance || d?.records || d?.logs || []);
        allAtt = [...allAtt, ...list];
      }
      if (todayAttRes && todayAttRes.status === 'fulfilled') {
        const td = todayAttRes.value.data;
        const tList = Array.isArray(td) ? td : (td?.data || td?.attendance || td?.records || td?.logs || []);
        allAtt = [...allAtt, ...tList];
      }
      setAttendance(allAtt);

      let allLeaves = [];
      if (leavesRes && leavesRes.status === 'fulfilled') {
        const ld = leavesRes.value.data;
        const lList = Array.isArray(ld) ? ld : (ld?.data || ld?.leaves || ld?.records || []);
        allLeaves = [...allLeaves, ...lList];
      }
      if (managerLeavesRes && managerLeavesRes.status === 'fulfilled') {
        const mld = managerLeavesRes.value.data;
        const mlList = Array.isArray(mld) ? mld : (mld?.data || mld?.leaves || mld?.records || []);
        allLeaves = [...allLeaves, ...mlList];
      }
      setLeaves(allLeaves);

      if (projRes.status === 'fulfilled') setProjects(Array.isArray(projRes.value.data) ? projRes.value.data : []);
      if (notifRes.status === 'fulfilled') setNotifications(Array.isArray(notifRes.value.data) ? notifRes.value.data : []);
      if (eventsRes && eventsRes.status === 'fulfilled') setEvents(Array.isArray(eventsRes.value.data?.data) ? eventsRes.value.data.data : []);

    } catch (e) {
      console.error('Failed to load manager dashboard', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fetchAttTrend = useCallback(async (filter = attFilter) => {
    try {
      const periodParam = filter === 'monthly' ? 'month' : 'week';
      const res = await api(`/api/attendance/summary/weekly?period=${periodParam}`);
      const list = res.data?.this_week || [];
      const totalTeamCount = teamMembers.length || 1;
      const formatted = list.map(item => {
        const working = (item.Present || 0) + (item.Late || 0) + (item['Half Day'] || 0);
        const rate = totalTeamCount > 0 ? Math.round((working / totalTeamCount) * 100) : 0;
        return {
          day: item.name,
          att: Math.min(100, rate),
          working,
          total: totalTeamCount
        };
      });
      setAttTrendData(formatted);
    } catch (e) {
      console.error('Error fetching attendance trend:', e);
    }
  }, [attFilter, teamMembers.length]);

  useEffect(() => {
    fetchAttTrend(attFilter);
  }, [attFilter, fetchAttTrend]);

  // ─── COMPUTED DATA ────────────────────────────────────────────────────
  const managerName = profile?.name?.split(' ')[0] || profile?.profile?.firstName || 'Manager';
  const totalTeam = teamMembers.length;

  const pendingTasksCount = tasks.filter(t => !['completed', 'done'].includes((t.status || '').toLowerCase())).length;
  const overdueTasksCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !['completed', 'done'].includes((t.status || '').toLowerCase())).length;
  const activeProjectsCount = projects.filter(p => !['completed', 'archived'].includes((p.status || '').toLowerCase())).length;

  const todayDateMidnight = new Date();
  todayDateMidnight.setHours(0, 0, 0, 0);

  const upcomingEvents = events
    .filter(e => new Date(e.date) >= todayDateMidnight)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4)
    .map(e => {
      const eDate = new Date(e.date);
      let tag = '';
      if (eDate.getTime() === todayDateMidnight.getTime()) tag = 'Today';
      else {
        const tomorrow = new Date(todayDateMidnight);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (eDate.getTime() === tomorrow.getTime()) tag = 'Tomorrow';
        else tag = eDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      }
      return {
        id: e._id,
        time: e.startTime,
        title: e.title,
        desc: e.description || e.eventType,
        tag: tag,
        color: e.eventType === 'Meeting' ? '#8b5cf6' : e.eventType === 'Review' ? '#3b82f6' : '#22c55e'
      };
    });

  // ─ Task Chart Data ─
  const taskStatusGroups = { todo: 0, inprogress: 0, inreview: 0, completed: 0, blocked: 0 };
  tasks.forEach(t => {
    const s = (t.status || '').toLowerCase().replace(/[^a-z]/g, '');
    if (s.includes('todo') || s.includes('ongoing')) taskStatusGroups.todo++;
    else if (s.includes('progress') || s.includes('pending')) taskStatusGroups.inprogress++;
    else if (s.includes('review')) taskStatusGroups.inreview++;
    else if (s.includes('block') || s.includes('needtoimprove')) taskStatusGroups.blocked++;
    else if (s.includes('complet') || s.includes('done')) taskStatusGroups.completed++;
    else taskStatusGroups.todo++;
  });

  let donutData = [
    { name: 'To Do', value: taskStatusGroups.todo, color: '#22c55e' },
    { name: 'In Progress', value: taskStatusGroups.inprogress, color: '#3b82f6' },
    { name: 'In Review', value: taskStatusGroups.inreview, color: '#f59e0b' },
    { name: 'Completed', value: taskStatusGroups.completed, color: '#a855f7' },
    { name: 'Blocked', value: taskStatusGroups.blocked, color: '#ef4444' }
  ];
  let totalTasksSum = donutData.reduce((acc, curr) => acc + curr.value, 0);

  if (totalTasksSum === 0) {
    donutData = [
      { name: 'To Do', value: 8, color: '#22c55e' },
      { name: 'In Progress', value: 14, color: '#3b82f6' },
      { name: 'In Review', value: 6, color: '#f59e0b' },
      { name: 'Completed', value: 20, color: '#a855f7' },
      { name: 'Blocked', value: 3, color: '#ef4444' }
    ];
    totalTasksSum = 51;
  }

  // ─ Kanban Data ─
  const kanbanColumns = [
    { id: 'todo', title: 'To Do', color: '#22c55e', bg: '#dcfce7', count: taskStatusGroups.todo || 2 },
    { id: 'inprogress', title: 'In Progress', color: '#3b82f6', bg: '#dbeafe', count: taskStatusGroups.inprogress || 2 },
    { id: 'inreview', title: 'In Review', color: '#f59e0b', bg: '#fef3c7', count: taskStatusGroups.inreview || 1 },
    { id: 'completed', title: 'Completed', color: '#10b981', bg: '#d1fae5', count: taskStatusGroups.completed || 1 }
  ];

  const realKanbanTasks = { todo: [], inprogress: [], inreview: [], completed: [] };
  tasks.forEach(t => {
    const s = (t.status || '').toLowerCase().replace(/[^a-z]/g, '');
    let category = 'todo';
    if (s.includes('progress') || s.includes('pending')) category = 'inprogress';
    else if (s.includes('review')) category = 'inreview';
    else if (s.includes('complet') || s.includes('done')) category = 'completed';

    const assigneeName = t.assignedTo?.name || t.assignedTo?.fullName || (typeof t.assignedTo === 'string' ? t.assignedTo : 'Unassigned');
    const avatarChar = assigneeName.charAt(0).toUpperCase() || 'U';

    realKanbanTasks[category].push({
      id: t._id || Math.random().toString(),
      title: t.title || t.taskName || 'Untitled Task',
      assignee: assigneeName,
      avatar: avatarChar,
      progress: category === 'completed' ? 100 : (t.progress || (category === 'inprogress' ? 50 : null))
    });
  });

  if (tasks.length === 0) {
    realKanbanTasks.todo = [
      { id: 'm1', title: 'Design System Updates', assignee: 'Neha Verma', avatar: 'N', progress: null },
      { id: 'm2', title: 'API Documentation Revision', assignee: 'Arjun Patel', avatar: 'A', progress: null }
    ];
    realKanbanTasks.inprogress = [
      { id: 'm3', title: 'Core Authentication Module', assignee: 'Karan Mehta', avatar: 'K', progress: 65 },
      { id: 'm4', title: 'Database Migration Prep', assignee: 'Sneha Reddy', avatar: 'S', progress: 40 }
    ];
    realKanbanTasks.inreview = [
      { id: 'm5', title: 'Landing Page Redesign', assignee: 'Neha Verma', avatar: 'N', progress: 90 }
    ];
    realKanbanTasks.completed = [
      { id: 'm6', title: 'Setup CI/CD Pipelines', assignee: 'Rahul Mehta', avatar: 'R', progress: 100 }
    ];
  }

  // ─ Performance & Workload Mock Data ─
  const teamPerfData = [
    { name: 'Neha Verma', performance: 92, color: '#10b981' },
    { name: 'Arjun Patel', performance: 85, color: '#3b82f6' },
    { name: 'Karan Mehta', performance: 78, color: '#f59e0b' },
    { name: 'Pooja Desai', performance: 88, color: '#8b5cf6' },
    { name: 'Sneha Reddy', performance: 75, color: '#14b8a6' }
  ];
  const teamAvgPerf = (teamPerfData.reduce((acc, curr) => acc + curr.performance, 0) / teamPerfData.length).toFixed(1);

  const workloadData = [
    { name: 'UI/UX Team', value: 80, color: '#22c55e' },
    { name: 'Backend Team', value: 70, color: '#3b82f6' },
    { name: 'QA Team', value: 60, color: '#f59e0b' },
    { name: 'DevOps Team', value: 50, color: '#8b5cf6' }
  ];

  const todayDateISO = new Date().toISOString().split('T')[0];
  const allMembersAvailability = teamMembers.map(member => {
    const memberName = member.fullName || member.name || (member.firstName ? `${member.firstName} ${member.lastName || ''}`.trim() : 'Unknown');
    const memberAtt = attendance.find(a =>
      isSameEmp(a.employeeId || a.employee || a.userId || a.user || a, member) &&
      isTodayDate(a.date || a.createdAt || a.checkIn || a.checkInTime || a.startTime) &&
      (a.status || '').toLowerCase() !== 'absent'
    );
    const memberLeave = leaves.find(l => isSameEmp(l.employeeId || l.employee || l.userId || l.user || l, member) && (l.status === 'approved' || l.status === 'Approved' || l.status === 'pending' || l.status === 'Pending') && isDateInLeaveRange(todayDateISO, l.startDate, l.endDate));

    let status = 'Not Logged In';
    let color = '#94a3b8';

    const isOnLeaveToday = Boolean(memberLeave) || (memberAtt && (memberAtt.status || '').toLowerCase().includes('leave'));

    if (isOnLeaveToday) {
      status = 'On Leave';
      color = '#ef4444';
    } else if (memberAtt) {
      const st = (memberAtt.status || '').toLowerCase();
      const hasRealClockIn = (memberAtt.clockIn && memberAtt.clockIn !== '--') ||
                             (memberAtt.checkInTime && memberAtt.checkInTime !== '--') ||
                             (memberAtt.checkIn && memberAtt.checkIn !== '--') ||
                             st.includes('present') || st.includes('working') || st.includes('late') || st.includes('half');
      if (hasRealClockIn) {
        status = 'Logged In';
        color = '#22c55e';
      }
    }

    return {
      name: memberName,
      role: member.designation || member.role || 'Employee',
      status: status,
      color: color,
      hasDot: status === 'Logged In'
    };
  });

  const teamAvailability = allMembersAvailability.slice(0, 8);
  const presentToday = allMembersAvailability.filter(m => m.status === 'Logged In').length;
  const presentPercent = totalTeam ? Math.round((presentToday / totalTeam) * 100) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-gray-500 dark:text-gray-400 bg-[#F8F9FB] dark:bg-[#110e0c]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00a76b] mb-4"></div>
        <p className="font-semibold text-lg">Loading Manager Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FB] dark:bg-[#110e0c] min-h-screen text-[#1e293b] dark:text-gray-200 font-['Inter',sans-serif] px-4 py-8 max-w-[1600px] mx-auto space-y-6">

      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a] dark:text-white">
            {getGreeting()}, {managerName}! 👋
          </h1>
          <p className="text-gray-500 dark:text-[#a3a094] mt-1 font-medium">
            Here's what's happening with your team today.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-[#161311] border border-gray-200 dark:border-[#28251e] px-4 py-2 rounded-xl shadow-xs">
          <CalendarIcon size={18} className="text-gray-500 dark:text-gray-400" />
          <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{fmtDate()}</span>
        </div>
      </div>

      {/* 2. STATS CARDS ROW (6 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          {
            icon: Users,
            iconColor: 'text-[#22c55e]',
            bg: 'bg-green-50 dark:bg-green-950/40',
            label: 'Team Members',
            value: totalTeam,
            sub: '↑ 2 this month',
            subColor: 'text-green-600 dark:text-green-400',
            borderColor: '#22c55e',
            glowColor: 'rgba(34, 197, 94, 0.22)',
            hoverBorder: 'hover:!border-[#22c55e] dark:hover:!border-[#22c55e]'
          },
          {
            icon: UserCheck,
            iconColor: 'text-[#3b82f6]',
            bg: 'bg-blue-50 dark:bg-blue-950/40',
            label: 'Present Today',
            value: presentToday,
            sub: `${presentPercent}% of team`,
            subColor: 'text-gray-500 dark:text-gray-400',
            borderColor: '#3b82f6',
            glowColor: 'rgba(59, 130, 246, 0.22)',
            hoverBorder: 'hover:!border-[#3b82f6] dark:hover:!border-[#3b82f6]'
          },
          {
            icon: ClipboardList,
            iconColor: 'text-[#8b5cf6]',
            bg: 'bg-purple-50 dark:bg-purple-950/40',
            label: 'Pending Tasks',
            value: pendingTasksCount,
            sub: 'Needs attention',
            subColor: 'text-amber-600 dark:text-amber-400',
            borderColor: '#8b5cf6',
            glowColor: 'rgba(139, 92, 246, 0.22)',
            hoverBorder: 'hover:!border-[#8b5cf6] dark:hover:!border-[#8b5cf6]'
          },
          {
            icon: TrendingUp,
            iconColor: 'text-[#f59e0b]',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
            label: 'Productivity',
            value: '87%',
            sub: '↑ 8% vs last week',
            subColor: 'text-green-600 dark:text-green-400',
            borderColor: '#f59e0b',
            glowColor: 'rgba(245, 158, 11, 0.22)',
            hoverBorder: 'hover:!border-[#f59e0b] dark:hover:!border-[#f59e0b]'
          },
          {
            icon: AlertCircle,
            iconColor: 'text-[#ef4444]',
            bg: 'bg-red-50 dark:bg-red-950/40',
            label: 'Overdue Tasks',
            value: overdueTasksCount,
            sub: 'Requires action',
            subColor: 'text-red-500 dark:text-red-400',
            borderColor: '#ef4444',
            glowColor: 'rgba(239, 68, 68, 0.22)',
            hoverBorder: 'hover:!border-[#ef4444] dark:hover:!border-[#ef4444]'
          },
          {
            icon: Briefcase,
            iconColor: 'text-[#14b8a6]',
            bg: 'bg-teal-50 dark:bg-teal-950/40',
            label: 'Active Projects',
            value: activeProjectsCount,
            sub: 'Running smoothly',
            subColor: 'text-teal-600 dark:text-teal-400',
            borderColor: '#14b8a6',
            glowColor: 'rgba(20, 184, 166, 0.22)',
            hoverBorder: 'hover:!border-[#14b8a6] dark:hover:!border-[#14b8a6]'
          },
        ].map((stat, i) => {
          const isHovered = hoveredStatCard === i;
          return (
            <Card
              key={i}
              onMouseEnter={() => setHoveredStatCard(i)}
              onMouseLeave={() => setHoveredStatCard(null)}
              style={isHovered ? {
                borderColor: stat.borderColor,
                boxShadow: `0 6px 16px -2px ${stat.glowColor}`
              } : undefined}
              className={`!p-2.5 flex flex-col justify-start gap-1 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer shadow-xs ${stat.hoverBorder}`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${stat.bg} ${stat.iconColor}`}>
                  <stat.icon size={14} strokeWidth={2.5} />
                </div>
                <p className="text-[10px] sm:text-[10.5px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight leading-tight flex-1 min-w-0 truncate">{stat.label}</p>
              </div>
              <div className="flex items-baseline gap-2.5 overflow-hidden">
                <h3 className="text-lg sm:text-xl font-black text-[#0f172a] dark:text-white tracking-tight leading-none shrink-0">{stat.value}</h3>
                <span className={`text-[9.5px] sm:text-[10px] font-bold ${stat.subColor} whitespace-nowrap truncate`}>{stat.sub}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 3. QUICK ACTIONS ROW */}
      <QuickActionsRow role="manager" />

      {/* 3. SECOND ROW (Attendance Trend & Task Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="min-h-[280px] flex flex-col">
          <SectionHeader
            title="Team Attendance Trend"
            action={<Dropdown value={attFilter} onChange={setAttFilter} options={[{ value: 'weekly', label: 'This Week' }, { value: 'monthly', label: 'This Month' }]} />}
          />
          <div className="flex-1 -mx-4 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attTrendData.length > 0 ? attTrendData : MOCK_WEEKLY_TREND.map(d => ({ ...d, att: 0 }))} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#28251e" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Attendance Rate']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #38332c', backgroundColor: '#1e1a17', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', fontSize: '12px', fontWeight: '600' }}
                />
                <Area name="Attendance Rate" type="monotone" dataKey="att" stroke="#22c55e" strokeWidth={3} fill="url(#colorAtt)" dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#22c55e' }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="min-h-[280px] flex flex-col">
          <SectionHeader
            title="Task Status Overview"
            action={<Dropdown value={taskFilter} onChange={setTaskFilter} options={[{ value: 'monthly', label: 'This Month' }, { value: 'weekly', label: 'This Week' }]} />}
          />
          <div className="flex-1 flex items-center justify-between px-4 sm:px-6">
            <div className="w-[150px] h-[150px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={4}
                    onMouseEnter={(_, index) => setHoveredTaskDonut(index)}
                    onMouseLeave={() => setHoveredTaskDonut(null)}
                  >
                    {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
                {hoveredTaskDonut !== null ? (
                  <>
                    <span className="text-2xl font-extrabold leading-none tracking-tight" style={{ color: donutData[hoveredTaskDonut].color }}>
                      {donutData[hoveredTaskDonut].value}
                    </span>
                    <span className="text-[10px] font-bold mt-0.5 truncate max-w-[85px]" style={{ color: donutData[hoveredTaskDonut].color }}>
                      {donutData[hoveredTaskDonut].name}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold text-[#0f172a] dark:text-white leading-none">{totalTasksSum}</span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-[#a3a094]">Total Tasks</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 justify-center">
              {donutData.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <div>
                    <p className="text-sm font-bold text-[#0f172a] dark:text-white leading-none">{d.value}</p>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-[#a3a094] mt-0.5">{d.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>



      {/* 5. KANBAN BOARD */}
      <div>
        <SectionHeader title="Team Task Board" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {kanbanColumns.map((col, idx) => (
            <div key={idx} className="bg-white dark:bg-[#161311] border border-gray-100 dark:border-[#28251e] rounded-2xl p-4 shadow-xs flex flex-col h-80">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm" style={{ color: col.color }}>{col.title}</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full dark:bg-opacity-20" style={{ backgroundColor: col.bg, color: col.color }}>
                  {col.count}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {(realKanbanTasks[col.id] || []).map(task => (
                  <div key={task.id} className="p-3 border border-gray-100 dark:border-[#28251e] rounded-xl shadow-xs hover:shadow-md transition-shadow cursor-grab bg-gray-50/50 dark:bg-[#1f1b17] hover:bg-white dark:hover:bg-[#25201b] group">
                    <h4 className="text-xs font-bold text-[#1e293b] dark:text-white mb-3 line-clamp-2">{task.title}</h4>
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-[#28251e] flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300">
                          {task.avatar}
                        </div>
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-[#a3a094]">{task.assignee}</span>
                      </div>
                      {task.progress !== null ? (
                        task.progress === 100 ? (
                          <div className="text-[#10b981]"><Check size={14} strokeWidth={3} /></div>
                        ) : (
                          <div className="text-[10px] font-bold px-1.5 py-0.5 rounded border dark:bg-opacity-10" style={{ color: col.color, borderColor: col.color }}>
                            {task.progress}%
                          </div>
                        )
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/manager/task-management/create')}
                className="mt-3 w-full py-2 border border-dashed border-gray-300 dark:border-[#28251e] rounded-xl text-xs font-bold text-gray-500 dark:text-[#a3a094] hover:border-gray-400 dark:hover:border-[#38332c] hover:text-gray-700 dark:hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Task
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 6. FOURTH ROW (Calendar, Availability) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card className="h-[350px] flex flex-col">
          <SectionHeader title="Team Calendar" />
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
              <button className="text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"><ChevronLeft size={18} /></button>
              <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex items-center gap-2">
                <button className="text-[10px] font-bold border border-gray-200 dark:border-[#28251e] rounded px-2 py-0.5 text-gray-600 dark:text-gray-300 bg-white dark:bg-[#1f1b17] hover:bg-gray-50 dark:hover:bg-[#28251e] cursor-pointer">Today</button>
                <button className="text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"><ChevronRight size={18} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center mb-2 px-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <span key={d} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 text-center gap-y-1 flex-1 px-2">
              {(() => {
                const today = new Date();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
                const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
                const totalCells = offset + daysInMonth > 35 ? 42 : 35;

                return [...Array(totalCells)].map((_, i) => {
                  const day = i - offset + 1;
                  if (day < 1 || day > daysInMonth) return <div key={i} className="p-0.5"></div>;
                  const isToday = day === today.getDate();
                  return (
                    <div key={i} className="flex flex-col items-center justify-center p-0.5 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1f1b17] rounded-lg">
                      <span className={`text-[11px] font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#00a76b] text-white shadow-sm font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {day}
                      </span>
                      {day === 15 && <div className="absolute bottom-0 w-1 h-1 rounded-full bg-blue-500" />}
                      {day === 23 && <div className="absolute bottom-0 flex gap-0.5"><div className="w-1 h-1 rounded-full bg-blue-500" /><div className="w-1 h-1 rounded-full bg-purple-500" /></div>}
                    </div>
                  );
                });
              })()}
            </div>
            <div className="flex items-center justify-center gap-4 mt-1 pt-2 border-t border-gray-100 dark:border-[#28251e]">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" /><span className="text-[9px] font-bold text-gray-500 dark:text-[#a3a094]">Meeting</span></div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" /><span className="text-[9px] font-bold text-gray-500 dark:text-[#a3a094]">Deadline</span></div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /><span className="text-[9px] font-bold text-gray-500 dark:text-[#a3a094]">Leave</span></div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" /><span className="text-[9px] font-bold text-gray-500 dark:text-[#a3a094]">Event</span></div>
            </div>
          </div>
        </Card>

        {/* Availability */}
        <Card className="h-[350px] flex flex-col">
          <SectionHeader title="Team Availability" />
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {teamAvailability.map((member, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#25201b] dark:to-[#1a1714] border-2 border-white dark:border-[#28251e] shadow-xs flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0f172a] dark:text-white group-hover:text-[#00a76b] transition-colors">{member.name}</h4>
                    <p className="text-[10px] font-semibold text-gray-500 dark:text-[#a3a094] mt-0.5">{member.role}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 bg-transparent dark:bg-opacity-10 whitespace-nowrap shrink-0" style={{ color: member.color, borderColor: member.color }}>
                  {member.hasDot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.color }} />}
                  {member.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>



      {/* 8. BOTTOM ROW (Schedule, Quick Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Upcoming Schedule */}
        <Card className="h-72 flex flex-col">
          <SectionHeader title="Upcoming Schedule" />
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {upcomingEvents.length > 0 ? upcomingEvents.map((item, i) => (
              <div key={item.id || i} className="flex gap-4 items-start">
                <span className="text-[11px] font-bold text-[#0f172a] dark:text-white w-16 shrink-0">{item.time}</span>
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex-1 border-b border-gray-100 dark:border-[#28251e] pb-4">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-[#0f172a] dark:text-white truncate pr-2">{item.title}</h4>
                    <span className="text-[9px] font-bold text-white px-2 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: item.color }}>{item.tag}</span>
                  </div>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-[#a3a094] mt-1 line-clamp-1">{item.desc}</p>
                </div>
              </div>
            )) : (
              <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">No upcoming events found.</div>
            )}
          </div>
          <button
            onClick={() => navigate('/manager/events')}
            className="mt-2 w-full py-2 text-xs font-bold text-[#00a76b] hover:bg-green-50 dark:hover:bg-[#16291e] rounded-xl transition-colors cursor-pointer"
          >
            View Full Schedule
          </button>
        </Card>

        {/* Quick Actions */}
        <Card className="h-72 flex flex-col bg-transparent border-none shadow-none p-0">
          <SectionHeader title="Quick Actions" />
          <div className="flex-1 grid grid-cols-3 gap-3">
            {[
              { icon: <ClipboardList size={20} />, label: 'Assign Task', color: '#22c55e', bg: 'bg-[#f0fdf4] dark:bg-green-950/40 text-[#22c55e] dark:text-[#34d399]', path: '/manager/task-management/create' },
              { icon: <Briefcase size={20} />, label: 'Create Project', color: '#3b82f6', bg: 'bg-[#eff6ff] dark:bg-blue-950/40 text-[#3b82f6] dark:text-[#60a5fa]', path: '/manager/projects' },
              { icon: <UserCheck size={20} />, label: 'Approve Leave', color: '#f59e0b', bg: 'bg-[#fffbeb] dark:bg-amber-950/40 text-[#f59e0b] dark:text-[#fbbf24]', path: '/manager/leave' },
              { icon: <TrendingUp size={20} />, label: 'Team Report', color: '#a855f7', bg: 'bg-[#f3e8ff] dark:bg-purple-950/40 text-[#a855f7] dark:text-[#c084fc]', path: '/manager/reports' },
              { icon: <CalendarIcon size={20} />, label: 'Schedule Meeting', color: '#ef4444', bg: 'bg-[#fee2e2] dark:bg-red-950/40 text-[#ef4444] dark:text-[#f87171]', path: '/manager/events' },
              { icon: <Star size={20} />, label: 'Performance Review', color: '#14b8a6', bg: 'bg-[#ccfbf1] dark:bg-teal-950/40 text-[#14b8a6] dark:text-[#2dd4bf]', path: '/manager/performance' },
            ].map((action, i) => (
              <button
                key={i}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 dark:border-[#28251e] bg-white dark:bg-[#161311] hover:border-gray-300 dark:hover:border-[#38332c] hover:bg-gray-50 dark:hover:bg-[#1f1b17] hover:shadow-md transition-all h-full cursor-pointer group"
                onClick={() => navigate(action.path)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${action.bg}`}>
                  {action.icon}
                </div>
                <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200 text-center leading-tight px-1">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
};

export default ManagerDashboard;
