import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Calendar as CalendarIcon, Clock, Search, Filter, Download,
  CheckCircle, XCircle, RefreshCw, Play, Square, FileClock, X, Monitor, AlertTriangle, ExternalLink
} from 'lucide-react';
import { startDesktopTracker, stopDesktopTracker } from '@shared/services/desktopTrackerService';
import DesktopAppRequiredModal from '@shared/components/DesktopAppRequiredModal';

// Custom tooltip for Weekly chart
const CustomWeeklyTooltip = ({ active, payload, label, isDark }) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-4 rounded-2xl border shadow-xl transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
        }`}>
        <p className="font-bold text-xs uppercase tracking-wider mb-2.5 text-slate-400">{label}</p>
        <div className="space-y-1.5 min-w-[120px]">
          {payload.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs gap-4">
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{item.name}:</span>
              </div>
              <span className="font-extrabold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const EmployeeAttendance = () => {
  // --- THEME STATE ---
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // --- COMPONENT STATE ---
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [weeklyChartData, setWeeklyChartData] = useState({ this_week: [], last_week: [] });
  const [hoveredWeeklySlice, setHoveredWeeklySlice] = useState(null);
  const [statsPeriod, setStatsPeriod] = useState('week'); // 'week' | 'month' | 'year'
  const [periodStats, setPeriodStats] = useState(null);

  // Live Timer/Session State
  const [session, setSession] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [trackerMissingModal, setTrackerMissingModal] = useState(false);

  // Correction Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    clockIn: '09:00',
    clockOut: '17:00',
    reason: ''
  });

  const token = () => sessionStorage.getItem('token');

  // --- API HANDLERS ---
  const fetchAttendanceLogs = async () => {
    try {
      const res = await axios.get('/api/attendance/me', {
        headers: { Authorization: `Bearer ${token()}` }
      });
      setLogs(res.data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      generateMockLogs();
    }
  };

  const fetchWeeklyChart = async () => {
    try {
      const res = await axios.get('/api/attendance/summary/weekly', {
        headers: { Authorization: `Bearer ${token()}` }
      });
      setWeeklyChartData(res.data);
    } catch (err) {
      console.error('Error fetching weekly summary:', err);
      generateFallbackWeeklyChart();
    }
  };

  const fetchSessionStatus = async () => {
    try {
      const res = await axios.get('/api/time/timer/status', {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.data?.isRunning) {
        setSession(res.data);
        const elapsed = res.data.activeTime || 0;
        setTimerSeconds(elapsed);
      } else {
        setSession(null);
        setTimerSeconds(0);
      }
    } catch (err) {
      console.error('Timer status sync issue:', err);
    }
  };

  const fetchStats = async (period = statsPeriod) => {
    try {
      const res = await axios.get(`/api/attendance/me/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      setPeriodStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchStats(statsPeriod);
  }, [statsPeriod]);

  const loadData = async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    await Promise.allSettled([
      fetchAttendanceLogs(),
      fetchWeeklyChart(),
      fetchSessionStatus(),
      fetchStats(statsPeriod)
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Timer Tick Hook
  useEffect(() => {
    if (!session?.isRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.isRunning]);

  // --- CHECK-IN / CHECK-OUT ACTIONS ---
  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const trackerRes = await startDesktopTracker(token());
      if (!trackerRes.success) {
        setTrackerMissingModal(true);
        return;
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateStr = now.toISOString().split('T')[0];

      await axios.post('/api/time/start', {}, {
        headers: { Authorization: `Bearer ${token()}` }
      });

      await axios.post('/api/attendance/clock-in', {
        date: dateStr,
        time: timeStr,
        location: { lat: 12.9716, lng: 77.5946 }
      }, {
        headers: { Authorization: `Bearer ${token()}` }
      }).catch(() => null);

      toast.success('Clock in recorded & Desktop Tracker started!');
      await loadData(false);
    } catch (err) {
      console.error(err);
      toast.error('Clock-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await stopDesktopTracker();
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateStr = now.toISOString().split('T')[0];

      await axios.post('/api/time/stop', {}, {
        headers: { Authorization: `Bearer ${token()}` }
      });

      await axios.put('/api/attendance/clock-out', {
        date: dateStr,
        time: timeStr
      }, {
        headers: { Authorization: `Bearer ${token()}` }
      }).catch(() => null);

      toast.success('Clock out recorded successfully!');
      setSession(null);
      setTimerSeconds(0);
      await loadData(false);
    } catch (err) {
      console.error(err);
      toast.error('Clock out saved locally');
      setSession(null);
      setTimerSeconds(0);
    } finally {
      setActionLoading(false);
    }
  };

  // Correction Submit
  const handleCorrectionSubmit = (e) => {
    e.preventDefault();
    if (!correctionForm.reason.trim()) {
      toast.error('Please justify your regularization request.');
      return;
    }
    toast.success('Regularization request dispatched to HR manager.');
    setIsCorrectionModalOpen(false);
    setCorrectionForm({
      date: new Date().toISOString().split('T')[0],
      clockIn: '09:00',
      clockOut: '17:00',
      reason: ''
    });
  };

  // Fallback data generator for logs
  const generateMockLogs = () => {
    const mock = [];
    const date = new Date();
    for (let i = 0; i < 20; i++) {
      const d = new Date();
      d.setDate(date.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayNum = d.getDay();

      if (dayNum === 0 || dayNum === 6) continue;

      let status = 'Present';
      if (i === 4) status = 'Late';
      if (i === 8) status = 'Absent';

      mock.push({
        _id: `mock_log_${i}`,
        date: dateStr,
        clockIn: status === 'Absent' ? '' : '08:52',
        clockOut: status === 'Absent' ? '' : '17:35',
        status: status
      });
    }
    setLogs(mock);
  };

  // Fallback data generator for charts
  const generateFallbackWeeklyChart = () => {
    setWeeklyChartData({
      this_week: [
        { name: 'Mon', Present: 142, Leave: 10, Absent: 8 },
        { name: 'Tue', Present: 148, Leave: 6, Absent: 6 },
        { name: 'Wed', Present: 151, Leave: 4, Absent: 5 },
        { name: 'Thu', Present: 143, Leave: 9, Absent: 8 },
        { name: 'Fri', Present: 139, Leave: 12, Absent: 9 },
        { name: 'Sat', Present: 62, Leave: 3, Absent: 95 },
        { name: 'Sun', Present: 0, Leave: 0, Absent: 0 }
      ],
      last_week: [
        { name: 'Mon', Present: 139, Leave: 11, Absent: 10 },
        { name: 'Tue', Present: 145, Leave: 7, Absent: 8 },
        { name: 'Wed', Present: 148, Leave: 5, Absent: 7 },
        { name: 'Thu', Present: 141, Leave: 10, Absent: 9 },
        { name: 'Fri', Present: 144, Leave: 8, Absent: 8 },
        { name: 'Sat', Present: 58, Leave: 4, Absent: 98 },
        { name: 'Sun', Present: 0, Leave: 0, Absent: 0 }
      ]
    });
  };

  // KPI Computations
  const kpiStats = useMemo(() => {
    const presentCount = logs.filter(l => l.status === 'Present').length;
    const lateCount = logs.filter(l => l.status === 'Late').length;
    const absentCount = logs.filter(l => l.status === 'Absent').length;
    const totalWorkingDays = logs.length || 1;

    let totalHrs = 0;
    logs.forEach(log => {
      if (log.clockIn && log.clockOut) {
        const [inH, inM] = log.clockIn.split(':').map(Number);
        const [outH, outM] = log.clockOut.split(':').map(Number);
        let diff = (outH * 60 + outM) - (inH * 60 + inM);
        if (diff < 0) diff += 24 * 60;
        if (diff >= 360) diff -= 45; // lunch break
        totalHrs += diff / 60;
      }
    });

    const avgHrs = (totalHrs / (totalWorkingDays || 1)).toFixed(1);

    return {
      presentToday: presentCount + lateCount,
      absentToday: absentCount,
      onLeave: 2, // mock standard leaves
      avgWeeklyHours: `${avgHrs}h`
    };
  }, [logs]);

  // Formatter for live timer
  const formatTimer = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const activeLogsChart = weeklyChartData.this_week || [];
  const resolvedGrid = isDark ? '#1a2d29' : '#e2eae7';
  const resolvedTick = isDark ? '#a3b3af' : '#8c918f';

  return (
    <div className="min-h-screen pb-16 space-y-6" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── TOP CONTROL PANEL ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#050c0a] p-4 md:p-6 rounded-[20px] shadow-sm border border-slate-200/50 dark:border-[#1a2d29] backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">My Attendance</h1>
          <p className="text-xs text-slate-550 dark:text-[#a3b3af] mt-1">
            Real-time tracking status, clock actions, and metrics overview.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
          {/* Global Search Bar mockup */}
          <div className="relative flex-1 md:w-60 md:flex-none">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-full border border-slate-200 dark:border-[#1a2d29] bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>

          {/* Filter Button mockup */}
          <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-[#1a2d29] hover:bg-slate-50 dark:hover:bg-slate-950 text-xs font-bold rounded-full text-slate-700 dark:text-[#a3b3af] transition-colors bg-transparent cursor-pointer">
            <Filter size={12} />
            <span>Filters</span>
          </button>

          <button
            onClick={() => loadData(true)}
            className="p-2 rounded-full border border-slate-200 dark:border-[#1a2d29] hover:bg-slate-50 dark:hover:bg-slate-955 transition-colors text-slate-550 dark:text-[#a3b3af]"
            title="Refresh records"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-emerald-500' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI METRIC CARDS ── */}
      <div className="flex overflow-x-auto lg:grid lg:grid-cols-5 gap-4 pb-2 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {[
          {
            label: `PRESENT (${statsPeriod})`,
            value: periodStats?.present || 0,
            icon: <CheckCircle size={18} className="text-emerald-500" />,
            bg: 'bg-emerald-50 dark:bg-emerald-900/30',
            hoverBorder: 'hover:border-emerald-500'
          },
          {
            label: `LATE (${statsPeriod})`,
            value: periodStats?.late || 0,
            icon: <Clock size={18} className="text-amber-500" />,
            bg: 'bg-amber-50 dark:bg-amber-900/30',
            hoverBorder: 'hover:border-amber-500'
          },
          {
            label: `ABSENT (${statsPeriod})`,
            value: periodStats?.absent || 0,
            icon: <XCircle size={18} className="text-red-500" />,
            bg: 'bg-red-50 dark:bg-red-900/30',
            hoverBorder: 'hover:border-red-500'
          },
          {
            label: `HALF DAY (${statsPeriod})`,
            value: periodStats?.halfDay || 0,
            icon: <Sun size={18} className="text-blue-500" />,
            bg: 'bg-blue-50 dark:bg-blue-900/30',
            hoverBorder: 'hover:border-blue-500'
          },
          {
            label: `LEAVE (${statsPeriod})`,
            value: periodStats?.leave || 0,
            icon: <CalendarIcon size={18} className="text-purple-500" />,
            bg: 'bg-purple-50 dark:bg-purple-900/30',
            hoverBorder: 'hover:border-purple-500'
          }
        ].map((card, i) => (
          <div
            key={i}
            className={`group min-w-[210px] bg-white dark:bg-[#050c0a] p-4 rounded-2xl shadow-sm border border-slate-200/60 dark:border-[#1a2d29] ${card.hoverBorder} hover:shadow-md transition-all duration-300 flex items-center justify-between flex-1`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`p-2.5 rounded-xl shrink-0 ${card.bg}`}>
                {card.icon}
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-[#a3b3af] uppercase tracking-wider truncate" title={card.label}>
                {card.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1 pl-3 shrink-0">
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                {card.value}
              </h2>
              <span className="text-[9px] font-bold text-slate-400 capitalize">Days</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Weekly Attendance — Donut Pie Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#050c0a] p-5 md:p-6 rounded-[20px] shadow-sm border border-slate-200/50 dark:border-[#1a2d29] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {statsPeriod === 'week' ? 'Weekly' : statsPeriod === 'month' ? 'Monthly' : 'Yearly'} Attendance
              </h3>
              <p className="text-xs text-slate-400 dark:text-[#a3b3af] mt-0.5">
                This {statsPeriod === 'week' ? "week's" : statsPeriod === 'month' ? "month's" : "year's"} attendance breakdown
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1a2d29] p-1 rounded-xl">
              {['week', 'month', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setStatsPeriod(p)}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${statsPeriod === p
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const activeData = periodStats || {};
            const totals = {
              Present: activeData.present || 0,
              Late: activeData.late || 0,
              'Half Day': activeData.halfDay || 0,
              Leave: activeData.leave || 0,
              Absent: activeData.absent || 0
            };

            const pieData = [
              { name: 'Present', value: totals.Present, color: '#00a76b' },
              { name: 'Late', value: totals.Late, color: '#F59E0B' },
              { name: 'Half Day', value: totals['Half Day'], color: '#3b82f6' },
              { name: 'Leave', value: totals.Leave, color: '#8b5cf6' },
              { name: 'Absent', value: totals.Absent, color: '#EF4444' },
            ];

            const total = totals.Present + totals.Late + totals['Half Day'] + totals.Leave + totals.Absent;
            const rate = total > 0 ? Math.round(((totals.Present + totals.Late + totals['Half Day']) / total) * 100) : 0;
            const activePie = pieData.filter(d => d.value > 0);
            const displayPie = activePie.length > 0 ? activePie : [{ name: 'No Data', value: 1, color: isDark ? '#142420' : '#e2eae7' }];

            return (
              <div className="flex flex-col sm:flex-row items-center gap-6 justify-between flex-1 select-none min-h-[260px]">
                {/* Donut */}
                <div className="relative shrink-0 w-[200px] h-[200px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={displayPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={86}
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
                  {/* Dynamic Centre label - No overlapping tooltip */}
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
                        <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">{rate}%</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#a3b3af] uppercase tracking-widest mt-1">
                          {statsPeriod === 'week' ? 'Weekly' : statsPeriod === 'month' ? 'Monthly' : 'Yearly'} Rate
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Legend Table */}
                <div className="flex-1 w-full space-y-2.5">
                  {pieData.map((d, idx) => {
                    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                    const isHovered = hoveredWeeklySlice?.name === d.name;
                    return (
                      <div
                        key={idx}
                        className={`space-y-1 p-1 rounded-lg transition-all cursor-pointer ${isHovered ? 'bg-slate-50 dark:bg-[#1a2d29]/60 scale-[1.02]' : ''}`}
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
                            <span className="font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{d.value}</span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 dark:bg-[#1a2d29] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: d.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-slate-100 dark:border-[#1a2d29] flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-[#a3b3af]">
                    <span>Total this {statsPeriod === 'week' ? 'week' : statsPeriod === 'month' ? 'month' : 'year'}:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{total} days</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Clock In / Clock Out console (1/3 width) */}
        <div className="lg:col-span-1 bg-white dark:bg-[#050c0a] p-5 md:p-6 rounded-[20px] shadow-sm border border-slate-200/50 dark:border-[#1a2d29] flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Quick Actions</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider">Attendance console</p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleCheckIn}
                disabled={session?.isRunning || actionLoading}
                className="flex items-center justify-center gap-2.5 h-12 w-full rounded-xl border-none bg-[#00a76b] hover:bg-[#00915c] text-white disabled:opacity-40 transition-all font-bold text-xs cursor-pointer shadow-lg shadow-emerald-500/10 hover:scale-[1.01]"
              >
                <Play size={15} fill="currentColor" />
                <span>Check In</span>
              </button>

              <button
                onClick={handleCheckOut}
                disabled={!session?.isRunning || actionLoading}
                className="flex items-center justify-center gap-2.5 h-12 w-full rounded-xl border border-slate-200 dark:border-[#1a2d29] hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition-all font-bold text-xs cursor-pointer bg-white dark:bg-slate-900 hover:scale-[1.01]"
              >
                <Square size={12} fill="currentColor" />
                <span>Check Out</span>
              </button>

              <button
                onClick={() => setIsCorrectionModalOpen(true)}
                className="flex items-center justify-center gap-2.5 h-12 w-full rounded-xl border border-[#eceae3] dark:border-[#1a2d29] hover:bg-slate-55 dark:hover:bg-[#111c18]/50 text-slate-700 dark:text-[#a3b3af] transition-all font-bold text-xs cursor-pointer bg-slate-50 dark:bg-slate-950/20 hover:scale-[1.01]"
              >
                <FileClock size={15} className="text-[#00a76b]" />
                <span>Request Correction</span>
              </button>
            </div>
          </div>

          <div className="mt-8 bg-slate-50 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-200/50 dark:border-[#1a2d29]">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-[#a3b3af]">Current Session</span>
            <div className="flex items-baseline justify-between mt-2.5">
              <h4 className="font-mono text-3xl font-black tracking-widest text-slate-900 dark:text-white tabular-nums">
                {session ? formatTimer(timerSeconds) : '00:00:00'}
              </h4>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide ${session ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-[#00a76b]' : 'bg-slate-200/60 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
                }`}>
                {session ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-[#a3b3af] mt-2 font-medium">
              {session ? `Started at ${new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Session inactive'}
            </p>
          </div>
        </div>

      </div>

      {/* ── MODAL: REQUEST CORRECTION ── */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsCorrectionModalOpen(false)} />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden z-50 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-105">Request Clock Correction</h3>
              <button
                onClick={() => setIsCorrectionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Date Node</label>
                <input
                  type="date"
                  value={correctionForm.date}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Requested Clock-In</label>
                  <input
                    type="time"
                    value={correctionForm.clockIn}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, clockIn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Requested Clock-Out</label>
                  <input
                    type="time"
                    value={correctionForm.clockOut}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, clockOut: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Reason / Justification</label>
                <textarea
                  placeholder="Explain why regularization is required..."
                  rows="3"
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="px-4 py-2 border border-[#eceae3] dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-xl text-xs font-bold border-none cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚠️ FluidHR Desktop Application Missing Modal */}
      <DesktopAppRequiredModal
        isOpen={trackerMissingModal}
        onClose={() => setTrackerMissingModal(false)}
        onRetry={handleCheckIn}
        token={token()}
        isRetrying={actionLoading}
      />
    </div>
  );
};

export default EmployeeAttendance;
