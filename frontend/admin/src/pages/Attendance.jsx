import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Clock, Calendar, Users, CheckCircle, XCircle, AlertTriangle,
  Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight,
  LogIn, LogOut, Timer, TrendingUp, ArrowUpRight, ArrowDownRight,
  Sun, Moon, Coffee, MoreVertical
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

// Card component
const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-[#0a1f1a] border border-[#e2eae7] dark:border-[#133029] rounded-[20px] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.02)] transition-all ${className}`}>
    {children}
  </div>
);

// ────────────────────────────── SAMPLE DATA ──────────────────────────────
const SAMPLE_RECORDS = (() => {
  const names = [
    { name: 'Sara Lopez', role: 'Designer', dept: 'Design' },
    { name: 'Marcus Lee', role: 'Developer', dept: 'Engineering' },
    { name: 'Priya Sharma', role: 'HR Lead', dept: 'HR' },
    { name: 'Jonas Becker', role: 'Backend Dev', dept: 'Engineering' },
    { name: 'Mei Chen', role: 'QA Engineer', dept: 'Quality' },
    { name: 'Alex Rivera', role: 'PM', dept: 'Product' },
    { name: 'Emma Wilson', role: 'DevOps', dept: 'Engineering' },
    { name: 'David Kim', role: 'Data Analyst', dept: 'Analytics' },
    { name: 'Fatima Al-Hassan', role: 'Marketing', dept: 'Marketing' },
    { name: 'Liam Murphy', role: 'Sales Lead', dept: 'Sales' },
    { name: 'Nina Petrov', role: 'Frontend Dev', dept: 'Engineering' },
    { name: 'Carlos Garcia', role: 'Support', dept: 'Operations' },
    { name: 'Aisha Johnson', role: 'Finance', dept: 'Finance' },
    { name: 'Ravi Patel', role: 'Mobile Dev', dept: 'Engineering' },
    { name: 'Sophie Turner', role: 'Content Writer', dept: 'Marketing' },
  ];
  const statuses = ['Present', 'Present', 'Present', 'Present', 'Present', 'Late', 'Late', 'Half Day', 'Absent', 'Leave'];
  const records = [];
  const today = new Date();
  for (let d = 0; d < 30; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    if (date.getDay() === 0) continue; // Skip Sundays
    const dateStr = date.toISOString().split('T')[0];
    names.forEach((emp, idx) => {
      const status = statuses[(idx + d) % statuses.length];
      const clockInH = 8 + Math.floor(Math.random() * 2);
      const clockInM = Math.floor(Math.random() * 45);
      const clockOutH = 17 + Math.floor(Math.random() * 2);
      const clockOutM = Math.floor(Math.random() * 50);
      records.push({
        _id: `sample-${d}-${idx}`,
        user: { _id: `user-${idx}`, name: emp.name, role: emp.role, email: `${emp.name.split(' ')[0].toLowerCase()}@company.com` },
        date: dateStr,
        clockIn: `${String(clockInH).padStart(2, '0')}:${String(clockInM).padStart(2, '0')}`,
        clockOut: status === 'Half Day' ? `${String(12 + Math.floor(Math.random() * 2)).padStart(2, '0')}:${String(clockOutM).padStart(2, '0')}` :
          status === 'Absent' || status === 'Leave' ? null :
            `${String(clockOutH).padStart(2, '0')}:${String(clockOutM).padStart(2, '0')}`,
        status,
        department: emp.dept
      });
    });
  }
  return records;
})();


const MONTHLY_TREND = [
  { month: 'Jan', rate: 94 }, { month: 'Feb', rate: 92 }, { month: 'Mar', rate: 95 },
  { month: 'Apr', rate: 93 }, { month: 'May', rate: 96 }, { month: 'Jun', rate: 94 },
  { month: 'Jul', rate: 97 },
];

const STATUS_COLORS = {
  Present: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', dot: '#10b981' },
  Late: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', dot: '#f59e0b' },
  Absent: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800', dot: '#ef4444' },
  'Half Day': { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', dot: '#3b82f6' },
  Leave: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', dot: '#8b5cf6' },
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

// ────────────────────────────── HELPERS ──────────────────────────────
const getWorkingHours = (clockIn, clockOut) => {
  if (!clockIn || !clockOut) return '--';
  const [inH, inM] = clockIn.split(':').map(Number);
  const [outH, outM] = clockOut.split(':').map(Number);
  const diff = (outH * 60 + outM) - (inH * 60 + inM);
  if (diff <= 0) return '--';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m}m`;
};

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

// ────────────────────────────── TOOLTIP ──────────────────────────────
const ChartTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`border p-3 rounded-xl shadow-lg min-w-[140px] text-xs ${isDark ? 'bg-[#0a1f1a] border-[#133029] text-white' : 'bg-white border-gray-100 text-gray-800'
      }`}>
      <p className="font-bold mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
              <span className={isDark ? 'text-slate-400 font-semibold' : 'text-gray-500 font-semibold'}>{item.name}:</span>
            </div>
            <span className="font-extrabold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ────────────────────────────── MAIN COMPONENT ──────────────────────────────
const getLocalYYYYMMDD = (d) => {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [weeklyChartData, setWeeklyChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [yearlyStats, setYearlyStats] = useState(null);
  const [statsPeriod, setStatsPeriod] = useState('week'); // 'week' | 'month' | 'year'
  const [periodStats, setPeriodStats] = useState(null);
  const location = useLocation();
  const userRole = sessionStorage.getItem('role') || 'employee';
  const isEmployeeRoute = location.pathname.includes('/employee');
  const [viewContext, setViewContext] = useState(isEmployeeRoute || userRole === 'employee' ? 'employee' : 'team');
  const [hoveredWeeklySlice, setHoveredWeeklySlice] = useState(null);
  const [hoveredStatusSlice, setHoveredStatusSlice] = useState(null);

  useEffect(() => {
    if (isEmployeeRoute) {
      setViewContext('employee');
    }
  }, [isEmployeeRoute]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState('daily'); // daily | weekly | monthly
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Calendar
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Theme observer
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const fetchEmployeeStats = useCallback(async (period = statsPeriod) => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await axios.get(`/api/attendance/me/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPeriodStats(res.data);
      setYearlyStats(res.data);
    } catch(e) {
      console.error('Error fetching period stats:', e);
    }
  }, [statsPeriod]);

  useEffect(() => {
    if (viewContext === 'employee') {
      fetchEmployeeStats(statsPeriod);
    }
  }, [viewContext, statsPeriod, fetchEmployeeStats]);

  // Fetch data
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = sessionStorage.getItem('token');
    try {
      const res = await axios.get(
        viewContext === 'employee' ? '/api/attendance?scope=personal' : '/api/attendance', 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const summaryRes = await axios.get(
        viewContext === 'employee' ? '/api/attendance/summary/weekly?scope=personal' : '/api/attendance/summary/weekly', 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setWeeklyChartData(summaryRes.data.this_week || []);
      
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (data.length > 0) {
        setRecords(data);
      } else {
        setRecords(SAMPLE_RECORDS);
      }

      if (viewContext === 'employee') {
        fetchEmployeeStats(statsPeriod);
      }
    } catch (err) {
      console.warn('Using sample data:', err.message);
      setRecords(SAMPLE_RECORDS);
    } finally {
      setLoading(false);
    }
  }, [viewContext, statsPeriod, fetchEmployeeStats]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // ── Summary Cards ──
  const todayStr = getLocalYYYYMMDD(new Date());
  
  const todayRecords = useMemo(() => records.filter(r => r.date === todayStr), [records, todayStr]);
  const todaySummaryFromBackend = useMemo(() => weeklyChartData.find(d => d.date === todayStr), [weeklyChartData, todayStr]);

  const summaryStats = useMemo(() => {
    const present = todayRecords.filter(r => r.status === 'Present').length;
    const late = todayRecords.filter(r => r.status === 'Late').length;
    const halfDay = todayRecords.filter(r => r.status === 'Half Day').length;
    
    const absent = todaySummaryFromBackend ? todaySummaryFromBackend.Absent : 0;
    const leave = todaySummaryFromBackend ? todaySummaryFromBackend.Leave : 0;
    
    const total = present + late + halfDay + absent + leave || 1;
    const pct = Math.round(((present + late + halfDay) / total) * 100);
    return { present, late, absent, halfDay, leave, total, pct };
  }, [todayRecords, todaySummaryFromBackend]);

  // ── Filtered & Sorted ──
  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    const today = new Date();

    if (viewMode === 'daily') {
      const tStr = getLocalYYYYMMDD(today);
      filtered = filtered.filter(r => r.date === tStr);
    } else if (viewMode === 'weekly') {
      const day = today.getDay() || 7; 
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - day + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const startStr = getLocalYYYYMMDD(startOfWeek);
      const endStr = getLocalYYYYMMDD(endOfWeek);
      filtered = filtered.filter(r => r.date >= startStr && r.date <= endStr);
    } else if (viewMode === 'monthly') {
      const monthPrefix = getLocalYYYYMMDD(today).slice(0, 7); // YYYY-MM
      filtered = filtered.filter(r => (r.date || '').startsWith(monthPrefix));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        (r.user?.name || '').toLowerCase().includes(q) ||
        (r.user?.email || '').toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q) ||
        (r.date || '').includes(q)
      );
    }
    if (statusFilter !== 'All') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    if (dateFilter) {
      filtered = filtered.filter(r => r.date === dateFilter);
    }
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = (a.date || '').localeCompare(b.date || '');
      else if (sortField === 'name') cmp = (a.user?.name || '').localeCompare(b.user?.name || '');
      else if (sortField === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      else if (sortField === 'clockIn') cmp = (a.clockIn || '').localeCompare(b.clockIn || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return filtered;
  }, [records, searchQuery, statusFilter, dateFilter, sortField, sortDir, viewMode]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, dateFilter, viewMode]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ── Calendar Data ──
  const calendarData = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayRecords = records.filter(r => r.date === dateStr);
      const presentCount = dayRecords.filter(r => ['Present', 'Late', 'Half Day'].includes(r.status)).length;
      const absentCount = dayRecords.filter(r => r.status === 'Absent').length;
      const leaveCount = dayRecords.filter(r => r.status === 'Leave').length;
      days.push({ day: d, dateStr, present: presentCount, absent: absentCount, leave: leaveCount, total: dayRecords.length });
    }
    return days;
  }, [calendarMonth, records]);

  // ── Pie Data ──
  const pieData = useMemo(() => {
    const activeStats = periodStats || yearlyStats;
    if (viewContext === 'employee' && activeStats) {
      return [
        { name: 'Present', value: activeStats.present || 0, fill: '#10b981' },
        { name: 'Late', value: activeStats.late || 0, fill: '#f59e0b' },
        { name: 'Absent', value: activeStats.absent || 0, fill: '#ef4444' },
        { name: 'Half Day', value: activeStats.halfDay || 0, fill: '#3b82f6' },
        { name: 'Leave', value: activeStats.leave || 0, fill: '#8b5cf6' },
      ].filter(d => d.value > 0);
    }
    return [
      { name: 'Present', value: summaryStats.present, fill: '#10b981' },
      { name: 'Late', value: summaryStats.late, fill: '#f59e0b' },
      { name: 'Absent', value: summaryStats.absent, fill: '#ef4444' },
      { name: 'Half Day', value: summaryStats.halfDay, fill: '#3b82f6' },
      { name: 'Leave', value: summaryStats.leave, fill: '#8b5cf6' },
    ].filter(d => d.value > 0);
  }, [summaryStats, periodStats, yearlyStats, viewContext]);

  // Export CSV
  const exportCSV = () => {
    const headers = ['Date', 'Employee', 'Status', 'Clock In', 'Clock Out', 'Working Hours'];
    
    const formatTimeHelper = (timeStr, dateVal) => {
      if (timeStr) return timeStr;
      if (dateVal) {
        try { return new Date(dateVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); } 
        catch (e) { return '--'; }
      }
      return '--';
    };

    const rows = filteredRecords.map(r => [
      r.date || '',
      r.user?.name || 'N/A',
      r.status || 'N/A',
      formatTimeHelper(r.clockInTime, r.checkInTime),
      formatTimeHelper(r.clockOutTime, r.checkOutTime),
      r.totalHours ? `${r.totalHours} hrs` : '--'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_${viewMode}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const periodLabel = statsPeriod === 'week' ? 'Week' : statsPeriod === 'month' ? 'Month' : 'Year';
  const activeStats = periodStats || yearlyStats;

  // ────────────────────────────── RENDER ──────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-extrabold text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Attendance
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {todayStr}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-[#829e92] mt-1">
            {viewContext === 'employee' ? 'Track your daily attendance, working hours and weekly breakdown' : 'Monitor and manage organization-wide employee attendance and shifts'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {userRole !== 'employee' && (
            <div className="flex items-center bg-slate-100 dark:bg-[#133029] p-1 rounded-xl mr-2">
              <button
                onClick={() => setViewContext('employee')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewContext === 'employee' ? 'bg-white dark:bg-[#0a1f1a] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Employee
              </button>
              <button
                onClick={() => setViewContext('team')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewContext === 'team' ? 'bg-white dark:bg-[#0a1f1a] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                My Team
              </button>
            </div>
          )}
          <button
            onClick={fetchAttendance}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#0a1f1a] border border-[#e2eae7] dark:border-[#133029] text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all shadow-sm"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 ${viewContext === 'employee' ? 'lg:grid-cols-5' : 'lg:grid-cols-6'}`}>
        {(viewContext === 'employee' ? [
          { label: `Present (${periodLabel})`, value: activeStats?.present || 0, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bgIcon: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: `Late (${periodLabel})`, value: activeStats?.late || 0, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgIcon: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: `Absent (${periodLabel})`, value: activeStats?.absent || 0, icon: XCircle, color: 'text-red-600 dark:text-red-400', bgIcon: 'bg-red-50 dark:bg-red-950/30' },
          { label: `Half Day (${periodLabel})`, value: activeStats?.halfDay || 0, icon: Sun, color: 'text-blue-600 dark:text-blue-400', bgIcon: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: `Leave (${periodLabel})`, value: activeStats?.leave || 0, icon: Calendar, color: 'text-purple-600 dark:text-purple-400', bgIcon: 'bg-purple-50 dark:bg-purple-950/30' },
        ] : [
          { label: 'Total Today', value: summaryStats.total, icon: Users, color: 'text-slate-700 dark:text-white', bgIcon: 'bg-slate-100 dark:bg-slate-800/40' },
          { label: 'Present', value: summaryStats.present, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bgIcon: 'bg-emerald-50 dark:bg-emerald-950/30', trend: '+3%' },
          { label: 'Late', value: summaryStats.late, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgIcon: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Absent', value: summaryStats.absent, icon: XCircle, color: 'text-red-600 dark:text-red-400', bgIcon: 'bg-red-50 dark:bg-red-950/30' },
          { label: 'Half Day', value: summaryStats.halfDay, icon: Sun, color: 'text-blue-600 dark:text-blue-400', bgIcon: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'On Leave', value: summaryStats.leave, icon: Calendar, color: 'text-purple-600 dark:text-purple-400', bgIcon: 'bg-purple-50 dark:bg-purple-950/30' },
        ]).map((card, i) => (
          <Card key={i} className="flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.bgIcon}`}>
                <card.icon size={17} className={card.color} />
              </div>
              {viewContext === 'employee' ? (
                <select
                  value={statsPeriod}
                  onChange={(e) => setStatsPeriod(e.target.value)}
                  className="text-[11px] font-bold px-2 py-0.5 rounded-lg border border-slate-200 dark:border-[#133029] bg-slate-50 dark:bg-[#0a1f1a] text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  title="Select period"
                >
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              ) : (
                card.trend && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                    <ArrowUpRight size={10} /> {card.trend}
                  </span>
                )
              )}
            </div>
            <h3 className={`text-[18px] font-extrabold ${card.color} leading-none mb-1`}>{card.value}</h3>
            <p className="text-[11px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">{card.label}</p>
          </Card>
        ))}
      </div>

      {/* ── ATTENDANCE RATE BANNER (Hidden for employee since it's company-wide) ── */}
      {viewContext !== 'employee' && (
        <Card className="!p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-[#829e92]">Today's Attendance Rate</p>
              <h2 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight">{summaryStats.pct}%</h2>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{summaryStats.present + summaryStats.late + summaryStats.halfDay}</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">Working</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-[#133029]" />
            <div className="text-center">
              <p className="text-lg font-extrabold text-red-500 dark:text-red-400">{summaryStats.absent}</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">Absent</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-[#133029]" />
            <div className="text-center">
              <p className="text-lg font-extrabold text-purple-500 dark:text-purple-400">{summaryStats.leave}</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">Leave</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── CHARTS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Attendance Chart */}
        <Card className="col-span-12 lg:col-span-7 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight">Weekly Attendance</h3>
              <p className="text-xs text-slate-400 dark:text-[#829e92] mt-0.5">
                {viewContext === 'employee' ? "This week's attendance breakdown" : 'Weekly team attendance overview'}
              </p>
            </div>
            {viewContext === 'employee' && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                This Week
              </span>
            )}
          </div>

          {viewContext === 'employee' ? (
            (() => {
              const totals = { Present: 0, Late: 0, Absent: 0, 'Half Day': 0, Leave: 0 };
              (weeklyChartData || []).forEach(d => {
                totals.Present += Number(d.Present) || 0;
                totals.Late += Number(d.Late) || 0;
                totals.Absent += Number(d.Absent) || 0;
                totals['Half Day'] += Number(d['Half Day'] || d.HalfDay || d.halfDay) || 0;
                totals.Leave += Number(d.Leave) || 0;
              });

              const weeklyPie = [
                { name: 'Present', value: totals.Present, color: '#10b981' },
                { name: 'Late', value: totals.Late, color: '#f59e0b' },
                { name: 'Half Day', value: totals['Half Day'], color: '#3b82f6' },
                { name: 'Leave', value: totals.Leave, color: '#8b5cf6' },
                { name: 'Absent', value: totals.Absent, color: '#ef4444' },
              ];

              const total = totals.Present + totals.Late + totals.Absent + totals['Half Day'] + totals.Leave;
              const workingDays = totals.Present + totals.Late + totals['Half Day'];
              const rate = total > 0 ? Math.round((workingDays / total) * 100) : 0;
              const activePie = weeklyPie.filter(d => d.value > 0);
              const displayPie = activePie.length > 0 ? activePie : [{ name: 'No Data', value: 1, color: isDark ? '#133029' : '#e2eae7' }];

              return (
                <div className="flex flex-col sm:flex-row items-center gap-6 justify-between flex-1 select-none min-h-[220px]">
                  {/* Donut Chart */}
                  <div className="relative shrink-0 w-[180px] h-[180px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayPie}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={80}
                          paddingAngle={activePie.length > 1 ? 3 : 0}
                          dataKey="value"
                          stroke="none"
                          isAnimationActive={true}
                          animationDuration={800}
                          onMouseLeave={() => setHoveredWeeklySlice(null)}
                        >
                          {displayPie.map((entry, idx) => (
                            <Cell
                              key={idx}
                              fill={entry.color}
                              className="transition-all cursor-pointer hover:opacity-85"
                              onMouseEnter={() => entry.name !== 'No Data' && setHoveredWeeklySlice(entry)}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Dynamic Centre Label - No overlapping tooltip */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
                      {hoveredWeeklySlice ? (
                        <>
                          <span className="text-3xl font-black tabular-nums leading-none" style={{ color: hoveredWeeklySlice.color }}>
                            {hoveredWeeklySlice.value}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider mt-1" style={{ color: hoveredWeeklySlice.color }}>
                            {hoveredWeeklySlice.name} ({total > 0 ? Math.round((hoveredWeeklySlice.value / total) * 100) : 0}%)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{rate}%</span>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-widest mt-1">Weekly Rate</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Legend breakdown */}
                  <div className="flex-1 w-full space-y-2.5">
                    {weeklyPie.map((d, idx) => {
                      const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                      const isHovered = hoveredWeeklySlice?.name === d.name;
                      return (
                        <div
                          key={idx}
                          className={`space-y-1 p-1 rounded-lg transition-all cursor-pointer ${isHovered ? 'bg-slate-50 dark:bg-[#133029]/60 scale-[1.02]' : ''}`}
                          onMouseEnter={() => setHoveredWeeklySlice(d)}
                          onMouseLeave={() => setHoveredWeeklySlice(null)}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                              <span className={`transition-colors ${isHovered ? 'font-black text-slate-900 dark:text-white' : 'text-slate-600 dark:text-[#a3b3af]'}`}>
                                {d.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">({pct}%)</span>
                              <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{d.value}</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-[#133029] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: d.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-slate-100 dark:border-[#133029] flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-[#829e92]">
                      <span>Total this week (Mon - Sun):</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{total} days</span>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="w-full h-[280px] select-none">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={isDark ? 'd' : 'l'} data={weeklyChartData} margin={{ top: 15, right: 15, left: -25, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#143029' : '#eceae7'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#829e92' : '#9CA3AF', fontSize: 11, fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#829e92' : '#9CA3AF', fontSize: 11, fontWeight: 500 }} dx={-5} />
                  <Tooltip content={<ChartTooltip isDark={isDark} />} cursor={false} />
                  <Legend verticalAlign="top" align="right" iconSize={8} iconType="circle"
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '15px' }}
                    formatter={(v) => <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{v}</span>} />
                  <Bar dataKey="Present" fill="#10b981" radius={[3, 3, 0, 0]} barSize={10} />
                  <Bar dataKey="Late" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={10} />
                  <Bar dataKey="Absent" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={10} />
                  <Bar dataKey="Leave" fill="#8b5cf6" radius={[3, 3, 0, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Right Column: Pie + Monthly Trend */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          {/* Status Breakdown Pie */}
          <Card>
            <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">
              {viewContext === 'employee' ? `${statsPeriod === 'week' ? 'Weekly' : statsPeriod === 'month' ? 'Monthly' : 'Yearly'} Breakdown` : "Today's Breakdown"}
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-[130px] h-[130px] shrink-0 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData.length ? pieData : [{ name: 'No Data', value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                      onMouseLeave={() => setHoveredStatusSlice(null)}
                    >
                      {(pieData.length ? pieData : [{ name: 'No Data', value: 1 }]).map((item, idx) => (
                        <Cell
                          key={idx}
                          fill={pieData.length ? item.fill : (isDark ? '#133029' : '#e2e8f0')}
                          className="transition-all cursor-pointer hover:opacity-85"
                          onMouseEnter={() => item.name !== 'No Data' && setHoveredStatusSlice(item)}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center pointer-events-none transition-all duration-200">
                  {hoveredStatusSlice ? (
                    <>
                      <span className="block text-base font-black tabular-nums leading-none" style={{ color: hoveredStatusSlice.fill }}>
                        {hoveredStatusSlice.value}
                      </span>
                      <span className="text-[7px] uppercase font-bold tracking-wider mt-0.5" style={{ color: hoveredStatusSlice.fill }}>
                        {hoveredStatusSlice.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block text-lg font-black text-slate-800 dark:text-white leading-none">
                        {viewContext === 'employee' ? (
                          yearlyStats ? Math.round(((yearlyStats.present + yearlyStats.late + yearlyStats.halfDay) / ((yearlyStats.present + yearlyStats.late + yearlyStats.halfDay + yearlyStats.absent + yearlyStats.leave) || 1)) * 100) : 0
                        ) : summaryStats.pct}%
                      </span>
                      <span className="text-[8px] uppercase font-bold tracking-widest text-slate-400 dark:text-[#829e92]">Rate</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {Object.entries(STATUS_COLORS).map(([status, colors]) => {
                  let count = 0;
                  if (viewContext === 'employee' && yearlyStats) {
                    if (status === 'Present') count = yearlyStats.present || 0;
                    if (status === 'Late') count = yearlyStats.late || 0;
                    if (status === 'Absent') count = yearlyStats.absent || 0;
                    if (status === 'Half Day') count = yearlyStats.halfDay || 0;
                    if (status === 'Leave') count = yearlyStats.leave || 0;
                  } else {
                    if (status === 'Present') count = summaryStats.present;
                    if (status === 'Late') count = summaryStats.late;
                    if (status === 'Absent') count = summaryStats.absent;
                    if (status === 'Half Day') count = summaryStats.halfDay;
                    if (status === 'Leave') count = summaryStats.leave;
                  }

                  const isHovered = hoveredStatusSlice?.name === status;

                  return (
                    <div
                      key={status}
                      className={`flex items-center justify-between text-xs font-semibold px-1 py-0.5 rounded transition-all cursor-pointer ${isHovered ? 'bg-slate-50 dark:bg-[#133029]/60' : ''}`}
                      onMouseEnter={() => setHoveredStatusSlice({ name: status, value: count, fill: colors.dot })}
                      onMouseLeave={() => setHoveredStatusSlice(null)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
                        <span className={isHovered ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-[#a3b3af]'}>{status}</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">Monthly Trend</h3>
            <div className="w-full h-[120px] select-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart key={isDark ? 'd' : 'l'} data={MONTHLY_TREND} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={isDark ? 0.3 : 0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#143029' : '#eceae7'} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#829e92' : '#9CA3AF', fontSize: 10, fontWeight: 500 }} dy={4} />
                  <YAxis domain={[85, 100]} axisLine={false} tickLine={false} tick={{ fill: isDark ? '#829e92' : '#9CA3AF', fontSize: 10, fontWeight: 500 }} dx={-3} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#0a1f1a' : '#fff', borderColor: isDark ? '#133029' : '#eceae7', borderRadius: '8px', fontSize: '11px' }}
                    itemStyle={{ color: isDark ? '#fff' : '#000' }} />
                  <Area type="monotone" dataKey="rate" name="Attendance %" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#trendGrad)"
                    dot={false} activeDot={{ r: 4, fill: '#10b981', stroke: isDark ? '#0a1f1a' : '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ── MONTHLY CALENDAR ── */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight">
            Attendance Calendar — {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] transition-colors">
              <ChevronLeft size={16} className="text-slate-500 dark:text-[#829e92]" />
            </button>
            <button onClick={() => setCalendarMonth(new Date())}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
              Today
            </button>
            <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] transition-colors">
              <ChevronRight size={16} className="text-slate-500 dark:text-[#829e92]" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider py-2">{d}</div>
          ))}
          {calendarData.map((day, idx) => (
            <div key={idx} className={`min-h-[60px] rounded-xl p-1.5 text-center transition-all ${day ? 'hover:bg-slate-50 dark:hover:bg-[#0d2a22] cursor-pointer' : ''
              } ${day?.dateStr === todayStr ? 'bg-emerald-50/60 dark:bg-emerald-950/20 ring-1 ring-emerald-300 dark:ring-emerald-800' : ''}`}>
              {day && (
                <>
                  <span className={`text-xs font-bold ${day.dateStr === todayStr ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {day.day}
                  </span>
                  {day.total > 0 && (
                    <div className="mt-1 flex items-center justify-center gap-0.5 flex-wrap">
                      {day.present > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`${day.present} present`} />}
                      {day.absent > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title={`${day.absent} absent`} />}
                      {day.leave > 0 && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title={`${day.leave} leave`} />}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── ATTENDANCE HISTORY TABLE ── */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight">
            Attendance History
            <span className="ml-2 text-xs font-bold text-slate-400 dark:text-[#829e92]">({filteredRecords.length} records)</span>
          </h3>
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#133029] rounded-xl p-1">
            {['daily', 'weekly', 'monthly'].map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${viewMode === mode ? 'bg-white dark:bg-[#0a1f1a] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-[#829e92] hover:text-slate-700 dark:hover:text-white'
                  }`}>
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#829e92]" />
            <input
              type="text"
              placeholder="Search employees, dates, departments..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-[#829e92] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm font-semibold rounded-xl bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          >
            <option value="All">All Status</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
          {(searchQuery || statusFilter !== 'All' || dateFilter) && (
            <button onClick={() => { setSearchQuery(''); setStatusFilter('All'); setDateFilter(''); }}
              className="px-3 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all">
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-[#e2eae7] dark:border-[#133029]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-[#0d2a22]">
                {[
                  { key: 'name', label: 'Employee' },
                  { key: 'date', label: 'Date' },
                  { key: 'status', label: 'Status' },
                  { key: 'clockIn', label: 'Check In' },
                  { key: 'clockOut', label: 'Check Out' },
                  { key: 'hours', label: 'Working Hours' },
                ].map(col => (
                  <th key={col.key}
                    onClick={() => col.key !== 'hours' && col.key !== 'clockOut' && handleSort(col.key)}
                    className={`px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider ${col.key !== 'hours' && col.key !== 'clockOut' ? 'cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 select-none' : ''
                      }`}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortField === col.key && (
                        <span className="text-emerald-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2eae7] dark:divide-[#133029]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Calendar size={36} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No attendance records found</p>
                      <p className="text-xs text-slate-400 dark:text-slate-600">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.map((record, i) => {
                const sc = STATUS_COLORS[record.status] || STATUS_COLORS['Present'];
                return (
                  <tr key={record._id || i} className="hover:bg-slate-50/50 dark:hover:bg-[#0d2a22]/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-[#133029] text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {getInitials(record.user?.name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{record.user?.name || 'Unknown'}</p>
                          <p className="text-[11px] text-slate-400 dark:text-[#829e92]">{record.department || record.user?.role || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{record.date}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <LogIn size={13} className="text-emerald-500" />
                        {(() => {
                          if (record.clockIn) return record.clockIn;
                          if (record.clock_in) return record.clock_in;
                          if (record.checkInTime) {
                            try { return new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); }
                            catch (e) { return '--'; }
                          }
                          return '--';
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <LogOut size={13} className="text-red-400" />
                        {(() => {
                          if (record.clockOut) return record.clockOut;
                          if (record.clock_out) return record.clock_out;
                          if (record.checkOutTime) {
                            try { return new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); }
                            catch (e) { return '--'; }
                          }
                          return '--';
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        {(() => {
                          const cIn = record.clockIn || record.clock_in || (record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null);
                          const cOut = record.clockOut || record.clock_out || (record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null);
                          return getWorkingHours(cIn, cOut);
                        })()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <p className="text-xs font-semibold text-slate-400 dark:text-[#829e92]">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={15} className="text-slate-500 dark:text-[#829e92]" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page;
                if (totalPages <= 5) page = i + 1;
                else if (currentPage <= 3) page = i + 1;
                else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                else page = currentPage - 2 + i;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${currentPage === page
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-[#829e92] hover:bg-slate-100 dark:hover:bg-[#133029]'
                      }`}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronRight size={15} className="text-slate-500 dark:text-[#829e92]" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Attendance;
