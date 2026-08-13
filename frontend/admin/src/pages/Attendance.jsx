import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Clock, Calendar, Users, CheckCircle, XCircle, AlertTriangle,
  Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight, ChevronDown,
  LogIn, LogOut, Timer, TrendingUp, ArrowUpRight, ArrowDownRight,
  Sun, Moon, Coffee, MoreVertical
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import SmartTimeTracker from './SmartTimeTracker';

// ─── ATTRACTIVE CUSTOM DATE PICKER ─────────────────────────
const AttendanceDatePicker = ({ value, onChange, placeholder = 'dd-mm-yyyy' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const parsedDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return null;
  }, [value]);

  const [viewDate, setViewDate] = useState(() => parsedDate || new Date());

  useEffect(() => {
    if (parsedDate) setViewDate(parsedDate);
  }, [parsedDate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const pad = (n) => String(n).padStart(2, '0');

  const formattedDisplay = useMemo(() => {
    if (!parsedDate) return '';
    return parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }, [parsedDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday start (0=Mo, 6=Su)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleDateSelect = (day) => {
    const dStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    onChange(dStr);
    setIsOpen(false);
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSetToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const dStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    onChange(dStr);
    setViewDate(today);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const todayStr = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button - Clickable anywhere on the button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] text-slate-700 dark:text-white hover:border-emerald-500/50 hover:bg-slate-100/80 dark:hover:bg-[#133029] transition-all cursor-pointer shadow-xs select-none group"
      >
        <span className={formattedDisplay ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-400 dark:text-[#829e92]'}>
          {formattedDisplay || placeholder}
        </span>
        <Calendar size={13} className="text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
      </button>

      {/* Modern Popover Calendar UI */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Header Controls */}
          <div className="flex items-center justify-between gap-1 mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={month}
                onChange={(e) => setViewDate(new Date(year, parseInt(e.target.value, 10), 1))}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400 transition-colors py-0.5"
              >
                {monthNames.map((mName, i) => (
                  <option key={mName} value={i} className="bg-white dark:bg-[#0d2a22] text-slate-800 dark:text-white">
                    {mName}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setViewDate(new Date(parseInt(e.target.value, 10), month, 1))}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400 transition-colors py-0.5"
              >
                {Array.from({ length: 20 }, (_, idx) => new Date().getFullYear() - 10 + idx).map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-[#0d2a22] text-slate-800 dark:text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((dayName, idx) => (
              <span
                key={dayName}
                className={`text-[10px] font-bold uppercase tracking-wider ${idx === 6 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-[#829e92]'
                  }`}
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 w-8" />
            ))}

            {Array.from({ length: totalDays }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleDateSelect(day)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${isSelected
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30 font-bold scale-105'
                      : isToday
                        ? 'border border-emerald-500/60 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-[#133029]'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#133029]'
                    }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#e2eae7] dark:border-[#133029] text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 text-[111px] font-bold text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSetToday}
              className="px-3 py-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ATTRACTIVE CUSTOM STATUS DROPDOWN ─────────────────────────
const StatusFilterDropdown = ({ value, onChange, statusColors }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeStatusColor = value !== 'All' ? statusColors[value] : null;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] text-slate-700 dark:text-white hover:border-emerald-500/50 hover:bg-slate-100/80 dark:hover:bg-[#133029] transition-all cursor-pointer shadow-xs select-none min-w-[130px] justify-between group"
      >
        <div className="flex items-center gap-2">
          {activeStatusColor ? (
            <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: activeStatusColor.dot }} />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shadow-sm" />
          )}
          <span>{value === 'All' ? 'All Status' : value}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full min-w-[140px] bg-white dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150 py-1.5 select-none overflow-hidden">
          <div
            onClick={() => { onChange('All'); setIsOpen(false); }}
            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${value === 'All' ? 'bg-slate-100 dark:bg-[#133029]' : 'hover:bg-slate-50 dark:hover:bg-[#133029]/50'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shadow-sm" />
            <span className={`text-[13px] ${value === 'All' ? 'font-bold text-slate-800 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'}`}>
              All Status
            </span>
          </div>

          {Object.entries(statusColors).map(([status, colors]) => {
            const isSelected = value === status;
            return (
              <div
                key={status}
                onClick={() => { onChange(status); setIsOpen(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-slate-100 dark:bg-[#133029]' : 'hover:bg-slate-50 dark:hover:bg-[#133029]/50'
                  }`}
              >
                <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: colors.dot }} />
                <span className={`text-[13px] ${isSelected ? 'font-bold text-slate-800 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'}`}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
const getWorkingHours = (clockIn, clockOut, totalHours) => {
  if (totalHours && typeof totalHours === 'number' && !isNaN(totalHours) && totalHours > 0) {
    let totalMins = Math.round(totalHours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${m}m`;
  }
  if (!clockIn || !clockOut || clockIn === '--' || clockOut === '--') return '--';

  const inParts = String(clockIn).split(':').map(Number);
  const outParts = String(clockOut).split(':').map(Number);

  if (inParts.length < 2 || outParts.length < 2 || isNaN(inParts[0]) || isNaN(inParts[1]) || isNaN(outParts[0]) || isNaN(outParts[1])) {
    return '--';
  }

  const inMin = inParts[0] * 60 + inParts[1];
  const outMin = outParts[0] * 60 + outParts[1];
  const diff = outMin - inMin;

  if (isNaN(diff) || diff <= 0) return '--';

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
    <div className={`backdrop-blur-md border p-3 rounded-2xl shadow-xl min-w-[150px] text-xs transition-all ${isDark ? 'bg-[#0a1f1a]/90 border-[#133029] text-white shadow-black/20' : 'bg-white/95 border-gray-100 text-gray-800 shadow-slate-200/50'
      }`}>
      <p className="font-extrabold text-[13px] mb-2.5 pb-2 border-b border-slate-100 dark:border-[#133029]">{label}</p>
      <div className="space-y-2">
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full ring-2 ring-white/10" style={{ backgroundColor: item.color }}></span>
              <span className={isDark ? 'text-slate-300 font-semibold uppercase tracking-wider text-[10px]' : 'text-gray-500 font-semibold uppercase tracking-wider text-[10px]'}>
                {item.name}
              </span>
            </div>
            <span className="font-black tabular-nums">{item.value}</span>
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
  const [chartPeriod, setChartPeriod] = useState('week');
  const [chartStats, setChartStats] = useState(null);

  const [teamStatsPeriod, setTeamStatsPeriod] = useState('week');
  const [teamStats, setTeamStats] = useState(null);
  const [teamStatsLoading, setTeamStatsLoading] = useState(false);

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
  const [appViewMode, setAppViewMode] = useState('attendance'); // 'attendance' | 'timeTracker'
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
    } catch (e) {
      console.error('Error fetching period stats:', e);
    }
  }, [statsPeriod]);

  const fetchChartStats = useCallback(async (period = chartPeriod) => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await axios.get(`/api/attendance/me/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChartStats(res.data);
    } catch (e) {
      console.error('Error fetching chart stats:', e);
    }
  }, [chartPeriod]);

  const fetchTeamStats = useCallback(async (period = teamStatsPeriod) => {
    const token = sessionStorage.getItem('token');
    setTeamStatsLoading(true);
    try {
      const res = await axios.get(`/api/attendance/summary/team-stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamStats(res.data);
    } catch (e) {
      console.error('Error fetching team stats:', e);
    } finally {
      setTeamStatsLoading(false);
    }
  }, [teamStatsPeriod]);

  useEffect(() => {
    if (viewContext === 'employee') {
      fetchEmployeeStats(statsPeriod);
    }
  }, [viewContext, statsPeriod, fetchEmployeeStats]);

  useEffect(() => {
    if (viewContext === 'employee') {
      fetchChartStats(chartPeriod);
    }
  }, [viewContext, chartPeriod, fetchChartStats]);

  useEffect(() => {
    if (viewContext !== 'employee') {
      fetchTeamStats(teamStatsPeriod);
    }
  }, [viewContext, teamStatsPeriod, fetchTeamStats]);

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
        fetchChartStats(chartPeriod);
      } else {
        fetchTeamStats(teamStatsPeriod);
      }
    } catch (err) {
      console.warn('Using sample data:', err.message);
      setRecords(SAMPLE_RECORDS);
    } finally {
      setLoading(false);
    }
  }, [viewContext, statsPeriod, chartPeriod, teamStatsPeriod, fetchEmployeeStats, fetchChartStats, fetchTeamStats]);

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
      const presentCount = dayRecords.filter(r => r.status === 'Present').length;
      const lateCount = dayRecords.filter(r => r.status === 'Late').length;
      const halfDayCount = dayRecords.filter(r => r.status === 'Half Day').length;
      const absentCount = dayRecords.filter(r => r.status === 'Absent').length;
      const leaveCount = dayRecords.filter(r => r.status === 'Leave').length;
      days.push({
        day: d,
        dateStr,
        present: presentCount,
        late: lateCount,
        halfDay: halfDayCount,
        absent: absentCount,
        leave: leaveCount,
        total: dayRecords.length
      });
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
          <h1 className="text-[26px] font-extrabold text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Attendance
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#829e92] mt-1">
            {viewContext === 'employee' ? 'Track your daily attendance, working hours and weekly breakdown' : 'Monitor and manage organization-wide employee attendance and shifts'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-[#133029] p-1 rounded-xl mr-2">
            <button
              onClick={() => setAppViewMode('attendance')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${appViewMode === 'attendance' ? 'bg-white dark:bg-[#0a1f1a] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Attendance
            </button>
            <button
              onClick={() => setAppViewMode('timeTracker')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${appViewMode === 'timeTracker' ? 'bg-white dark:bg-[#0a1f1a] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Time Tracker
            </button>
          </div>
          {userRole !== 'employee' && (
            <div className="flex items-center bg-slate-100 dark:bg-[#133029] p-1 rounded-xl mr-2">
              <button
                onClick={() => setViewContext('employee')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewContext === 'employee' ? 'bg-white dark:bg-[#0a1f1a] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                You
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

      {appViewMode === 'attendance' ? (
        <>
          {/* ── PERIOD TOGGLE ── */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#133029] p-1 rounded-xl">
              {['week', 'month', 'year'].map((p) => {
                const isEmployee = viewContext === 'employee';
                const currentPeriod = isEmployee ? statsPeriod : teamStatsPeriod;
                const setPeriod = isEmployee ? setStatsPeriod : setTeamStatsPeriod;
                return (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${currentPeriod === p
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {p}
                  </button>
                );
              })}
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
              { label: `Total (${teamStatsPeriod})`, value: teamStats?.total || 0, icon: Users, color: 'text-slate-700 dark:text-white', bgIcon: 'bg-slate-100 dark:bg-slate-800/40', isLoading: teamStatsLoading },
              { label: 'Present', value: teamStats?.present || 0, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bgIcon: 'bg-emerald-50 dark:bg-emerald-950/30', trend: teamStats?.pct ? `${teamStats.pct}%` : '0%', isLoading: teamStatsLoading },
              { label: 'Late', value: teamStats?.late || 0, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgIcon: 'bg-amber-50 dark:bg-amber-950/30', isLoading: teamStatsLoading },
              { label: 'Absent', value: teamStats?.absent || 0, icon: XCircle, color: 'text-red-600 dark:text-red-400', bgIcon: 'bg-red-50 dark:bg-red-950/30', isLoading: teamStatsLoading },
              { label: 'Half Day', value: teamStats?.halfDay || 0, icon: Sun, color: 'text-blue-600 dark:text-blue-400', bgIcon: 'bg-blue-50 dark:bg-blue-950/30', isLoading: teamStatsLoading },
              { label: 'On Leave', value: teamStats?.leave || 0, icon: Calendar, color: 'text-purple-600 dark:text-purple-400', bgIcon: 'bg-purple-50 dark:bg-purple-950/30', isLoading: teamStatsLoading },
            ]).map((card, i) => (
              <Card key={i} className="flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.bgIcon}`}>
                    <card.icon size={17} className={card.color} />
                  </div>
                  {viewContext !== 'employee' && card.trend && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                      <ArrowUpRight size={10} /> {card.trend}
                    </span>
                  )}
                </div>
                {card.isLoading ? (
                  <div className="h-6 w-16 bg-slate-200 dark:bg-[#133029] rounded animate-pulse mb-1"></div>
                ) : (
                  <h3 className={`text-[18px] font-extrabold ${card.color} leading-none mb-1`}>{card.value}</h3>
                )}
                <p className="text-[10px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">{card.label}</p>
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
                  <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {viewContext === 'employee' ? `${chartPeriod === 'week' ? 'Weekly' : chartPeriod === 'month' ? 'Monthly' : 'Yearly'} Attendance` : 'Weekly Attendance'}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-[#829e92] mt-0.5">
                    {viewContext === 'employee' ? `This ${chartPeriod === 'week' ? "week's" : chartPeriod === 'month' ? "month's" : "year's"} attendance breakdown` : 'Weekly team attendance overview'}
                  </p>
                </div>
                {viewContext === 'employee' && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#133029] p-0.5 rounded-lg">
                    {['week', 'month', 'year'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md transition-all ${chartPeriod === p
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-500 dark:text-[#829e92] hover:text-slate-900 dark:hover:text-white'
                          }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {viewContext === 'employee' ? (
                (() => {
                  const activeData = chartStats || {};
                  const totals = {
                    Present: activeData.present || 0,
                    Late: activeData.late || 0,
                    Absent: activeData.absent || 0,
                    'Half Day': activeData.halfDay || 0,
                    Leave: activeData.leave || 0
                  };

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
                              <span className="text-[10px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-widest mt-1">
                                {chartPeriod === 'week' ? 'Weekly' : chartPeriod === 'month' ? 'Monthly' : 'Yearly'} Rate
                              </span>
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
                          <span>Total this {statsPeriod === 'week' ? 'week' : statsPeriod === 'month' ? 'month' : 'year'}:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{total} days</span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="w-full h-[280px] select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart key={isDark ? 'd' : 'l'} data={weeklyChartData} margin={{ top: 15, right: 15, left: -25, bottom: 0 }} barGap={6}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#143029' : '#eceae7'} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#829e92' : '#9CA3AF', fontSize: 11, fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#829e92' : '#9CA3AF', fontSize: 11, fontWeight: 500 }} dx={-5} />
                      <Tooltip
                        content={<ChartTooltip isDark={isDark} />}
                        cursor={{ fill: isDark ? '#133029' : '#f8fafc', opacity: 0.8 }}
                      />
                      <Legend verticalAlign="top" align="right" iconSize={8} iconType="circle"
                        wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '15px' }}
                        formatter={(v) => <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{v}</span>} />
                      <Bar dataKey="Present" fill="url(#colorPresent)" radius={[4, 4, 0, 0]} barSize={12} animationDuration={1000} />
                      <Bar dataKey="Half Day" fill="url(#colorHalfDay)" radius={[4, 4, 0, 0]} barSize={12} animationDuration={1000} />
                      <Bar dataKey="Late" fill="url(#colorLate)" radius={[4, 4, 0, 0]} barSize={12} animationDuration={1000} />
                      <Bar dataKey="Absent" fill="url(#colorAbsent)" radius={[4, 4, 0, 0]} barSize={12} animationDuration={1000} />
                      <Bar dataKey="Leave" fill="url(#colorLeave)" radius={[4, 4, 0, 0]} barSize={12} animationDuration={1000} />
                      <defs>
                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="colorHalfDay" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                          <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                          <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="colorLeave" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Right Column: Attendance Calendar */}
            <div className="col-span-12 lg:col-span-5 flex flex-col">
              <Card className="h-full flex flex-col justify-between p-5">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <Calendar size={18} className="text-emerald-500" />
                      <span>{calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-[#829e92]">Monthly Attendance Calendar</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] text-slate-500 dark:text-[#829e92] transition-colors"
                      title="Previous Month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCalendarMonth(new Date())}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] text-slate-500 dark:text-[#829e92] transition-colors"
                      title="Next Month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Weekday Names Header */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => (
                    <div key={d} className={`text-[10px] font-bold uppercase tracking-wider py-1 ${i === 6 ? 'text-rose-400' : 'text-slate-400 dark:text-[#829e92]'}`}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1 flex-1">
                  {calendarData.map((day, idx) => {
                    if (!day) {
                      return <div key={`empty-${idx}`} className="h-8 md:h-9" />;
                    }

                    const isToday = day.dateStr === todayStr;
                    const isSunday = new Date(day.dateStr).getDay() === 0;

                    // Color styling based on status
                    let dayBg = 'hover:bg-slate-50 dark:hover:bg-[#0d2a22] text-slate-700 dark:text-slate-300';
                    let dotColor = null;

                    if (day.present > 0) {
                      dotColor = '#10b981';
                      dayBg = 'bg-emerald-50/70 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-300 font-bold';
                    } else if (day.late > 0) {
                      dotColor = '#f59e0b';
                      dayBg = 'bg-amber-50/70 dark:bg-amber-950/25 text-amber-700 dark:text-amber-300 font-bold';
                    } else if (day.halfDay > 0) {
                      dotColor = '#3b82f6';
                      dayBg = 'bg-blue-50/70 dark:bg-blue-950/25 text-blue-700 dark:text-blue-300 font-bold';
                    } else if (day.leave > 0) {
                      dotColor = '#8b5cf6';
                      dayBg = 'bg-purple-50/70 dark:bg-purple-950/25 text-purple-700 dark:text-purple-300 font-bold';
                    } else if (day.absent > 0) {
                      dotColor = '#ef4444';
                      dayBg = 'bg-red-50/60 dark:bg-red-950/20 text-red-600 dark:text-red-400';
                    } else if (isSunday) {
                      dayBg = 'text-slate-400 dark:text-[#557367] bg-slate-50/40 dark:bg-[#0a1814]/30';
                    }

                    return (
                      <div
                        key={day.dateStr}
                        onClick={() => setDateFilter(dateFilter === day.dateStr ? '' : day.dateStr)}
                        className={`h-8 md:h-9 rounded-lg p-0.5 flex flex-col items-center justify-center transition-all cursor-pointer relative text-xs ${dayBg} ${isToday ? 'ring-2 ring-emerald-500 shadow-xs' : ''
                          } ${dateFilter === day.dateStr ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/40' : ''}`}
                        title={`${day.dateStr}: ${day.present ? 'Present' : day.late ? 'Late' : day.halfDay ? 'Half Day' : day.absent ? 'Absent' : day.leave ? 'Leave' : isSunday ? 'Sunday Off' : 'No record'}`}
                      >
                        <span className="leading-none text-[11px] font-bold">{day.day}</span>
                        {dotColor && (
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-0.5"
                            style={{ backgroundColor: dotColor }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Legend */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-[#133029] flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-[#829e92] flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Present</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Late</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Half Day</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Leave</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Absent</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* ── ATTENDANCE HISTORY TABLE ── */}
          <Card>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
              <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight shrink-0">
                Attendance History
                <span className="ml-2 text-xs font-bold text-slate-400 dark:text-[#829e92]">({filteredRecords.length} records)</span>
              </h3>

              {/* Filters & View Mode Tabs in Same Row */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Status Filter */}
                <StatusFilterDropdown
                  value={statusFilter}
                  onChange={setStatusFilter}
                  statusColors={STATUS_COLORS}
                />

                {/* Date Filter */}
                <AttendanceDatePicker
                  value={dateFilter}
                  onChange={setDateFilter}
                  placeholder="dd-mm-yyyy"
                />

                {/* Clear Button */}
                {(searchQuery || statusFilter !== 'All' || dateFilter) && (
                  <button
                    onClick={() => { setSearchQuery(''); setStatusFilter('All'); setDateFilter(''); }}
                    className="px-2.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                )}

                {/* View Mode Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#133029] rounded-xl p-1 shadow-xs">
                  {['daily', 'weekly', 'monthly'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${viewMode === mode
                          ? 'bg-white dark:bg-[#0a1f1a] text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-500 dark:text-[#829e92] hover:text-slate-700 dark:hover:text-white'
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search Bar for Non-Employee roles */}
            {viewContext !== 'employee' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
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
              </div>
            )}

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
                              return getWorkingHours(cIn, cOut, record.totalHours);
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
        </>
      ) : (
        <SmartTimeTracker />
      )}
    </div>
  );
};

export default Attendance;
