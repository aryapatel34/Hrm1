import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Calendar, Clock, Plane, CheckCircle2, Plus, Search,
  SlidersHorizontal, Download, X, AlertCircle, Info,
  ArrowRight, User, FileText, ChevronLeft, ChevronRight, MoreHorizontal, CalendarDays
} from 'lucide-react';
import { io } from 'socket.io-client';

const LeaveManagement = () => {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // NEW STATE: reference date for the dashboard and tabs
  const [refDate, setRefDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('All');

  const token = sessionStorage.getItem('token');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const [QUOTAS, setQuotas] = useState({
    sick: 10,
    earned: 20,
    casual: 12,
    emergency: 5,
    compOff: 3,
    optionalHoliday: 1
  });

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = io(window.location.origin, { withCredentials: true });
    socket.on('connect', () => {
      socket.emit('join_notifications', { userId: user._id || user.id, role: user.role });
    });
    socket.on('leave_updated', (data) => {
      fetchMyLeaves();
    });
    return () => {
      socket.disconnect();
    };
  }, [token, user._id, user.id, user.role]);

  const fetchMyLeaves = async () => {
    try {
      setLoading(true);
      const [leavesResponse, quotasResponse, holidaysResponse] = await Promise.all([
        axios.get('/api/leaves/my', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/leaves/my-quotas', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/holidays', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      setLeaves(leavesResponse.data);
      if (quotasResponse.data) {
        setQuotas(quotasResponse.data);
      }
      if (holidaysResponse.data && Array.isArray(holidaysResponse.data)) {
        setHolidays(holidaysResponse.data);
      }
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const days = calculateDays(formData.startDate, formData.endDate);
      await axios.post('/api/leaves/apply', { ...formData, totalDays: days }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Leave request submitted successfully.');
      setIsRequestModalOpen(false);
      setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
      fetchMyLeaves();
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Failed to submit leave request: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to withdraw this leave request?')) return;
    try {
      await axios.put(`/api/leaves/cancel/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Leave request withdrawn.');
      setIsModalOpen(false);
      fetchMyLeaves();
    } catch (err) {
      console.error('Cancel failed:', err);
      alert('Failed to withdraw request: ' + (err.response?.data?.message || err.message));
    }
  };

  const approvedLeaves = leaves.filter(l => l.status === 'approved');

  const usedEarned = approvedLeaves.filter(l => l.leaveType === 'earned').reduce((acc, curr) => acc + (curr.totalDays || 0), 0);
  const usedSick = approvedLeaves.filter(l => l.leaveType === 'sick').reduce((acc, curr) => acc + (curr.totalDays || 0), 0);
  const usedCasual = approvedLeaves.filter(l => l.leaveType === 'casual').reduce((acc, curr) => acc + (curr.totalDays || 0), 0);

  const sickBalance = Math.max(0, QUOTAS.sick - usedSick);
  const annualBalance = Math.max(0, QUOTAS.earned - usedEarned);

  const totalAllocated = QUOTAS.earned + QUOTAS.sick + QUOTAS.casual + QUOTAS.compOff + QUOTAS.optionalHoliday;
  const totalUsed = usedEarned + usedSick + usedCasual; // simplistic sum for demo
  const totalBalance = totalAllocated - totalUsed;
  const activeLeaveTypesCount = 5;
  const pendingCount = leaves.filter(l => l.status === 'pending').length;

  const currentMonth = refDate.getMonth();
  const currentYear = refDate.getFullYear();

  const filteredLeaves = leaves.filter(l => {
    if (activeTab !== 'All' && l.status.toLowerCase() !== activeTab.toLowerCase()) return false;
    return true;
  });

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };



  // Calendar logic
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const calendarDays = [];

  // Fill previous month trailing days
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({ date: prevMonthDays - i, isCurrentMonth: false });
  }

  // Fill current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ date: i, isCurrentMonth: true });
  }

  // Fill next month leading days
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({ date: i, isCurrentMonth: false });
  }

  const getDayStatus = (day) => {
    if (!day.isCurrentMonth) return null;
    const dateObj = new Date(currentYear, currentMonth, day.date);
    if (dateObj.getDay() === 0) return 'weekly-off'; // Sunday

    // Check if holiday
    const isHoliday = holidays.some(h => new Date(h.date).getDate() === day.date && new Date(h.date).getMonth() === currentMonth);
    if (isHoliday) return 'holiday';

    // Check leaves
    const dayStr = dateObj.toISOString().split('T')[0];
    const leaveForDay = leaves.find(l => {
      const s = new Date(l.startDate).toISOString().split('T')[0];
      const e = new Date(l.endDate).toISOString().split('T')[0];
      return dayStr >= s && dayStr <= e;
    });

    if (leaveForDay) {
      if (leaveForDay.status === 'approved') return 'approved';
      if (leaveForDay.status === 'pending') return 'pending';
    }
    return null;
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-orange-100 text-orange-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#08100e] text-[#3b3e3c] dark:text-[#cbd5e1] font-['Inter',sans-serif] px-0 py-6 lg:px-1 lg:py-6 transition-colors duration-300">

      {/* 1. Header Section */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Leave Manage</h1>
        <button onClick={() => setIsRequestModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition-colors whitespace-nowrap">
          <Plus size={16} /> Apply for Leave
        </button>
      </div>

      {/* 2. Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { title: 'Total Leave Balance', value: totalBalance, unit: 'Days', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100', link: 'View Details' },
          { title: 'Active Leave Types', value: activeLeaveTypesCount, unit: '', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', link: 'View Types' },
          { title: 'Total Leave Allocated', value: totalAllocated, unit: 'Days', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-100', link: 'View Allocation' },
          { title: 'Leaves Taken (YTD)', value: totalUsed, unit: 'Days', icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-100', link: 'View Report' },
          { title: 'Pending Requests', value: pendingCount, unit: pendingCount === 1 ? 'Request' : 'Requests', icon: User, color: 'text-orange-600', bg: 'bg-orange-100', link: 'View Requests' }
        ].map((card, idx) => (
          <div key={idx} className="bg-white dark:bg-[#111c18] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                <card.icon size={20} className={card.color} />
              </div>
              <h3 className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{card.title}</h3>
            </div>
            <div className="mb-4 flex items-center">
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white mr-2">{card.value}</span>
              <span className="text-xs font-medium text-gray-500 mt-1">{card.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Two-Column Section: Balance & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Leave Balance Summary */}
        <div className="bg-white dark:bg-[#111c18] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Leave Balance Summary</h2>
              <p className="text-[10px] text-gray-500 mt-1">As on {refDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <button className="text-xs font-bold text-blue-600">View All</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 dark:bg-[#162722]">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Leave Type</th>
                  <th className="px-4 py-3 text-center">Balance</th>
                  <th className="px-4 py-3 text-center">Used</th>
                  <th className="px-4 py-3 text-center rounded-r-lg">Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Casual Leave (CL)', balance: QUOTAS.casual - usedCasual, used: usedCasual, total: QUOTAS.casual, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
                  { name: 'Sick Leave (SL)', balance: sickBalance, used: usedSick, total: QUOTAS.sick, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
                  { name: 'Earned Leave (EL)', balance: annualBalance, used: usedEarned, total: QUOTAS.earned, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-100' },
                  { name: 'Comp Off (CO)', balance: QUOTAS.compOff, used: 0, total: QUOTAS.compOff, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
                  { name: 'Optional Holiday (OH)', balance: QUOTAS.optionalHoliday, used: 0, total: QUOTAS.optionalHoliday, icon: FileText, color: 'text-pink-600', bg: 'bg-pink-100' }
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-4 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${row.bg}`}>
                        <row.icon size={16} className={row.color} />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-200">{row.name}</span>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-gray-900 dark:text-gray-200">{row.balance}</td>
                    <td className="px-4 py-4 text-center font-medium text-gray-500">{row.used}</td>
                    <td className="px-4 py-4 text-center font-bold text-gray-900 dark:text-gray-200">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leave Calendar */}
        <div className="bg-white dark:bg-[#111c18] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Leave Calendar</h2>
            <button onClick={() => navigate(`/${user.role || 'employee'}/holidays`)} className="text-xs font-bold text-blue-600">View Full Calendar</button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setRefDate(new Date(currentYear, currentMonth - 1, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <ChevronLeft size={20} />
            </button>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">
              {refDate.toLocaleString('default', { month: 'long' })} {currentYear}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setRefDate(new Date())} className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded hover:bg-gray-200">Today</button>
              <button onClick={() => setRefDate(new Date(currentYear, currentMonth + 1, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-[10px] font-bold text-gray-400 py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const status = getDayStatus(day);
              const isToday = day.isCurrentMonth && day.date === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

              let bgClass = "bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800";
              let textClass = day.isCurrentMonth ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600";
              let dot = null;

              if (status === 'approved') {
                bgClass = "bg-green-50 dark:bg-green-900/20";
                dot = <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1"></div>;
              } else if (status === 'pending') {
                dot = <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1"></div>;
              } else if (status === 'holiday') {
                dot = <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1"></div>;
              } else if (status === 'weekly-off') {
                dot = <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1"></div>;
              }

              if (isToday) {
                textClass = "text-red-500 font-bold";
                bgClass = "border border-red-200 dark:border-red-900/50";
              }

              return (
                <div key={idx} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${bgClass} ${textClass}`}>
                  <span>{day.date}</span>
                  {dot}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-[10px] text-gray-500 font-medium">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Approved</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Pending</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Holiday</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-300"></div> Weekly Off</div>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Section: Upcoming Leaves & Policy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* My Upcoming Leaves */}
        <div className="bg-white dark:bg-[#111c18] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">My Upcoming Leaves</h2>
            <button className="text-xs font-bold text-blue-600">View All</button>
          </div>
          <div className="space-y-4">
            {leaves.filter(l => new Date(l.startDate) >= new Date() && (l.status === 'approved' || l.status === 'pending')).length > 0 ? (
              leaves.filter(l => new Date(l.startDate) >= new Date() && (l.status === 'approved' || l.status === 'pending')).slice(0, 3).map((l, idx) => (
                <div key={idx} className="flex gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-lg hover:shadow-md transition-shadow">
                  <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg p-3 flex flex-col items-center justify-center min-w-[70px]">
                    <span className="text-[10px] font-bold uppercase">{new Date(l.startDate).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-lg font-black leading-none my-1">{new Date(l.startDate).getDate()}</span>
                    <span className="text-[9px] font-semibold uppercase">{new Date(l.startDate).toLocaleString('default', { weekday: 'short' })}</span>
                  </div>
                  <div className="flex-1 flex justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 capitalize">{l.leaveType} Leave</h4>
                      <p className="text-xs text-gray-500 mt-1"><span className="font-semibold">Reason:</span> {l.reason || 'N/A'}</p>
                      <p className="text-[10px] text-gray-400 mt-1">Applied on: {new Date(l.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{l.totalDays} Day(s)</span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getStatusColor(l.status)} capitalize`}>{l.status}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-500">No upcoming leaves found.</div>
            )}
          </div>
        </div>

        {/* Leave Policy */}
        <div className="bg-white dark:bg-[#111c18] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Leave Policy</h2>
            <button className="text-xs font-bold text-blue-600">View Full Policy</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase">Annual Leave Allocation</h4>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mt-1">CL: 12 | SL: 10 | EL: 20</p>
                <p className="text-[10px] text-gray-400 mt-1">per year</p>
              </div>
            </div>
            <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase">Carry Forward</h4>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mt-1">Max 5 days</p>
                <p className="text-[10px] text-gray-400 mt-1">per year</p>
              </div>
            </div>
            <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase">Advance Notice</h4>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mt-1">3 days</p>
                <p className="text-[10px] text-gray-400 mt-1">minimum</p>
              </div>
            </div>
            <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase">Medical Certificate</h4>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mt-1">Required after</p>
                <p className="text-[10px] text-gray-400 mt-1">2 sick leave days</p>
              </div>
            </div>
            <div className="col-span-2 p-4 border border-gray-100 dark:border-gray-800 rounded-lg flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase">Max Continuous Leave</h4>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mt-1">15 days</p>
                <p className="text-[10px] text-gray-400 mt-1">at a time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Two-Column Section: Requests & Holidays */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* My Leave Requests */}
        <div className="bg-white dark:bg-[#111c18] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">My Leave Requests</h2>
            <button onClick={() => setActiveTab('All')} className="text-xs font-bold text-blue-600 border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50">View All Requests</button>
          </div>

          <div className="flex gap-6 border-b border-gray-100 dark:border-gray-800 mb-4 overflow-x-auto">
            {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-xs font-bold whitespace-nowrap ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-gray-500 uppercase">
                <tr>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Leave Dates</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Leave Type</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Duration</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Reason</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.length > 0 ? filteredLeaves.map((lv, idx) => (
                  <tr key={idx} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-[#162722] transition-colors">
                    <td className="py-4 px-4 font-bold text-gray-900 dark:text-gray-200 min-w-[180px]">
                      {new Date(lv.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {lv.startDate !== lv.endDate && ` - ${new Date(lv.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </td>
                    <td className="py-4 px-4 font-medium text-gray-700 dark:text-gray-300 capitalize whitespace-nowrap">{lv.leaveType} Leave</td>
                    <td className="py-4 px-4 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{lv.totalDays} {lv.totalDays === 1 ? 'Day' : 'Days'}</td>
                    <td className="py-4 px-4 text-gray-500 max-w-[200px] truncate">{lv.reason || '-'}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getStatusColor(lv.status)} capitalize`}>{lv.status}</span>
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <button onClick={() => { setSelectedLeave(lv); setIsModalOpen(true); }} className="p-1.5 hover:bg-gray-200 rounded text-gray-500">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500 font-medium">No leave requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div className="bg-white dark:bg-[#111c18] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Upcoming Holidays</h2>
            <button onClick={() => navigate(`/${user.role || 'employee'}/holidays`)} className="text-xs font-bold text-blue-600">View Calendar</button>
          </div>
          <div className="space-y-4">
            {holidays.length > 0 ? holidays.filter(h => new Date(h.date) >= new Date()).slice(0, 5).map((h, idx) => {
              const hDate = new Date(h.date);
              const dateStr = hDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              const dayStr = hDate.toLocaleDateString('en-GB', { weekday: 'long' });
              return (
                <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-gray-100">{dateStr}</h4>
                      <p className="text-[10px] text-gray-500">{dayStr}</p>
                    </div>
                  </div>
                  <div className="font-bold text-xs text-gray-700 dark:text-gray-300 text-right">
                    {h.name}
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-4 text-gray-500 text-xs font-medium">No upcoming holidays</div>
            )}
          </div>
        </div>

      </div>

      {/* REQUEST LEAVE MODAL (Keeping the same form logic, just updating UI styles) */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setIsRequestModalOpen(false) }}>
          <div className="bg-white dark:bg-[#111c18] w-full max-w-lg rounded-2xl shadow-xl p-6 relative">
            <button onClick={() => setIsRequestModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Request Leave</h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Leave Type</label>
                <select
                  required
                  value={formData.leaveType}
                  onChange={e => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-[#162722] border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="" disabled>Choose Leave Type</option>
                  <option value="sick">Sick Leave (SL)</option>
                  <option value="casual">Casual Leave (CL)</option>
                  <option value="earned">Earned Leave (EL)</option>
                  <option value="emergency">Emergency Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-[#162722] border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-[#162722] border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Reason</label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="State your reason..."
                  className="w-full min-h-[100px] bg-gray-50 dark:bg-[#162722] border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition-colors mt-2">
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {isModalOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false) }}>
          <div className="bg-white dark:bg-[#111c18] w-full max-w-md rounded-2xl shadow-xl p-6 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 capitalize">{selectedLeave.leaveType} Leave Details</h3>

            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-[#162722] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">{new Date(selectedLeave.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">End Date</label>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">{new Date(selectedLeave.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Total Days</label>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">{selectedLeave.totalDays} day(s)</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                  <p className="mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(selectedLeave.status)} capitalize`}>
                      {selectedLeave.status}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Reason</label>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed p-4 bg-gray-50 dark:bg-[#162722] rounded-xl border border-gray-100 dark:border-gray-800">
                  {selectedLeave.reason || 'No justification provided.'}
                </p>
              </div>

              <div className="flex gap-3 mt-4">
                {selectedLeave.status === 'pending' && (
                  <button onClick={() => handleCancel(selectedLeave._id)} className="flex-1 py-2.5 font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                    Withdraw
                  </button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 font-bold text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 rounded-lg transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
