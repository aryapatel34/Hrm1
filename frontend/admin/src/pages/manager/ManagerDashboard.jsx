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
const Card = ({ children, className = '', ...props }) => (
  <div
    className={`bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] ${className}`}
    {...props}
  >
    {children}
  </div>
);

const SectionHeader = ({ title, action }) => (
  <div className="flex justify-between items-center mb-5">
    <h2 className="font-bold text-[#1e293b]" style={{ fontFamily: 'Manrope, sans-serif', fontSize: '16px' }}>{title}</h2>
    {action && (typeof action === 'string' ? <span className="text-sm font-semibold text-gray-500 cursor-pointer hover:text-gray-700">{action}</span> : action)}
  </div>
);

const Dropdown = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none cursor-pointer"
  >
    {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
  </select>
);

// ─── MOCK DATA FALLBACKS ─────────────────────────────────────────────
// (Used when real API data is missing or shaped differently)

const MOCK_GOALS = [
  { name: 'Project Delivery', progress: 75, color: '#22c55e' },
  { name: 'Quality & Excellence', progress: 60, color: '#3b82f6' },
  { name: 'Team Learning', progress: 70, color: '#a855f7' }
];

const MOCK_SCHEDULE = [
  { time: '10:00 AM', title: 'Project Review Meeting', desc: 'HRMS Redesign', tag: 'Today', color: '#8b5cf6' },
  { time: '02:00 PM', title: '1:1 with Neha Verma', desc: 'Performance Discussion', tag: 'Today', color: '#3b82f6' },
  { time: '04:30 PM', title: 'Sprint Planning', desc: 'Mobile App Development', tag: 'Tomorrow', color: '#22c55e' }
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
  const [loading, setLoading] = useState(true);

  // ─ Filters ─
  const [attFilter, setAttFilter] = useState('weekly');
  const [taskFilter, setTaskFilter] = useState('monthly');
  const [perfFilter, setPerfFilter] = useState('monthly');
  const [goalFilter, setGoalFilter] = useState('quarterly');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [profRes, empRes, taskRes, attRes, projRes, notifRes, eventsRes] = await Promise.allSettled([
        api('/api/auth/me'),
        api('/api/employees'),
        api('/api/tasks'),
        api('/api/attendance'),
        api('/api/projects'),
        api('/api/notifications'),
        api('/api/events')
      ]);

      if (profRes.status === 'fulfilled') setProfile(profRes.value.data);
      if (empRes.status === 'fulfilled') setTeamMembers(Array.isArray(empRes.value.data) ? empRes.value.data : []);
      if (taskRes.status === 'fulfilled') setTasks(Array.isArray(taskRes.value.data) ? taskRes.value.data : (taskRes.value.data?.data || []));
      if (attRes.status === 'fulfilled') setAttendance(Array.isArray(attRes.value.data) ? attRes.value.data : []);
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


  // ─── COMPUTED DATA ────────────────────────────────────────────────────
  const managerName = profile?.name?.split(' ')[0] || profile?.profile?.firstName || 'Manager';
  const totalTeam = teamMembers.length;

  const todayStr = new Date().toLocaleDateString('en-CA');
  const presentToday = attendance.filter(a => a.date?.startsWith(todayStr) || new Date(a.date).toLocaleDateString('en-CA') === todayStr).length;
  const presentPercent = totalTeam ? Math.round((presentToday / totalTeam) * 100) : 0;

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
      { name: 'To Do', value: 16, color: '#22c55e' },
      { name: 'In Progress', value: 28, color: '#3b82f6' },
      { name: 'In Review', value: 18, color: '#f59e0b' },
      { name: 'Completed', value: 6, color: '#a855f7' },
      { name: 'Blocked', value: 4, color: '#ef4444' }
    ];
    totalTasksSum = donutData.reduce((acc, curr) => acc + curr.value, 0);
  }

  // ─ Kanban Data ─
  const kanbanColumns = [
    { id: 'todo', title: 'To Do', count: donutData[0].value, color: '#22c55e', bg: '#f0fdf4' },
    { id: 'inprogress', title: 'In Progress', count: donutData[1].value, color: '#3b82f6', bg: '#eff6ff' },
    { id: 'inreview', title: 'In Review', count: donutData[2].value, color: '#f59e0b', bg: '#fffbeb' },
    { id: 'completed', title: 'Completed', count: donutData[3].value, color: '#10b981', bg: '#ecfdf5' }
  ];

  const realKanbanTasks = { todo: [], inprogress: [], inreview: [], completed: [] };
  tasks.forEach(t => {
    let s = (t.status || '').toLowerCase().replace(/[^a-z]/g, '');
    let category = 'todo';
    if (s.includes('progress') || s.includes('pending')) category = 'inprogress';
    else if (s.includes('review')) category = 'inreview';
    else if (s.includes('complet') || s.includes('done')) category = 'completed';

    const assignees = Array.isArray(t.assignees) ? t.assignees : (t.assignees ? [t.assignees] : (t.assignedTo ? [t.assignedTo] : []));
    let assigneeName = 'Unassigned';
    let avatarChar = 'U';
    if (assignees.length > 0 && assignees[0]) {
      const a = assignees[0];
      assigneeName = a.name || (a.profile ? `${a.profile.firstName || ''} ${a.profile.lastName || ''}`.trim() : '') || 'User';
      avatarChar = assigneeName.charAt(0).toUpperCase();
    }
    
    realKanbanTasks[category].push({
      id: t._id || Math.random().toString(),
      title: t.title || 'Untitled Task',
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

  const teamAvailability = teamMembers.slice(0, 8).map(member => {
    const memberName = member.fullName || member.name || 'Unknown';
    const memberAtt = attendance.find(a => a.employeeId === member._id && (a.date?.startsWith(todayStr) || new Date(a.date).toLocaleDateString('en-CA') === todayStr));
    
    let status = 'Not Logged In';
    let color = '#94a3b8';
    
    if (memberAtt) {
      if (memberAtt.status === 'Present') {
        status = 'Working';
        color = '#22c55e';
      } else if (memberAtt.status === 'Absent' || memberAtt.status === 'On Leave') {
        status = 'On Leave';
        color = '#ef4444';
      } else {
        status = memberAtt.status;
        color = '#f59e0b';
      }
    }
    
    return {
      name: memberName,
      role: member.designation || member.role || 'Employee',
      status: status,
      color: color,
      hasDot: status === 'Working'
    };
  });


  if (loading) {
    return <div className="p-12 text-center text-gray-400 font-semibold text-lg">Loading Dashboard...</div>;
  }

  return (
    <div className="bg-[#F8F9FB] min-h-screen text-[#1e293b] font-['Inter',sans-serif] px-4 py-8 max-w-[1600px] mx-auto space-y-6">
      
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">
            Good Morning, {managerName}! 👋
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Here's what's happening with your team today.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm">
          <CalendarIcon size={18} className="text-gray-500" />
          <span className="font-semibold text-sm text-gray-700">{fmtDate()}</span>
        </div>
      </div>

      {/* 2. STATS CARDS ROW (6 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { icon: <Users size={18} color="#22c55e" />, bg: '#dcfce7', label: 'Team Members', value: totalTeam, sub: '↑ 2 this month', subColor: 'text-green-600', hoverBorder: 'hover:border-green-400 hover:shadow-green-500/10' },
          { icon: <UserCheck size={18} color="#3b82f6" />, bg: '#e0f2fe', label: 'Present Today', value: presentToday, sub: `${presentPercent}% of team`, subColor: 'text-gray-500', hoverBorder: 'hover:border-blue-400 hover:shadow-blue-500/10' },
          { icon: <ClipboardList size={18} color="#8b5cf6" />, bg: '#f3e8ff', label: 'Pending Tasks', value: pendingTasksCount, sub: 'Needs attention', subColor: 'text-gray-500', hoverBorder: 'hover:border-purple-400 hover:shadow-purple-500/10' },
          { icon: <TrendingUp size={18} color="#f59e0b" />, bg: '#fef3c7', label: 'Productivity', value: '87%', sub: '↑ 8% vs last week', subColor: 'text-green-600', hoverBorder: 'hover:border-amber-400 hover:shadow-amber-500/10' },
          { icon: <AlertCircle size={18} color="#ef4444" />, bg: '#fee2e2', label: 'Overdue Tasks', value: overdueTasksCount, sub: 'Requires action', subColor: 'text-red-500', hoverBorder: 'hover:border-red-400 hover:shadow-red-500/10' },
          { icon: <Briefcase size={18} color="#14b8a6" />, bg: '#ccfbf1', label: 'Active Projects', value: activeProjectsCount, sub: 'Running smoothly', subColor: 'text-gray-500', hoverBorder: 'hover:border-teal-400 hover:shadow-teal-500/10' },
        ].map((stat, i) => (
          <Card key={i} className={`flex flex-col aspect-square justify-between hover:-translate-y-1 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md ${stat.hoverBorder}`}>
            <div className="flex flex-col items-start gap-3 mb-2">
              <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                {stat.icon}
              </div>
              <p className="text-xs font-bold text-gray-600 leading-tight w-full break-words">{stat.label}</p>
            </div>
            <div className="mt-auto">
              <h3 className="text-[18px] font-extrabold text-[#0f172a] tracking-tight">{stat.value}</h3>
              <p className={`text-[11px] font-bold mt-1 ${stat.subColor}`}>{stat.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* 3. SECOND ROW (Attendance Trend & Task Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="h-60 flex flex-col">
          <SectionHeader 
            title="Team Attendance Trend" 
            action={<Dropdown value={attFilter} onChange={setAttFilter} options={[{value:'weekly', label:'This Week'}, {value:'monthly', label:'This Month'}]} />} 
          />
          <div className="flex-1 -mx-4 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_WEEKLY_TREND.map(d => ({ ...d, att: d.worked + Math.floor(Math.random()*20) }))} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="att" stroke="#22c55e" strokeWidth={3} fill="url(#colorAtt)" dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#22c55e' }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="h-60 flex flex-col">
          <SectionHeader 
            title="Task Status Overview" 
            action={<Dropdown value={taskFilter} onChange={setTaskFilter} options={[{value:'monthly', label:'This Month'}, {value:'weekly', label:'This Week'}]} />} 
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
                  >
                    {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[18px] font-extrabold text-[#0f172a]">{totalTasksSum}</span>
                <span className="text-[10px] font-semibold text-gray-500">Total Tasks</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 justify-center">
              {donutData.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <div>
                    <p className="text-xs font-bold text-[#0f172a] leading-none">{d.value}</p>
                    <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{d.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 4. THIRD ROW (Performance Overview & Goal Completion) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="h-[260px] flex flex-col">
          <SectionHeader 
            title="Team Performance Overview" 
            action={<Dropdown value={perfFilter} onChange={setPerfFilter} options={[{value:'monthly', label:'This Month'}]} />} 
          />
          <div className="flex-1 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamPerfData} margin={{ top: 10, right: 0, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="performance" radius={[6, 6, 6, 6]} barSize={24}>
                  {teamPerfData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center px-2 pt-1 border-t border-gray-100">
            <span className="text-xs font-bold text-[#0f172a]">Team Average</span>
            <span className="text-xs font-extrabold text-[#10b981]">{teamAvgPerf}%</span>
          </div>
        </Card>

        <Card className="h-[260px] flex flex-col">
          <SectionHeader 
            title="Goal Completion" 
            action={<Dropdown value={goalFilter} onChange={setGoalFilter} options={[{value:'quarterly', label:'This Quarter'}]} />} 
          />
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-between px-2 sm:px-4">
            
            {/* Circular Progress (Overall) */}
            <div className="w-[130px] h-[130px] relative mb-3 sm:mb-0 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{value: 68}, {value: 32}]} innerRadius={48} outerRadius={60} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                    <Cell fill="#00a76b" />
                    <Cell fill="#f1f5f9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-extrabold text-[#0f172a]">68%</span>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">Overall</span>
              </div>
            </div>

            {/* Horizontal Bars */}
            <div className="flex-1 w-full sm:pl-10 flex flex-col gap-6 justify-center">
              {MOCK_GOALS.map((goal, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-bold text-[#0f172a] mb-2">
                    <span>{goal.name}</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${goal.progress}%`, backgroundColor: goal.color }} />
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
            <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col h-80">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm" style={{ color: col.color }}>{col.title}</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: col.bg, color: col.color }}>
                  {col.count}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {(realKanbanTasks[col.id] || []).map(task => (
                  <div key={task.id} className="p-3 border border-gray-100 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow cursor-grab bg-white group">
                    <h4 className="text-xs font-bold text-[#1e293b] mb-3 line-clamp-2">{task.title}</h4>
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600">
                          {task.avatar}
                        </div>
                        <span className="text-[10px] font-semibold text-gray-500">{task.assignee}</span>
                      </div>
                      {task.progress !== null ? (
                        task.progress === 100 ? (
                          <div className="text-[#10b981]"><Check size={14} strokeWidth={3} /></div>
                        ) : (
                          <div className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: col.color, borderColor: col.color }}>
                            {task.progress}%
                          </div>
                        )
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <button className="mt-3 w-full py-2 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-1">
                <Plus size={14} /> Add Task
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 6. FOURTH ROW (Calendar, Availability, Active Projects) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="h-80 flex flex-col">
          <SectionHeader title="Team Calendar" />
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
              <button className="text-gray-400 hover:text-gray-700"><ChevronLeft size={18} /></button>
              <h3 className="text-sm font-bold text-[#0f172a]">July 2026</h3>
              <div className="flex items-center gap-2">
                <button className="text-[10px] font-bold border rounded px-2 py-0.5 text-gray-600 hover:bg-gray-50">Today</button>
                <button className="text-gray-400 hover:text-gray-700"><ChevronRight size={18} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center mb-2 px-2">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <span key={d} className="text-[10px] font-bold text-gray-400 uppercase">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 text-center gap-y-1 flex-1 px-2">
              {/* Very basic static mock calendar grid for visual fidelity */}
              {[...Array(35)].map((_, i) => {
                const day = i - 1; // start from 1ish
                if(day < 1 || day > 31) return <div key={i} className="p-0.5"></div>;
                const isToday = day === 29;
                return (
                  <div key={i} className="flex flex-col items-center justify-center p-0.5 relative cursor-pointer hover:bg-gray-50 rounded-lg">
                    <span className={`text-[11px] font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#00a76b] text-white shadow-sm' : 'text-gray-700'}`}>
                      {day}
                    </span>
                    {day === 15 && <div className="absolute bottom-0 w-1 h-1 rounded-full bg-blue-500" />}
                    {day === 23 && <div className="absolute bottom-0 flex gap-0.5"><div className="w-1 h-1 rounded-full bg-blue-500"/><div className="w-1 h-1 rounded-full bg-purple-500"/></div>}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-1 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"/><span className="text-[9px] font-bold text-gray-500">Meeting</span></div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"/><span className="text-[9px] font-bold text-gray-500">Deadline</span></div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"/><span className="text-[9px] font-bold text-gray-500">Leave</span></div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]"/><span className="text-[9px] font-bold text-gray-500">Event</span></div>
            </div>
          </div>
        </Card>

        {/* Availability */}
        <Card className="h-80 flex flex-col">
          <SectionHeader title="Team Availability" />
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {teamAvailability.map((member, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white shadow-sm flex items-center justify-center text-sm font-bold text-gray-500">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0f172a] group-hover:text-[#00a76b] transition-colors">{member.name}</h4>
                    <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{member.role}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 bg-transparent" style={{ color: member.color, borderColor: member.color }}>
                  {member.hasDot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.color }} />}
                  {member.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Active Projects */}
        <Card className="h-80 flex flex-col">
          <SectionHeader title="Active Projects" action="View All" />
          <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
            {MOCK_PROJECTS.map((proj, i) => (
              <div key={i} className="group">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#0f172a] group-hover:text-[#00a76b] transition-colors">{proj.name}</h4>
                    <p className="text-[10px] font-semibold text-gray-500 mt-0.5">Due: {proj.due}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#0f172a] mb-1">{proj.progress}%</p>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: proj.color }}>{proj.status}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${proj.progress}%`, backgroundColor: proj.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 7. FIFTH ROW (Workload, Productivity Trend, Top Performers) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Workload */}
        <Card className="h-80 flex flex-col">
          <SectionHeader title="Workload Distribution" />
          <div className="flex-1 flex items-center justify-between">
            <div className="w-[160px] h-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={workloadData} innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                    {workloadData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 pl-4 flex flex-col gap-3 justify-center">
              {workloadData.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[11px] font-bold text-[#0f172a]">{d.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Productivity Trend */}
        <Card className="h-80 flex flex-col">
          <SectionHeader 
            title="Team Productivity Trend" 
            action={<Dropdown value={'weekly'} onChange={()=>{}} options={[{value:'weekly', label:'This Week'}]} />} 
          />
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#22c55e]"/><span className="text-[10px] font-bold text-gray-500">Hours Worked</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#3b82f6]"/><span className="text-[10px] font-bold text-gray-500">Tasks Completed</span></div>
          </div>
          <div className="flex-1 -mx-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_WEEKLY_TREND} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="worked" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#22c55e' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Performers */}
        <Card className="h-80 flex flex-col">
          <SectionHeader 
            title="Top Performers" 
            action={<Dropdown value={'monthly'} onChange={()=>{}} options={[{value:'monthly', label:'This Month'}]} />} 
          />
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {teamPerfData.sort((a,b) => b.performance - a.performance).slice(0,3).map((member, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-3">{i+1}</span>
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0f172a]">{member.name}</h4>
                    <p className="text-[10px] font-semibold text-gray-500">{i===0?'UI/UX Designer':i===1?'Backend Developer':'QA Engineer'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-[#0f172a]">{member.performance}%</span>
                  <Star size={16} fill={i===0?'#f59e0b':i===1?'#94a3b8':'#d97706'} stroke="none" />
                </div>
              </div>
            ))}
          </div>
          <button className="mt-2 w-full py-2 text-xs font-bold text-[#00a76b] hover:bg-green-50 rounded-xl transition-colors">
            View All
          </button>
        </Card>
      </div>

      {/* 8. BOTTOM ROW (Alerts, Schedule, Quick Actions) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Alerts & Notifications */}
        <Card className="h-72 flex flex-col">
          <SectionHeader title="Alerts & Notifications" action="View All" />
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Bell size={16} className="text-red-500" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-[#0f172a]">Overdue Task</h4>
                  <span className="text-[9px] font-bold text-gray-400">2h ago</span>
                </div>
                <p className="text-[10px] font-semibold text-gray-500 mt-1 line-clamp-2">5 tasks are overdue. Please review and update.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                <CalendarIcon size={16} className="text-orange-500" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-[#0f172a]">Leave Request</h4>
                  <span className="text-[9px] font-bold text-gray-400">4h ago</span>
                </div>
                <p className="text-[10px] font-semibold text-gray-500 mt-1 line-clamp-2">Karan Mehta has requested sick leave for 29 Jul.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <ClipboardList size={16} className="text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-[#0f172a]">Project Deadline</h4>
                  <span className="text-[9px] font-bold text-gray-400">1d ago</span>
                </div>
                <p className="text-[10px] font-semibold text-gray-500 mt-1 line-clamp-2">HRMS Redesign deadline is approaching in 7 days.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Upcoming Schedule */}
        <Card className="h-72 flex flex-col">
          <SectionHeader title="Upcoming Schedule" />
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {upcomingEvents.length > 0 ? upcomingEvents.map((item, i) => (
              <div key={item.id || i} className="flex gap-4 items-start">
                <span className="text-[11px] font-bold text-[#0f172a] w-16 shrink-0">{item.time}</span>
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex-1 border-b border-gray-100 pb-4">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-[#0f172a] truncate pr-2">{item.title}</h4>
                    <span className="text-[9px] font-bold text-white px-2 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: item.color }}>{item.tag}</span>
                  </div>
                  <p className="text-[10px] font-semibold text-gray-500 mt-1 line-clamp-1">{item.desc}</p>
                </div>
              </div>
            )) : (
              <div className="text-center text-xs text-gray-400 py-4">No upcoming events found.</div>
            )}
          </div>
          <button className="mt-2 w-full py-2 text-xs font-bold text-[#00a76b] hover:bg-green-50 rounded-xl transition-colors">
            View Full Schedule
          </button>
        </Card>

        {/* Quick Actions */}
        <Card className="h-72 flex flex-col bg-transparent border-none shadow-none p-0">
          <SectionHeader title="Quick Actions" />
          <div className="flex-1 grid grid-cols-3 gap-3">
            {[
              { icon: <ClipboardList size={20}/>, label: 'Assign Task', color: '#22c55e', bg: '#f0fdf4', path: '/manager/task-management/create' },
              { icon: <Briefcase size={20}/>, label: 'Create Project', color: '#3b82f6', bg: '#eff6ff', path: '/manager/dashboard' },
              { icon: <UserCheck size={20}/>, label: 'Approve Leave', color: '#f59e0b', bg: '#fffbeb', path: '/manager/dashboard' },
              { icon: <TrendingUp size={20}/>, label: 'Team Report', color: '#a855f7', bg: '#f3e8ff', path: '/manager/dashboard' },
              { icon: <CalendarIcon size={20}/>, label: 'Schedule Meeting', color: '#ef4444', bg: '#fee2e2', path: '/manager/events' },
              { icon: <Star size={20}/>, label: 'Performance Review', color: '#14b8a6', bg: '#ccfbf1', path: '/manager/dashboard' },
            ].map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all h-full" onClick={() => navigate(action.path)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: action.bg, color: action.color }}>
                  {action.icon}
                </div>
                <span className="text-[10px] font-bold text-gray-700 text-center leading-tight px-1">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
};

export default ManagerDashboard;
