import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Play, Square, Clock, Users, Search, Filter, RefreshCw, Pause, ChevronLeft, ChevronRight, Calendar as CalendarIcon, FileDown, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_BASE = '/api/time';

const formatTime = (seconds) => {
  const totalSecs = Math.max(0, parseInt(seconds) || 0);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatMinutes = (seconds) => {
  const totalSecs = parseInt(seconds) || 0;
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const SmartTimeTracker = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [timer, setTimer] = useState(0);
  const [idleTime, setIdleTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Role management
  const [userRole, setUserRole] = useState('employee');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || 'employee');
        setUserId(payload.id);
      } catch (e) {
        console.error('Failed to parse token');
      }
    }
  }, []);

  const getLocalDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Custom Month-Year Picker State
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('month');
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowMonthYearPicker(false);
      }
    };
    if (showMonthYearPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMonthYearPicker]);

  useEffect(() => {
    if (pickerMode === 'year' && showMonthYearPicker) {
      setTimeout(() => {
        const selectedYearBtn = document.getElementById('admin-selected-year-btn');
        if (selectedYearBtn) {
          selectedYearBtn.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      }, 10);
    }
  }, [pickerMode, showMonthYearPicker]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const [calendarData, setCalendarData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDate(new Date()));

  const getAuth = () => {
    const token = sessionStorage.getItem('token');
    if (!token) return null;
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchCalendarData = useCallback(async () => {
    try {
      const auth = getAuth();
      if (!auth || !userId) return;
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const res = await axios.get(`${API_BASE}/calendar/${userId}?month=${monthStr}`, auth);
      setCalendarData(res.data);
    } catch (err) {
      console.error('Failed to fetch calendar data', err);
    }
  }, [currentMonth, userId]);

  useEffect(() => {
    if (userId) fetchCalendarData();
  }, [fetchCalendarData, userId]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // Table & Modal State
  const [tableData, setTableData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedLog, setSelectedLog] = useState(null);

  // Daily Summary State
  const [summaryRange, setSummaryRange] = useState('week'); // 'week' or 'month'
  const [summaryDateRef, setSummaryDateRef] = useState(new Date());
  const [summaryData, setSummaryData] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchTableData = async () => {
    try {
      const auth = getAuth();
      if (!auth) return;

      let url = '';
      if (userRole === 'admin' || userRole === 'hr') {
        const queryParams = [];
        if (dateRange.start && dateRange.end) {
          queryParams.push(`startDate=${dateRange.start}&endDate=${dateRange.end}`);
        } else {
          queryParams.push(`startDate=${selectedDate}&endDate=${selectedDate}`);
        }
        url = `${API_BASE}/all-logs?${queryParams.join('&')}`;
      } else {
        const queryParams = [];
        if (dateRange.start && dateRange.end) {
          queryParams.push(`startDate=${dateRange.start}&endDate=${dateRange.end}`);
        } else {
          queryParams.push(`startDate=${selectedDate}&endDate=${selectedDate}`);
        }
        url = `${API_BASE}/my?${queryParams.join('&')}`;
      }

      const res = await axios.get(url, auth);
      setTableData(Array.isArray(res.data) ? res.data : [res.data].filter(Boolean));
    } catch (err) {
      console.error('Failed to fetch table data:', err);
    }
  };

  const fetchData = async () => {
    try {
      const auth = getAuth();
      if (!auth) {
        navigate('/login');
        return;
      }

      const statusRes = await axios.get(`${API_BASE}/status`, auth).catch(() => ({ data: { hasActiveSession: false } }));

      if (statusRes.data && statusRes.data.hasActiveSession) {
        const s = statusRes.data;
        const isRunning = s.isRunning !== undefined ? s.isRunning : (s.status === 'active');
        const totalActive = s.activeTime || 0;

        setSession({ ...s, isRunning });
        setIdleTime(s.idleTime || 0);

        if (isRunning) {
          const baseTime = totalActive;
          const startTime = new Date(s.segmentStart || Date.now()).getTime();
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          setTimer(baseTime + Math.max(0, elapsed));
        } else {
          setTimer(totalActive);
        }
      } else {
        setSession(null);
        setTimer(0);
        setIdleTime(0);
      }

      fetchTableData();

    } catch (err) {
      console.error('Data pull disrupted:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetchData();
      toast.success('Registry synced successfully');
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const start = new Date(d.setDate(diff));
    const end = new Date(d.setDate(start.getDate() + 6));
    return { start: getLocalDate(start), end: getLocalDate(end) };
  };

  const fetchSummaryData = useCallback(async () => {
    try {
      const auth = getAuth();
      if (!auth || !userId || userRole === 'admin' || userRole === 'hr') return;

      setSummaryLoading(true);
      let query = '';
      if (summaryRange === 'week') {
        const { start, end } = getWeekRange(summaryDateRef);
        query = `?range=week&startDate=${start}&endDate=${end}`;
      } else {
        const month = `${summaryDateRef.getFullYear()}-${String(summaryDateRef.getMonth() + 1).padStart(2, '0')}`;
        query = `?range=month&month=${month}`;
      }

      const res = await axios.get(`${API_BASE}/daily-summary/${userId}${query}`, auth);
      setSummaryData(res.data);
    } catch (err) {
      console.error('Failed to fetch summary data:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [summaryRange, summaryDateRef, userId, userRole]);

  useEffect(() => {
    if (userId) fetchData();
    const interval = setInterval(() => {
      if (userId) fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedDate, dateRange, userId, userRole]);

  useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  const handlePrevSummary = () => {
    const d = new Date(summaryDateRef);
    if (summaryRange === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setSummaryDateRef(d);
  };

  const handleNextSummary = () => {
    const d = new Date(summaryDateRef);
    if (summaryRange === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setSummaryDateRef(d);
  };

  // Timer Engine
  useEffect(() => {
    if (!session || !session.isRunning) return;

    const baseTime = session.activeTime || 0;
    const startTime = new Date(session.segmentStart || Date.now()).getTime();

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      setTimer(baseTime + Math.max(0, elapsedSeconds));
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.isRunning, session?.segmentStart, session?.activeTime]);

  const handleAction = async (action) => {
    try {
      const auth = getAuth();
      if (!auth) {
        navigate('/login');
        return;
      }
      const config = { ...auth, timeout: 5000 };
      await axios.post(`${API_BASE}/${action}`, {}, config);
      fetchData();
      fetchCalendarData(); // refresh calendar as status might change
      if (!isAdmin) fetchSummaryData(); // refresh summary log table
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Action Interrupted';
      alert(`Tracker Error: ${msg}`);
    }
  };

  const handleExport = async () => {
    try {
      const auth = getAuth();
      if (!auth) return;
      const queryParams = [];
      if (dateRange.start && dateRange.end) {
        queryParams.push(`startDate=${dateRange.start}&endDate=${dateRange.end}`);
      } else {
        queryParams.push(`startDate=${selectedDate}&endDate=${selectedDate}`);
      }
      const url = `${API_BASE}/export?${queryParams.join('&')}`;

      const res = await axios.get(url, { ...auth, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `time_logs_${new Date().getTime()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed', err);
      alert('Export Failed');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6" style={{ colorScheme: 'light' }}>
      <RefreshCw size={32} className="text-[#10B981] animate-spin" />
      <p className="text-gray-500 font-medium uppercase tracking-widest text-sm">Initializing Time Protocol...</p>
    </div>
  );

  const isAdmin = userRole === 'admin' || userRole === 'hr';

  // Summary logic for admin
  const totalEmployeesPresent = isAdmin ? new Set(tableData.map(d => d.employeeId?._id)).size : 0;
  const totalHoursLogged = isAdmin ? tableData.reduce((acc, curr) => acc + (curr.totalActiveTime || curr.activeTime || 0), 0) : 0;
  const currentlyActive = isAdmin ? tableData.filter(d => d.status === 'active' || d.isRunning).length : 0;
  const onBreak = isAdmin ? tableData.filter(d => d.status === 'paused').length : 0;

  const filteredData = tableData.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const name = item.employeeId?.fullName || item.employeeId?.name || '';
    return name.toLowerCase().includes(searchLower);
  });

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#0f0d0a] p-6 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 border-b border-gray-200 dark:border-[#38352e] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Smart Time Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-[#a3a094] mt-1">Manage your working hours efficiently.</p>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#a3a094]" size={16} />
              <input
                type="text"
                placeholder="Search personnel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 dark:border-[#38352e] rounded-lg text-sm bg-white dark:bg-[#181612] text-gray-900 dark:text-white focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] shadow-sm w-64"
              />
            </div>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#282520] border border-gray-300 dark:border-[#38352e] shadow-sm rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-[#38352e] transition-colors text-gray-700 dark:text-white disabled:opacity-50">
            <RefreshCw size={16} className={syncing ? 'animate-spin text-[#10B981]' : (loading ? 'animate-spin' : '')} />
            {syncing ? 'Syncing...' : 'Sync Registry'}
          </button>
        </div>
      </div>

      {/* TOP ROW: 60/40 SPLIT */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">

        {/* TIME TRACKER CARD (60%) */}
        <div className="lg:w-[60%] bg-white dark:bg-[#181612] rounded-2xl border border-gray-200 dark:border-[#38352e] shadow-sm px-10 pt-6 pb-6 flex flex-col justify-center relative overflow-hidden">
          <div className="flex justify-between items-start mb-10 relative z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Current Session</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${session?.isRunning ? (session.status === 'active' ? 'bg-[#10B981] animate-pulse' : 'bg-amber-500 animate-pulse') : 'bg-gray-400 dark:bg-gray-600'}`}></div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-[#a3a094]">
                  {session?.isRunning ? (session.status === 'active' ? 'Working' : 'On Break') : (session?.status === 'completed' ? 'Stopped' : 'Not Started')}
                </span>
              </div>
            </div>
            <Clock size={28} className="text-gray-300 dark:text-gray-600" />
          </div>

          <div className="text-center mb-4 relative z-10">
            <div className="text-[5rem] leading-none font-black text-gray-900 dark:text-white font-mono tracking-tighter mb-2">
              {formatTime(timer)}
            </div>
            <p className="text-xs text-gray-400 dark:text-[#a3a094] font-bold tracking-[0.2em] uppercase">Total Time Tracked</p>
          </div>


        </div>

        {/* DYNAMIC CALENDAR (40%) */}
        <div className="lg:w-[40%] bg-white dark:bg-[#181612] rounded-2xl border border-gray-200 dark:border-[#38352e] shadow-sm px-8 pt-4 pb-2 flex flex-col">
          <div className="flex justify-between items-center mb-6 relative">
            <button 
              className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-1 hover:text-[#10B981] transition-colors cursor-pointer select-none bg-transparent border-none"
              onClick={() => {
                setShowMonthYearPicker(!showMonthYearPicker);
                if (!showMonthYearPicker) {
                  setTempYear(currentMonth.getFullYear());
                  setPickerMode('month');
                }
              }}
            >
              <CalendarIcon size={20} className={showMonthYearPicker ? "text-[#10B981] mr-1" : "text-[#10B981] mr-1 opacity-70"} />
              {fullMonthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </button>

            {/* Custom Month-Year Picker Popup */}
            {showMonthYearPicker && (
              <div 
                ref={pickerRef} 
                className="absolute top-10 left-1/2 -translate-x-1/2 z-50 w-64 bg-white dark:bg-[#1E2026] border border-gray-200 dark:border-[#38352e] rounded-xl shadow-2xl p-4 flex flex-col"
              >
                {/* Selected Year Header (Clickable) */}
                <button
                  type="button"
                  onClick={() => setPickerMode(pickerMode === 'year' ? 'month' : 'year')}
                  className="w-full bg-gray-100 dark:bg-[#2A2D35] hover:bg-gray-200 dark:hover:bg-[#32363F] text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors mb-3 flex justify-center items-center"
                >
                  {tempYear}
                  <svg className={`w-4 h-4 ml-2 transition-transform ${pickerMode === 'year' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {pickerMode === 'year' ? (
                  <div className="max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                    {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - 30 + i).map((y) => (
                      <button
                        key={y}
                        id={tempYear === y ? 'admin-selected-year-btn' : undefined}
                        onClick={() => {
                          setTempYear(y);
                          setPickerMode('month');
                        }}
                        className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                          tempYear === y 
                            ? 'bg-[#E0F2FE] dark:bg-[#10B981]/20 text-[#0284C7] dark:text-[#10B981]' 
                            : 'hover:bg-gray-50 dark:hover:bg-[#2A2D35] text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {monthNames.map((m, i) => {
                      const isSelected = currentMonth.getFullYear() === tempYear && currentMonth.getMonth() === i;
                      return (
                        <button
                          key={m}
                          onClick={() => {
                            setCurrentMonth(new Date(tempYear, i, 1));
                            setShowMonthYearPicker(false);
                          }}
                          className={`py-2 rounded-lg text-xs font-bold transition-all ${
                            isSelected 
                              ? 'bg-[#10B981] text-white shadow-md' 
                              : 'hover:bg-gray-50 dark:hover:bg-[#2A2D35] text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-[#282520] rounded-lg transition-colors bg-transparent border-none cursor-pointer"><ChevronLeft size={18} className="text-gray-600 dark:text-[#a3a094]" /></button>
              <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-[#282520] rounded-lg transition-colors bg-transparent border-none cursor-pointer"><ChevronRight size={18} className="text-gray-600 dark:text-[#a3a094]" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-3">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center flex-1 content-start">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayData = calendarData.find(d => d.date === dateStr);
              const hasLog = !!dayData;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === getLocalDate(new Date());

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`
                    relative w-full aspect-square flex items-center justify-center text-sm font-semibold rounded-xl transition-all border-none cursor-pointer
                    ${isSelected ? 'bg-[#10B981] text-white shadow-md' : 'hover:bg-gray-100 dark:hover:bg-[#282520] text-gray-700 dark:text-gray-300 bg-transparent'}
                    ${isToday && !isSelected ? 'border-2 border-[#10B981] text-[#10B981]' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>


        </div>
      </div>

      {/* SUMMARY CARDS (ADMIN ONLY) */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-[#181612] rounded-xl border border-gray-200 dark:border-[#38352e] p-6 shadow-sm">
            <p className="text-xs font-bold text-gray-400 dark:text-[#a3a094] uppercase tracking-widest mb-1">Present Today</p>
            <p className="text-[18px] font-black text-gray-800 dark:text-white">{totalEmployeesPresent}</p>
          </div>
          <div className="bg-white dark:bg-[#181612] rounded-xl border border-gray-200 dark:border-[#38352e] p-6 shadow-sm">
            <p className="text-xs font-bold text-gray-400 dark:text-[#a3a094] uppercase tracking-widest mb-1">Total Hours</p>
            <p className="text-[18px] font-black text-gray-800 dark:text-white">{formatMinutes(totalHoursLogged)}</p>
          </div>
          <div className="bg-white dark:bg-[#181612] rounded-xl border border-gray-200 dark:border-[#38352e] p-6 shadow-sm">
            <p className="text-xs font-bold text-gray-400 dark:text-[#a3a094] uppercase tracking-widest mb-1">Currently Active</p>
            <p className="text-[18px] font-black text-[#10B981]">{currentlyActive}</p>
          </div>
          <div className="bg-white dark:bg-[#181612] rounded-xl border border-gray-200 dark:border-[#38352e] p-6 shadow-sm">
            <p className="text-xs font-bold text-gray-400 dark:text-[#a3a094] uppercase tracking-widest mb-1">On Break</p>
            <p className="text-[18px] font-black text-amber-500">{onBreak}</p>
          </div>
        </div>
      )}

      {/* BOTTOM ROW: ROLE-BASED DAILY ACTIVITY LOG */}
      <div className="bg-white dark:bg-[#181612] rounded-2xl border border-gray-200 dark:border-[#38352e] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-[#38352e] flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-[#282520]">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-widest">
            {isAdmin ? 'All Employees Daily Activity' : 'Daily Activity'}
          </h3>

          {!isAdmin && (
            <input
              type="date"
              className="text-sm outline-none text-gray-700 dark:text-gray-300 font-normal bg-white dark:bg-[#181612] border border-gray-200 dark:border-[#38352e] rounded-lg px-3 py-1.5 shadow-sm focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          )}

          {isAdmin && (
            <div className="flex gap-4 items-center">
              <div className="flex items-center bg-white dark:bg-[#181612] border border-gray-200 dark:border-[#38352e] rounded-lg h-9 overflow-hidden flex-shrink-0 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50">
                <div className="px-3 bg-gray-50 dark:bg-[#282520] border-r border-gray-200 dark:border-[#38352e] h-full flex items-center justify-center">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider whitespace-nowrap">Range</span>
                </div>
                <div className="flex items-center px-1 h-full">
                  <input type="date" className="text-sm outline-none text-gray-700 dark:text-gray-300 bg-transparent min-w-[125px] cursor-pointer h-full px-2" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                  <span className="text-gray-300 dark:text-[#5c584b] px-1 font-bold">-</span>
                  <input type="date" className="text-sm outline-none text-gray-700 dark:text-gray-300 bg-transparent min-w-[125px] cursor-pointer h-full px-2" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                </div>
              </div>
              <button onClick={handleExport} className="flex items-center justify-center gap-2 px-4 h-9 bg-gray-800 dark:bg-[#282520] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-900 dark:hover:bg-[#38352e] transition-colors shadow-sm">
                <FileDown size={14} /> Export CSV
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {isAdmin ? (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#1e1c18] border-b border-gray-200 dark:border-[#38352e]">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Employee Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Check-in Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider text-center">No. of Pauses</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Total Break Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Stop Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider text-right">Total Hours Worked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#38352e]">
                {filteredData.length > 0 ? (
                  filteredData.map((log, i) => {
                    const checkin = log.startTime ? new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                    let checkout = log.endTime ? new Date(log.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

                    const isRunningToday = (log.status === 'active' || log.status === 'paused') && log.date === getLocalDate(new Date());

                    const numPauses = log.sessions ? log.sessions.filter(s => s.pause).length : 0;
                    const breakMins = Math.floor((log.idleTime || 0) / 60);
                    const activeSecs = log.totalActiveTime || log.activeTime || 0;

                    return (
                      <tr key={i} onClick={() => setSelectedLog(log)} className="hover:bg-gray-50 dark:hover:bg-[#282520] transition-colors group cursor-pointer">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                              {(log.employeeId?.name || log.employeeId?.fullName || 'U').charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800 dark:text-white">{log.employeeId?.fullName || log.employeeId?.name || 'Unknown'}</p>
                              <p className="text-xs font-semibold text-gray-400 dark:text-[#a3a094] capitalize">{log.employeeRole || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{log.date}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">{checkin}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300 text-center">{numPauses}</td>
                        <td className="px-6 py-4 text-sm font-medium text-amber-600 dark:text-amber-500">{breakMins > 0 ? `${breakMins} mins` : '-'}</td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {isRunningToday ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/10 dark:bg-[#10B981]/20 text-[#10B981] dark:text-[#34d399] uppercase tracking-wider">Live</span>
                            ) : (
                              <span className="text-gray-700 dark:text-gray-300">{checkout}</span>
                            )}
                            {log.isAutoStop && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-wider border border-amber-200 dark:border-amber-900/50">Auto</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-[#10B981]">{formatMinutes(activeSecs)}</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <p className="text-sm font-bold text-gray-400 dark:text-[#a3a094] uppercase tracking-widest">No activity recorded for this criteria.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#1e1c18] border-b border-gray-200 dark:border-[#38352e]">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Check-in Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider text-center">No. of Pauses</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Resume Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Pause Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider text-right">Total Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#38352e]">
                {(() => {
                  let employeeRows = [];
                  if (filteredData.length > 0) {
                    const log = filteredData[0];
                    const checkinStr = log.startTime ? new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

                    if (log.sessions && log.sessions.length > 0) {
                      log.sessions.forEach((session, idx) => {
                        const startOrResume = session.start || session.resume;
                        const pauseOrEnd = session.pause || session.end;

                        if (startOrResume) {
                          const resumeStr = new Date(startOrResume).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          let pauseStr = 'Running...';
                          let isLive = false;
                          let totalStr = '0m';

                          if (pauseOrEnd) {
                            pauseStr = new Date(pauseOrEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const diffSecs = Math.floor((new Date(pauseOrEnd).getTime() - new Date(startOrResume).getTime()) / 1000);
                            totalStr = formatMinutes(diffSecs);
                          } else {
                            const isLastSession = idx === log.sessions.length - 1;
                            const isToday = log.date === getLocalDate(new Date());

                            if (isLastSession && isToday && log.status === 'active') {
                              isLive = true;
                              const diffSecs = Math.floor((Date.now() - new Date(startOrResume).getTime()) / 1000);
                              const h = Math.floor(diffSecs / 3600);
                              const m = Math.floor((diffSecs % 3600) / 60);
                              const s = diffSecs % 60;
                              totalStr = `${h}h ${m}m ${s}s (running)`;
                            } else {
                              isLive = false;
                              let fallbackEnd = null;

                              if (!isLastSession && log.sessions[idx + 1] && (log.sessions[idx + 1].start || log.sessions[idx + 1].resume)) {
                                fallbackEnd = log.sessions[idx + 1].start || log.sessions[idx + 1].resume;
                              } else if (log.endTime) {
                                fallbackEnd = log.endTime;
                              } else if (!isToday) {
                                fallbackEnd = new Date(`${log.date}T23:59:59`);
                              }

                              if (fallbackEnd) {
                                pauseStr = new Date(fallbackEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const diffSecs = Math.max(0, Math.floor((new Date(fallbackEnd).getTime() - new Date(startOrResume).getTime()) / 1000));
                                totalStr = formatMinutes(diffSecs);
                              } else {
                                pauseStr = 'Missing';
                                totalStr = '0m';
                              }
                            }
                          }

                          const liveBadge = isLive;

                          employeeRows.push({
                            checkin: checkinStr,
                            pauseNo: idx + 1,
                            resumeTime: resumeStr,
                            pauseTime: pauseStr,
                            totalTime: totalStr,
                            isLive: liveBadge
                          });
                        }
                      });
                    }
                  }

                  if (employeeRows.length > 0) {
                    return employeeRows.map((row, idx) => (
                      <tr key={idx} className={`transition-colors ${row.isLive ? 'bg-[#10B981]/10 dark:bg-[#10B981]/20 hover:bg-[#10B981]/20 dark:hover:bg-[#10B981]/30' : 'hover:bg-gray-50 dark:hover:bg-[#282520]'}`}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">{row.checkin}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400 text-center">{row.pauseNo}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">{row.resumeTime}</td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {row.isLive ? (
                            <span className="text-[#10B981] font-bold animate-pulse">{row.pauseTime}</span>
                          ) : (
                            <span className="text-gray-700 dark:text-gray-300">{row.pauseTime}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-sm font-bold ${row.isLive ? 'text-[#10B981]' : 'text-gray-700 dark:text-gray-300'}`}>
                              {row.totalTime}
                            </span>
                            {row.isLive && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981] text-white uppercase tracking-wider">Live</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  } else {
                    return (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <p className="text-sm font-bold text-gray-400 dark:text-[#a3a094] uppercase tracking-widest">No activity recorded for this date.</p>
                        </td>
                      </tr>
                    );
                  }
                })()}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* DAILY SUMMARY LOG (EMPLOYEE ONLY) */}
      {!isAdmin && (
        <div className="bg-white dark:bg-[#181612] rounded-2xl border border-gray-200 dark:border-[#38352e] shadow-sm overflow-hidden mt-8 mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-[#38352e] flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-[#282520]">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-widest">
              Daily Summary
            </h3>

            <div className="flex items-center gap-4">
              <div className="flex items-center bg-gray-100 dark:bg-[#1e1c18] p-1 rounded-lg">
                <button
                  onClick={() => setSummaryRange('week')}
                  className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${summaryRange === 'week' ? 'bg-white dark:bg-[#282520] text-[#10B981] shadow-sm' : 'text-gray-500 dark:text-[#a3a094] hover:text-gray-700 dark:hover:text-white'}`}>
                  Week
                </button>
                <button
                  onClick={() => setSummaryRange('month')}
                  className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${summaryRange === 'month' ? 'bg-white dark:bg-[#282520] text-[#10B981] shadow-sm' : 'text-gray-500 dark:text-[#a3a094] hover:text-gray-700 dark:hover:text-white'}`}>
                  Month
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handlePrevSummary} className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#38352e] rounded-lg transition-colors"><ChevronLeft size={16} className="text-gray-600 dark:text-[#a3a094]" /></button>
                <span className="text-xs font-bold text-gray-600 dark:text-[#a3a094] uppercase w-24 text-center">
                  {summaryRange === 'week'
                    ? `Week of ${new Date(getWeekRange(summaryDateRef).start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                    : summaryDateRef.toLocaleString('default', { month: 'short', year: 'numeric' })}
                </span>
                <button onClick={handleNextSummary} className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#38352e] rounded-lg transition-colors"><ChevronRight size={16} className="text-gray-600 dark:text-[#a3a094]" /></button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto relative min-h-[100px]">
            {summaryLoading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-[#181612]/80 z-10 flex items-center justify-center">
                <RefreshCw size={24} className="text-[#10B981] animate-spin" />
              </div>
            )}

            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#1e1c18] border-b border-gray-200 dark:border-[#38352e]">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Check-in</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Check-out</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider text-right">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#38352e]">
                {summaryData.length > 0 ? (
                  summaryData.map((dayLog, i) => {
                    const checkInTime = dayLog.checkIn ? new Date(dayLog.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                    let checkOutTime = dayLog.checkOut ? new Date(dayLog.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

                    let totalStr = formatMinutes(dayLog.totalHours);
                    let isLive = dayLog.isLive;

                    if (isLive) {
                      checkOutTime = 'Running...';
                      const diffSecs = timer;
                      const h = Math.floor(diffSecs / 3600);
                      const m = Math.floor((diffSecs % 3600) / 60);
                      const s = diffSecs % 60;
                      totalStr = `${h}h ${m}m ${s}s (running)`;
                    } else if (dayLog.status === 'active' && !dayLog.checkOut) {
                      checkOutTime = 'Missing';
                    }

                    return (
                      <tr key={i} className={`transition-colors ${isLive ? 'bg-[#10B981]/10 dark:bg-[#10B981]/20 hover:bg-[#10B981]/20 dark:hover:bg-[#10B981]/30' : 'hover:bg-gray-50 dark:hover:bg-[#282520]'}`}>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{new Date(dayLog.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">{checkInTime}</td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {isLive ? (
                              <span className="text-[#10B981] font-bold animate-pulse">{checkOutTime}</span>
                            ) : (
                              <span className="text-gray-700 dark:text-gray-300">{checkOutTime}</span>
                            )}
                            {dayLog.isAutoStop && !isLive && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-wider border border-amber-200 dark:border-amber-900/50">Auto</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-sm font-bold ${isLive ? 'text-[#10B981]' : 'text-gray-700 dark:text-gray-300'}`}>
                              {totalStr}
                            </span>
                            {isLive && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981] text-white uppercase tracking-wider">Live</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <p className="text-sm font-bold text-gray-400 dark:text-[#a3a094] uppercase tracking-widest">No activity recorded for this period.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAILED MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Activity Breakdown</h3>
                <p className="text-xs text-gray-500 font-semibold">{selectedLog.date} • {selectedLog.employeeId?.fullName || selectedLog.employeeId?.name || 'Unknown'}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 p-4 bg-[#10B981]/10 rounded-xl border border-[#10B981]/20">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-[#10B981] uppercase tracking-widest">Total Active</p>
                  <p className="text-xl font-black text-gray-900">{formatMinutes(selectedLog.totalActiveTime || selectedLog.activeTime || 0)}</p>
                </div>
                <div className="w-px h-8 bg-[#10B981]/20"></div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Total Break</p>
                  <p className="text-xl font-black text-gray-900">{Math.floor((selectedLog.idleTime || 0) / 60)}m</p>
                </div>
                <div className="w-px h-8 bg-[#10B981]/20"></div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pauses</p>
                  <p className="text-xl font-black text-gray-900">{selectedLog.sessions ? selectedLog.sessions.filter(s => s.pause).length : 0}</p>
                </div>
              </div>

              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {selectedLog.sessions && selectedLog.sessions.map((event, idx) => (
                  <React.Fragment key={idx}>
                    {event.start && (
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-white text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <Play size={12} className="text-[#10B981]" fill="currentColor" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-bold text-gray-800 capitalize">Start / Resume</h4>
                            <span className="text-xs font-semibold text-gray-400">{new Date(event.start || event.resume).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {event.pause && (
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-white text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <Pause size={12} className="text-amber-500" fill="currentColor" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-bold text-gray-800 capitalize">Pause</h4>
                            <span className="text-xs font-semibold text-gray-400">{new Date(event.pause).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {event.end && (
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-white text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <Square size={12} className="text-gray-800" fill="currentColor" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-bold text-gray-800 capitalize">Stop</h4>
                            <span className="text-xs font-semibold text-gray-400">{new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SmartTimeTracker;
