
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Search, RefreshCcw, Play, Pause, Square,
  ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon
} from 'lucide-react';
import useAuthStore from '@shared/store/authStore';

const API_BASE = '/api/time';

const TimeTracker = () => {
  const { user } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Timer State
  const [sessionStatus, setSessionStatus] = useState(null); // { hasActiveSession, status, activeTime, isRunning }
  const [displaySeconds, setDisplaySeconds] = useState(0);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  
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
        const selectedYearBtn = document.getElementById('selected-year-btn');
        if (selectedYearBtn) {
          selectedYearBtn.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      }, 10);
    }
  }, [pickerMode, showMonthYearPicker]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Calendar & Table State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  const token = () => sessionStorage.getItem('token');
  const auth = { headers: { Authorization: `Bearer ${token()}` } };

  // Fetch Session Status (poll)
  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/status`, auth);
      setSessionStatus(res.data);
      if (res.data.hasActiveSession && res.data.activeTime != null) {
        const s = res.data;
        if (s.isRunning) {
          const baseTime = s.activeTime || 0;
          const startTime = new Date(s.segmentStart || Date.now()).getTime();
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          setDisplaySeconds(baseTime + Math.max(0, elapsed));
        } else {
          setDisplaySeconds(s.activeTime);
        }
      } else {
        setDisplaySeconds(0);
      }
    } catch (err) {
      console.error('Failed to fetch status', err);
    }
  }, []);

  // Poll status every 10 seconds to keep timer updated with backend authority
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Timer Engine for local elapsed time
  useEffect(() => {
    if (!sessionStatus || !sessionStatus.isRunning) return;

    const baseTime = sessionStatus.activeTime || 0;
    const startTime = new Date(sessionStatus.segmentStart || Date.now()).getTime();

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      setDisplaySeconds(baseTime + Math.max(0, elapsedSeconds));
    }, 1000);

    const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
    setDisplaySeconds(baseTime + Math.max(0, initialElapsed));

    return () => clearInterval(interval);
  }, [sessionStatus?.isRunning, sessionStatus?.segmentStart, sessionStatus?.activeTime]);

  // Fetch Calendar Data (Dots)
  const fetchCalendarData = useCallback(async () => {
    try {
      if (!user) return;
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const userId = user.id || user._id;
      if (!userId) return;
      const res = await axios.get(`${API_BASE}/calendar/${userId}?month=${monthStr}`, auth);
      setCalendarData(res.data);
    } catch (err) {
      console.error('Failed to fetch calendar data', err);
    }
  }, [currentMonth, user]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Fetch Daily Log
  const fetchDailyData = useCallback(async () => {
    try {
      if (!user) return;
      const userId = user.id || user._id;
      if (!userId) return;
      const res = await axios.get(`${API_BASE}/daily/${userId}/${selectedDate}`, auth);
      setDailyData(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setDailyData(null);
      } else {
        console.error('Failed to fetch daily data', err);
      }
    }
  }, [selectedDate, user]);

  useEffect(() => {
    fetchDailyData();
  }, [fetchDailyData, sessionStatus?.status]); // Re-fetch when status changes

  // Action Handlers
  const handleAction = async (action) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      let endpoint = '';
      if (action === 'start') endpoint = '/start';
      else if (action === 'pause') endpoint = '/pause';
      else if (action === 'resume') endpoint = '/resume';
      else if (action === 'stop') endpoint = '/stop';

      if (endpoint) {
        await axios.post(`${API_BASE}${endpoint}`, {}, auth);
        await fetchStatus();
        await fetchDailyData();
        await fetchCalendarData();
      }
    } catch (err) {
      console.error(`Action ${action} failed`, err);
    } finally {
      setIsLoading(false);
    }
  };

  // Format Helpers
  const formatTime = (totalSeconds) => {
    if (totalSeconds == null) return "00:00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatHoursMinutes = (totalMinutes) => {
    if (!totalMinutes) return '0h 0m';
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    return `${h}h ${m}m`;
  };

  const getStatusBadge = () => {
    if (!sessionStatus || !sessionStatus.hasActiveSession || sessionStatus.status === 'completed') {
      return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold">Not Started</span>;
    }
    if (sessionStatus.status === 'active') {
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Working</span>;
    }
    if (sessionStatus.status === 'paused') {
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">On Break</span>;
    }
    if (sessionStatus.status === 'idle') {
      return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold">Idle</span>;
    }
    return null;
  };

  // Calendar Helpers
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // Determine today's running row for table
  const todayStr = new Date().toISOString().split('T')[0];
  const isTodayRunning = sessionStatus?.hasActiveSession && sessionStatus?.status !== 'completed' && selectedDate === todayStr;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-900" style={{ colorScheme: 'light' }}>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Smart Time Tracker</h1>
          <p className="text-sm text-gray-500">{currentTime.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search personnel..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
          </div>
          <button onClick={() => { fetchStatus(); fetchDailyData(); fetchCalendarData(); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <RefreshCcw size={16} className="text-gray-600" />
            Sync Registry
          </button>
        </div>
      </div>

      {/* TOP ROW: 70/30 SPLIT */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6 items-stretch">

        {/* TIME TRACKER CARD (70%) */}
        <div className="lg:w-[70%] bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Current Session</h2>
              {getStatusBadge()}
            </div>
            <Clock size={22} className="text-gray-300" />
          </div>

          <div className="text-center my-auto py-2">
            <div className="text-7xl font-bold text-gray-800 font-mono tracking-tight mb-1">
              {formatTime(displaySeconds)}
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Total Time Tracked</p>
          </div>

        </div>

        {/* DYNAMIC CALENDAR (30%) */}
        <div className="lg:w-[30%] bg-white rounded-2xl border border-gray-100 shadow-sm p-4 relative">
          <div className="flex justify-between items-center mb-3 relative">
            <button 
              className="text-md font-semibold text-gray-800 flex items-center gap-1.5 hover:text-[#10B981] transition-colors cursor-pointer select-none"
              onClick={() => {
                setShowMonthYearPicker(!showMonthYearPicker);
                if (!showMonthYearPicker) {
                  setTempYear(currentMonth.getFullYear());
                  setPickerMode('month');
                }
              }}
            >
              <CalendarIcon size={16} className={showMonthYearPicker ? "text-[#10B981]" : "text-gray-400"} />
              {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </button>
            <div className="flex gap-1">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={16} className="text-gray-600" /></button>
              <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={16} className="text-gray-600" /></button>
            </div>
            
            {/* Custom Month-Year Picker Popup */}
            {showMonthYearPicker && (
              <div 
                ref={pickerRef} 
                className="absolute top-9 left-1/2 -translate-x-1/2 z-50 w-60 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 flex flex-col"
              >
                {/* Selected Year Header (Clickable) */}
                <button
                  type="button"
                  onClick={() => setPickerMode(pickerMode === 'year' ? 'month' : 'year')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-1.5 px-3 rounded-lg transition-colors mb-2 flex justify-center items-center text-sm"
                >
                  {tempYear}
                  <svg className={`w-3.5 h-3.5 ml-1.5 transition-transform ${pickerMode === 'year' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {pickerMode === 'year' ? (
                  <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                    {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - 30 + i).map((y) => (
                      <button
                        key={y}
                        id={tempYear === y ? 'selected-year-btn' : undefined}
                        onClick={() => {
                          setTempYear(y);
                          setPickerMode('month');
                        }}
                        className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          tempYear === y 
                            ? 'bg-[#E0F2FE] text-[#0284C7]' 
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {monthNames.map((m, i) => {
                      const isSelected = currentMonth.getFullYear() === tempYear && currentMonth.getMonth() === i;
                      return (
                        <button
                          key={m}
                          onClick={() => {
                            setCurrentMonth(new Date(tempYear, i, 1));
                            setShowMonthYearPicker(false);
                          }}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            isSelected 
                              ? 'bg-[#10B981] text-white shadow-md' 
                              : 'hover:bg-gray-50 text-gray-700'
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
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-[10px] font-semibold text-gray-400 py-0.5">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="w-8 h-8 mx-auto" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

              const dayData = calendarData.find(d => d.date === dateStr);
              const hasLog = !!dayData;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`
                    relative w-8 h-8 mx-auto flex items-center justify-center text-xs rounded-full transition-all
                    ${isSelected ? 'bg-[#10B981] text-white font-bold shadow-md' : 'hover:bg-gray-50 text-gray-700'}
                    ${isToday && !isSelected ? 'border border-[#10B981] text-[#10B981] font-bold' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

        </div>

      </div>

      {/* DAILY ACTIVITY TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-md font-semibold text-gray-800">Daily Activity</h2>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] cursor-pointer shadow-sm transition-all ml-auto"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="py-2 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="py-2 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Check-in Time</th>
                <th className="py-2 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">No. of Pauses</th>
                <th className="py-2 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total Break Time</th>
                <th className="py-2 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Stop Time</th>
                <th className="py-2 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Total Hours Worked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dailyData ? (
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2 px-4 text-xs text-gray-800 font-medium">
                    {new Date(dailyData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {isTodayRunning && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#10B981]/10 text-[#10B981]">LIVE</span>}
                  </td>
                  <td className="py-2 px-4 text-xs text-gray-600">
                    {dailyData.startTime ? new Date(dailyData.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                  </td>
                  <td className="py-2 px-4 text-xs text-gray-600">
                    {dailyData.pauseEvents?.length || 0}
                  </td>
                  <td className="py-2 px-4 text-xs text-gray-600">
                    {formatHoursMinutes(dailyData.totalPauseDuration || 0)}
                  </td>
                  <td className="py-2 px-4 text-xs text-gray-600">
                    {dailyData.endTime ? (
                      <div className="flex items-center gap-2">
                        {new Date(dailyData.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {dailyData.isAutoStop && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-700">AUTO</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">--</span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-xs font-semibold text-gray-800 text-right">
                    {isTodayRunning
                      ? formatTime(displaySeconds)
                      : formatHoursMinutes(dailyData.totalWorkedDuration || 0)}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-gray-400 text-xs">
                    No activity recorded for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default TimeTracker;
