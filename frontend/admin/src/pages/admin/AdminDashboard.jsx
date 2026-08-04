import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, FileText, CheckCircle, Clock, Calendar, Bell, ChevronRight, ChevronDown,
  PieChart as PieChartIcon, TrendingUp, TrendingDown, Briefcase, Plus, Search,
  Download, Activity, ShieldAlert, Gift, Cake, ShieldCheck, Layers, Check, X,
  PartyPopper, Heart, Sparkles, Send
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, BarChart, Bar
} from 'recharts';

const COLORS = ['#00a76b', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#64748b'];

// Small generic card wrapper
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#eceae3] ${className}`}>
    {children}
  </div>
);

// Custom styled modern dropdown menu
const CustomDropdown = ({ value, onChange, options, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = typeof value === 'object' ? value.label : value;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#F8F9FB] hover:bg-[#eceae3] text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-[#eceae3] transition-all cursor-pointer shadow-xs"
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-xl border border-[#eceae3] py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt, idx) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            const isSelected = (typeof value === 'object' ? value.value : value) === optVal;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected ? 'bg-[#00a76b]/10 text-[#00a76b] font-bold' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{optLabel}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#00a76b]"></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRole = location.pathname.startsWith('/admin') ? 'admin' : 'hr';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    charts: { departmentDistribution: [], attendanceTrend: [], leaveTypeDistribution: [], payrollOverview: [] },
    leaveOverview: {},
    payrollSummary: {},
    recentJoiners: [],
    pendingApprovals: [],
    announcements: [],
    upcomingCelebrations: []
  });

  // Dropdown states
  const [attPeriod, setAttPeriod] = useState('This Week');
  const [leavePeriod, setLeavePeriod] = useState('This Month');
  const [payrollPeriod, setPayrollPeriod] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
  const [selectedLeaveApproval, setSelectedLeaveApproval] = useState(null);

  // Wishes states
  const [wishedEvents, setWishedEvents] = useState([]);
  const [selectedWishCeleb, setSelectedWishCeleb] = useState(null);
  const [customWishMessage, setCustomWishMessage] = useState('');
  const [isSendingWish, setIsSendingWish] = useState(false);

  // Clean any old leftover localStorage key
  useEffect(() => {
    try {
      localStorage.removeItem('hrm_wished_events');
    } catch {}
  }, []);

  const checkIsToday = (celebDate, diffDays) => {
    if (diffDays === 0) return true;
    if (!celebDate) return false;
    const d = new Date(celebDate);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  };

  const handleOpenWishModal = (celeb) => {
    setSelectedWishCeleb(celeb);
    const isBday = celeb.type === 'Birthday';
    const defaultMsg = isBday
      ? `🎂 Wishing you a very Happy Birthday, ${celeb.name}! May your year ahead be filled with happiness, health, and great success! 🎉`
      : `🌟 Happy Work Anniversary, ${celeb.name}! Thank you for your hard work, dedication, and valuable contributions! 🚀`;
    setCustomWishMessage(defaultMsg);
  };

  const handleSendWish = async () => {
    if (!selectedWishCeleb) return;
    setIsSendingWish(true);
    try {
      const token = sessionStorage.getItem('token');
      if (selectedWishCeleb.userId) {
        await axios.post('/api/notifications', {
          targetUserId: selectedWishCeleb.userId,
          message: customWishMessage,
          type: selectedWishCeleb.type === 'Birthday' ? 'birthday' : 'anniversary',
          targetLabel: selectedWishCeleb.name
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setWishedEvents(prev => [...prev, selectedWishCeleb._id]);
      toast.success(`Wishes sent to ${selectedWishCeleb.name}! 🎉`);
      setSelectedWishCeleb(null);
    } catch (err) {
      console.error('Error sending wish notification:', err);
      toast.error(err.response?.data?.message || 'Failed to send wish notification');
    } finally {
      setIsSendingWish(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch Profile
      const profRes = await axios.get('/api/auth/me', { headers });
      setProfile(profRes.data.data);

      // Fetch Aggregated Dashboard Data
      const dashRes = await axios.get('/api/hr-dashboard/summary', { headers });
      const dData = dashRes.data.data;
      setDashboardData(dData);

      const serverWished = (dData?.upcomingCelebrations || [])
        .filter(c => c.isWished)
        .map(c => c._id);
      setWishedEvents(serverWished);

    } catch (err) {
      console.error('Failed to fetch HR dashboard data:', err);
      const errMsg = err.response?.data?.message || err.message || 'Unknown error';
      setError(`Unable to load dashboard data. Details: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (id) => {
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`/api/leaves/hr-approve/${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchData(); // refresh data
    } catch (err) {
      console.error('Error approving leave:', err);
    }
  };

  const handleRejectLeave = async (id) => {
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`/api/leaves/reject/${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchData(); // refresh data
    } catch (err) {
      console.error('Error rejecting leave:', err);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-[#939084] bg-[#F8F9FB]">
        <Activity className="animate-pulse mb-4 text-[#00a76b]" size={48} />
        <p className="font-semibold text-lg">Gathering insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-red-500 bg-[#F8F9FB]">
        <ShieldAlert size={48} className="mb-4" />
        <p className="font-semibold text-lg">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  const { stats, charts, leaveOverview, payrollSummary, recentJoiners, pendingApprovals, announcements, upcomingCelebrations = [] } = dashboardData;
  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Admin';

  const currentLeaveOverview = leaveOverview?.byPeriod?.[leavePeriod] || leaveOverview || {
    total: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    pending: 0
  };

  return (
    <div className="space-y-6 pb-12 font-['Inter',sans-serif] text-gray-800">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Good Morning, {firstName}! 👋</h1>
        </div>
        <div className="flex flex-wrap md:flex-nowrap items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center whitespace-nowrap text-gray-600 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 font-medium">
            <Calendar size={18} className="mr-2 text-[#00a76b] shrink-0" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* 2. Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          { label: 'Total Employees', val: stats.totalEmployees, subtext: '+12 this month', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', hoverBorder: 'hover:border-blue-400 hover:shadow-blue-500/10' },
          { label: 'Active Employees', val: stats.activeEmployees, subtext: `${stats.activeEmployeesPercent}% of total`, icon: CheckCircle, color: 'text-[#00a76b]', bg: 'bg-green-50', hoverBorder: 'hover:border-[#00a76b] hover:shadow-green-500/10' },
          { label: 'New Joiners', val: stats.newJoiners, subtext: '+3 this month', icon: UserPlus, color: 'text-indigo-500', bg: 'bg-indigo-50', hoverBorder: 'hover:border-indigo-400 hover:shadow-indigo-500/10' },
          { label: 'Employees on Leave', val: stats.employeesOnLeave, subtext: `${stats.employeesOnLeavePercent}% of total`, icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-50', hoverBorder: 'hover:border-orange-400 hover:shadow-orange-500/10' },
          { label: 'Pending Leave', val: stats.pendingLeaveApprovals, subtext: 'Requires your action', icon: Clock, color: 'text-red-500', bg: 'bg-red-50', hoverBorder: 'hover:border-red-400 hover:shadow-red-500/10' },
        ].map((stat, i) => (
          <Card key={i} className={`p-4 flex flex-col hover:-translate-y-1 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md ${stat.hoverBorder}`}>
            <div className="mb-3">
              <div className={`inline-flex p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={18} strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-end">
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 leading-tight">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-900 leading-none">{stat.val}</h3>
              <p className={`text-[10px] mt-1.5 font-medium ${stat.subtext.includes('+') ? 'text-green-600' : 'text-gray-400'}`}>
                {stat.subtext}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* 3. Second Row (Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance */}
        <Card className="lg:col-span-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900">Attendance Overview</h3>
            <CustomDropdown
              value={attPeriod}
              onChange={setAttPeriod}
              options={['This Week', 'Last Week']}
            />
          </div>
          <div className="h-64 w-full">
            {(() => {
              const isMock = !charts.attendanceOverview || charts.attendanceOverview.length === 0 || charts.attendanceOverview.every(d => d.present === 0 && d.absent === 0 && d.late === 0);
              const displayData = isMock 
                ? [
                    { name: 'Mon', present: 85, absent: 5, late: 10 },
                    { name: 'Tue', present: 90, absent: 2, late: 8 },
                    { name: 'Wed', present: 88, absent: 4, late: 8 },
                    { name: 'Thu', present: 92, absent: 1, late: 7 },
                    { name: 'Fri', present: 80, absent: 10, late: 10 },
                    { name: 'Sat', present: 40, absent: 50, late: 10 },
                    { name: 'Sun', present: 0, absent: 100, late: 0 }
                  ]
                : charts.attendanceOverview;

              return (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="present" stroke="#00a76b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="absent" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </Card>

        {/* Role Distribution */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-6">Role-wise Employees</h3>
          <div className="flex flex-col items-center justify-center">
            {charts.departmentDistribution.length > 0 ? (
              <>
                <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.departmentDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                        {charts.departmentDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-900">{stats.totalEmployees}</span>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 w-full">
                  {charts.departmentDistribution.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      {entry.name}: <span className="text-gray-900 font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-sm font-medium h-48 flex items-center">No department data</div>
            )}
          </div>
        </Card>

        {/* Gender Distribution */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-6">Gender Distribution</h3>
          <div className="flex flex-col items-center justify-center">
            {charts.genderDistribution.length > 0 ? (
              <>
                <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.genderDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                        {charts.genderDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={['#3b82f6', '#f43f5e', '#f59e0b'][index % 3]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-900">{stats.totalEmployees}</span>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 w-full">
                  {charts.genderDistribution.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#3b82f6', '#f43f5e', '#f59e0b'][index % 3] }}></span>
                      {entry.name}: <span className="text-gray-900 font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-sm font-medium h-48 flex items-center">No gender data</div>
            )}
          </div>
        </Card>
      </div>

      {/* 4. Third Row (Leave, Payroll, Recruitment) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900">Leave Overview</h3>
            <CustomDropdown
              value={leavePeriod}
              onChange={setLeavePeriod}
              options={['This Month', 'This Week', 'This Year', 'All Time', 'Today']}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs font-bold text-gray-500 mb-1">Total Leaves</p>
              <p className="text-2xl font-black text-gray-900">{currentLeaveOverview.total || 0}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl">
              <p className="text-xs font-bold text-green-700 mb-1">Approved</p>
              <p className="text-2xl font-black text-green-800">{currentLeaveOverview.approved || 0}</p>
              <p className="text-[10px] font-semibold text-green-600">
                {currentLeaveOverview.total ? Math.round((currentLeaveOverview.approved / currentLeaveOverview.total) * 100) : 0}%
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-xl">
              <p className="text-xs font-bold text-red-700 mb-1">Rejected</p>
              <p className="text-2xl font-black text-red-800">{currentLeaveOverview.rejected || 0}</p>
              <p className="text-[10px] font-semibold text-red-600">
                {currentLeaveOverview.total ? Math.round((currentLeaveOverview.rejected / currentLeaveOverview.total) * 100) : 0}%
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl">
              <p className="text-xs font-bold text-orange-700 mb-1">Cancelled</p>
              <p className="text-2xl font-black text-orange-800">{currentLeaveOverview.cancelled || 0}</p>
              <p className="text-[10px] font-semibold text-orange-600">
                {currentLeaveOverview.total ? Math.round((currentLeaveOverview.cancelled / currentLeaveOverview.total) * 100) : 0}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900">Payroll Summary</h3>
              <CustomDropdown
                value={payrollPeriod}
                onChange={setPayrollPeriod}
                options={[payrollPeriod]}
              />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-1">{formatCurrency(payrollSummary.total)}</h2>
            <p className="text-sm font-semibold text-gray-500 mb-6">Total Payroll Cost</p>

            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-[#00a76b] rounded-full transition-all duration-500" style={{ width: `${payrollSummary.total ? (payrollSummary.processed/payrollSummary.total)*100 : 0}%` }}></div>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-gray-500">Processed</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(payrollSummary.processed)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500">Pending</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(payrollSummary.pending)}</p>
              </div>
            </div>
          </div>
          <button onClick={() => navigate(`/${pathRole}/payroll`)} className="w-full mt-6 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            View Payroll Details <ChevronRight size={16} />
          </button>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900">Recruitment Overview</h3>
            <select className="text-xs bg-gray-50 rounded-lg font-bold text-gray-600 outline-none p-1.5">
              <option>This Month</option>
            </select>
          </div>
          <div className="space-y-4">
            {[
              { label: 'New Applications', val: '0', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
              { label: 'Shortlisted', val: '0', icon: CheckCircle, color: 'text-indigo-500', bg: 'bg-indigo-50' },
              { label: 'Interviews Scheduled', val: '0', icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-50' },
              { label: 'Offers Issued', val: '0', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50' },
              { label: 'Hires This Month', val: '0', icon: UserPlus, color: 'text-[#00a76b]', bg: 'bg-green-50' }
            ].map((r, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${r.bg} ${r.color}`}>
                    <r.icon size={16} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{r.label}</span>
                </div>
                <span className="font-black text-gray-900">{r.val}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 5. Fourth Row (Quick Actions, Pending Approvals) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6 xl:col-span-1">
          <h3 className="font-bold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
            {[
              { label: 'Add Employee', icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-50', path: `/${pathRole}/create-user` },
              { label: 'Add Department', icon: Layers, color: 'text-indigo-500', bg: 'bg-indigo-50', path: `/${pathRole}/departments` },
              { label: 'Create Job', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50', path: `/${pathRole}/jobs` },
              { label: 'Approve Leave', icon: CheckCircle, color: 'text-[#00a76b]', bg: 'bg-green-50', path: `/${pathRole}/leave` },
              { label: 'Run Payroll', icon: Activity, color: 'text-orange-500', bg: 'bg-orange-50', path: `/${pathRole}/payroll` },
              { label: 'Announcement', icon: Bell, color: 'text-red-500', bg: 'bg-red-50', path: `/${pathRole}/notifications` },
            ].map((action, i) => (
              <button key={i} onClick={() => navigate(action.path)} className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                <div className={`p-3 rounded-xl mb-3 ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon size={22} />
                </div>
                <span className="text-[11px] font-bold text-gray-600 text-center uppercase tracking-wider">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6 xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900">Pending Approvals</h3>
            <button onClick={() => navigate(`/${pathRole}/leave`)} className="text-xs font-bold text-[#00a76b] hover:underline">View All</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {pendingApprovals.length > 0 ? (
              <div className="space-y-3">
                {pendingApprovals.map((approval) => (
                  <div 
                    key={approval._id} 
                    onClick={() => setSelectedLeaveApproval(approval)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 hover:bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="p-3 bg-white group-hover:bg-blue-50 shadow-sm rounded-xl text-blue-500 transition-colors">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-sm group-hover:text-[#00a76b] transition-colors">{approval.name}</h4>
                          <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full capitalize">
                            {approval.subType || approval.type}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-500 mt-1 flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-400" />
                          {approval.details}
                        </p>
                        {approval.reason && (
                          <p className="text-xs text-gray-400 italic mt-1 line-clamp-1 max-w-md">
                            "{approval.reason}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 sm:mt-0" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md uppercase">
                        {Math.floor((new Date() - new Date(approval.date)) / (1000 * 60 * 60 * 24)) || 1} days ago
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveLeave(approval._id);
                        }} 
                        title="Approve Leave"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#00a76b] text-white hover:bg-[#00915c] transition-colors shadow-sm"
                      >
                        <Check size={16} strokeWidth={3} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectLeave(approval._id);
                        }} 
                        title="Reject Leave"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
                      >
                        <X size={16} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShieldCheck size={48} className="mb-3 text-gray-200" />
                <p className="font-medium text-sm">No pending approvals required.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 6. Fifth Row (Recent Joiners, Birthdays, Announcements) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 h-[380px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900">Recent Joiners</h3>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
            {recentJoiners.length > 0 ? recentJoiners.map((rj) => (
              <div key={rj._id} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={rj.profileImage ? `http://localhost:5000${rj.profileImage}` : `https://ui-avatars.com/api/?name=${rj.name}&background=random`} alt={rj.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                  <div>
                    <p className="font-bold text-sm text-gray-900">{rj.name}</p>
                    <p className="text-xs font-medium text-gray-500">{rj.role}</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-400">{new Date(rj.joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'})}</span>
              </div>
            )) : <p className="text-sm text-gray-400 text-center py-4">No recent joiners</p>}
          </div>
        </Card>

        <Card className="p-6 h-[380px] flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900">Birthdays & Anniv.</h3>
              {upcomingCelebrations.some(c => checkIsToday(c.date, c.diffDays)) && (
                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse">
                  🎉 Today
                </span>
              )}
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {upcomingCelebrations.length > 0 ? upcomingCelebrations.map(celeb => {
              const isToday = checkIsToday(celeb.date, celeb.diffDays);
              const isWished = Boolean(celeb.isWished || wishedEvents.includes(celeb._id));

              return (
                <div 
                  key={celeb._id} 
                  className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl transition-all ${
                    isToday ? 'bg-emerald-50/70 border border-emerald-200/70 shadow-2xs' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Left: Avatar + Info */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <img 
                        src={celeb.profileImage ? `http://localhost:5000${celeb.profileImage}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(celeb.name)}&background=random`} 
                        alt={celeb.name} 
                        className="w-9 h-9 rounded-full border-2 border-white shadow-xs object-cover" 
                      />
                      {isToday && (
                        <span className="absolute -bottom-1 -right-1 text-xs select-none">
                          {celeb.type === 'Birthday' ? '🎂' : '🌟'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-gray-900 truncate leading-tight">{celeb.name}</p>
                      <p className="text-[11px] font-medium text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                        {celeb.type === 'Birthday' ? <Cake size={11} className="text-pink-500 shrink-0" /> : <Gift size={11} className="text-purple-500 shrink-0" />}
                        <span className="truncate">{celeb.type}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Action or Date */}
                  <div className="shrink-0 flex items-center">
                    {isToday ? (
                      isWished ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-[#00a76b] bg-emerald-100/90 px-2 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                          <Heart size={11} className="fill-[#00a76b] text-[#00a76b]" />
                          <span>Wished!</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenWishModal(celeb)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <PartyPopper size={12} className="text-amber-200" />
                          <span>Wish</span>
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                        {new Date(celeb.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <Gift size={40} className="mb-3 text-gray-200" />
                <p className="font-medium text-sm">No upcoming events this week</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 h-[380px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Announcements</h3>
            <button 
              onClick={() => navigate(`/${pathRole}/notifications`)} 
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              View All
            </button>
          </div>
          <div className="space-y-2.5 flex-1 flex flex-col justify-start">
            {announcements && announcements.length > 0 ? announcements.slice(0, 3).map((ann) => (
              <div 
                key={ann._id} 
                onClick={() => navigate(`/${pathRole}/notifications`)}
                className="p-3 bg-[#f0f6ff] dark:bg-blue-950/25 hover:bg-[#e6f0fd] dark:hover:bg-blue-950/40 rounded-2xl border border-[#dbeafe] dark:border-blue-900/40 flex flex-col gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-[#2563eb] text-white px-2 py-0.5 rounded shadow-xs shrink-0">
                    NEW
                  </span>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs line-clamp-1 flex-1 leading-tight">
                    {ann.title || ann.message}
                  </h4>
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium pt-0.5">
                  <span className="font-bold text-[#2563eb] dark:text-blue-400">
                    By: {ann.senderName || (ann.senderRole === 'admin' ? 'Admin' : 'HR Manager')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">
                      {new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {!ann.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-xs"></span>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 my-auto">
                <Bell size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No active announcements</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 7. Bottom Row (Analytics) */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-900">HR Analytics</h3>
          <CustomDropdown
            value="This Quarter"
            options={['This Quarter', 'Last Quarter', 'This Year']}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { id: 'turnover', label: 'Employee Turnover Rate', val: '8.4%', trend: 'down', trendVal: '1.2%', color: '#10b981', trendColor: 'text-[#10b981]', data: [{v:12},{v:14},{v:10},{v:15},{v:14},{v:16},{v:12},{v:17}] },
            { id: 'hire', label: 'Average Time to Hire', val: '18 Days', trend: 'down', trendVal: '2 days', color: '#3b82f6', trendColor: 'text-[#3b82f6]', data: [{v:20},{v:22},{v:20},{v:18},{v:21},{v:19},{v:18},{v:25}] },
            { id: 'satisfaction', label: 'Employee Satisfaction', val: '4.2 / 5', trend: 'up', trendVal: '0.3', color: '#8b5cf6', trendColor: 'text-[#8b5cf6]', data: [{v:3.8},{v:3.7},{v:3.9},{v:3.8},{v:4.1},{v:3.9},{v:4.0},{v:4.2}] },
            { id: 'absenteeism', label: 'Absenteeism Rate', val: '2.6%', trend: 'down', trendVal: '0.8%', color: '#f59e0b', trendColor: 'text-[#f59e0b]', data: [{v:3.2},{v:3.0},{v:3.1},{v:2.8},{v:2.9},{v:2.5},{v:2.7},{v:2.9}] },
            { id: 'training', label: 'Training Completion Rate', val: '76%', trend: 'up', trendVal: '6%', color: '#14b8a6', trendColor: 'text-[#14b8a6]', data: [{v:65},{v:68},{v:66},{v:70},{v:70},{v:74},{v:73},{v:76}] },
          ].map((metric, i) => (
            <div key={i} className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm relative overflow-hidden flex flex-col h-36">
              <p className="text-[11px] font-bold text-gray-700 tracking-tight mb-2 truncate">{metric.label}</p>
              <h4 className="text-2xl font-black text-gray-900">{metric.val}</h4>
              <p className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${metric.trendColor}`}>
                {metric.trend === 'up' ? '↑' : '↓'} {metric.trendVal} vs last quarter
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metric.data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`color-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metric.color} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={metric.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={metric.color} strokeWidth={2} fillOpacity={1} fill={`url(#color-${metric.id})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Leave Details Modal */}
      {selectedLeaveApproval && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedLeaveApproval(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 relative my-auto flex flex-col max-h-[90vh] overflow-hidden transform animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header (Fixed at top) */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Leave Application Details</h3>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-800">
                    Pending Approval
                  </span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedLeaveApproval(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Employee Profile Card */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#00a76b] text-white font-bold text-lg flex items-center justify-center uppercase shadow-sm">
                  {selectedLeaveApproval.name ? selectedLeaveApproval.name.charAt(0) : 'E'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-gray-900 text-base truncate">{selectedLeaveApproval.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold mt-0.5">
                    <span className="capitalize">{selectedLeaveApproval.role || 'Employee'}</span>
                    {selectedLeaveApproval.employeeId && (
                      <>
                        <span>•</span>
                        <span>ID: {selectedLeaveApproval.employeeId}</span>
                      </>
                    )}
                  </div>
                  {selectedLeaveApproval.email && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{selectedLeaveApproval.email}</p>
                  )}
                </div>
              </div>

              {/* Leave Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Leave Type</p>
                  <p className="text-sm font-black text-gray-900 capitalize mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {selectedLeaveApproval.subType || selectedLeaveApproval.type}
                  </p>
                </div>
                <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Duration</p>
                  <p className="text-sm font-black text-gray-900 mt-1">
                    {selectedLeaveApproval.totalDays || 1} {selectedLeaveApproval.totalDays === 1 ? 'Day' : 'Days'}
                  </p>
                </div>
                <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 col-span-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Leave Duration</p>
                  <p className="text-sm font-black text-gray-900 mt-1 flex items-center gap-2">
                    <Calendar size={15} className="text-[#00a76b]" />
                    {selectedLeaveApproval.startDate ? new Date(selectedLeaveApproval.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : selectedLeaveApproval.details}
                    <span className="text-gray-400 font-normal">to</span>
                    {selectedLeaveApproval.endDate ? new Date(selectedLeaveApproval.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </p>
                </div>
              </div>

              {/* Reason For Leave Box (Main Requirement) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Reason for Leave (રજા શેના માટે મૂકી છે):
                </label>
                <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/70 text-gray-800 text-sm leading-relaxed font-medium">
                  {selectedLeaveApproval.reason || 'No detailed explanation provided.'}
                </div>
              </div>

              {/* Applied Date Info */}
              <div className="text-right">
                <span className="text-[11px] font-semibold text-gray-400">
                  Applied on: {selectedLeaveApproval.date ? new Date(selectedLeaveApproval.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Action Buttons (Fixed at bottom) */}
            <div className="p-6 pt-4 border-t border-gray-100 shrink-0 bg-gray-50/50 rounded-b-3xl grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  handleRejectLeave(selectedLeaveApproval._id);
                  setSelectedLeaveApproval(null);
                }}
                className="w-full py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <X size={16} strokeWidth={2.5} />
                Reject Leave
              </button>
              <button
                type="button"
                onClick={() => {
                  handleApproveLeave(selectedLeaveApproval._id);
                  setSelectedLeaveApproval(null);
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#00a76b]/20"
              >
                <Check size={16} strokeWidth={2.5} />
                Approve Leave
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Send Wish Greeting Modal */}
      {selectedWishCeleb && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedWishCeleb(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 relative my-auto flex flex-col max-h-[90vh] overflow-hidden transform animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 shrink-0 bg-gradient-to-r from-emerald-50 to-teal-50/30">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-[#00a76b] flex items-center justify-center font-bold text-xl shadow-xs">
                  {selectedWishCeleb.type === 'Birthday' ? '🎂' : '🌟'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">
                    {selectedWishCeleb.type === 'Birthday' ? 'Send Birthday Wishes 🎉' : 'Send Anniversary Wishes 🌟'}
                  </h3>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">
                    Express your greetings to <span className="text-gray-900 font-bold">{selectedWishCeleb.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWishCeleb(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Employee Preview Badge */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                <img
                  src={selectedWishCeleb.profileImage ? `http://localhost:5000${selectedWishCeleb.profileImage}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedWishCeleb.name)}&background=random`}
                  alt={selectedWishCeleb.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
                />
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{selectedWishCeleb.name}</h4>
                  <p className="text-xs text-gray-500 font-medium">
                    {selectedWishCeleb.type === 'Birthday' ? '🎂 Celebrating Birthday Today' : `🌟 Celebrating ${selectedWishCeleb.type} Today`}
                  </p>
                </div>
              </div>

              {/* Quick Template Chips */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Quick Message Templates:
                </label>
                <div className="flex flex-col gap-2">
                  {(selectedWishCeleb.type === 'Birthday' ? [
                    `🎂 Wishing you a very Happy Birthday, ${selectedWishCeleb.name}! May your year ahead be filled with happiness and great success! 🎉`,
                    `🎉 Happy Birthday ${selectedWishCeleb.name}! Hope you have a wonderful celebration today! 🌟`,
                    `🎈 Warmest wishes on your special day! Thank you for being an amazing part of our team!`
                  ] : [
                    `🌟 Happy Work Anniversary, ${selectedWishCeleb.name}! Thank you for your dedication and contributions! 🚀`,
                    `🎉 Congratulations on your Work Anniversary! Wishing you continued growth and success with us! 💼`,
                    `✨ Cheers to another great milestone! Thank you for all your hard work!`
                  ]).map((template, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomWishMessage(template)}
                      className={`text-left p-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        customWishMessage === template
                          ? 'bg-emerald-50 border-[#00a76b] text-[#00a76b] font-bold shadow-xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Message Area */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Your Personalized Message:
                </label>
                <textarea
                  rows={4}
                  value={customWishMessage}
                  onChange={(e) => setCustomWishMessage(e.target.value)}
                  placeholder="Write your wishes here..."
                  className="w-full p-3.5 text-sm bg-gray-50/70 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:border-[#00a76b] resize-none text-gray-800 font-medium"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-4 border-t border-gray-100 shrink-0 bg-gray-50/50 rounded-b-3xl flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedWishCeleb(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingWish || !customWishMessage.trim()}
                onClick={handleSendWish}
                className="flex-1 py-3 px-4 rounded-xl bg-[#00a76b] hover:bg-[#00915c] disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-[#00a76b]/20 cursor-pointer active:scale-95"
              >
                {isSendingWish ? (
                  <>
                    <Activity size={16} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Wish 🚀</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default AdminDashboard;
