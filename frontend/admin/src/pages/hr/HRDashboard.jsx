import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users, UserPlus, FileText, CheckCircle, Clock, Calendar, Bell, ChevronRight,
  PieChart as PieChartIcon, TrendingUp, TrendingDown, Briefcase, Plus, Search,
  Download, Activity, ShieldAlert, Gift, Cake, ShieldCheck, Layers, Check, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, BarChart, Bar
} from 'recharts';

const COLORS = ['#00a76b', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#64748b'];

// Small generic card wrapper
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#eceae3] overflow-hidden ${className}`}>
    {children}
  </div>
);

const HRDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  // Dropdown states
  const [attPeriod, setAttPeriod] = useState('This Week');
  const [leavePeriod, setLeavePeriod] = useState('This Month');
  const [payrollPeriod, setPayrollPeriod] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));

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
      setDashboardData(dashRes.data.data);

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
  const firstName = profile?.name ? profile.name.split(' ')[0] : 'HR Admin';

  const currentLeaveOverview = leaveOverview?.byPeriod?.[leavePeriod] || leaveOverview || {
    total: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    pending: 0
  };

  return (
    <div className="bg-[#F8F9FB] min-h-screen p-4 md:p-6 lg:p-8 font-['Inter',sans-serif] text-gray-800 space-y-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Good Morning, {firstName}! 👋</h1>
          <p className="text-gray-500 mt-2 font-medium">Here's what's happening in your organization today.</p>
        </div>
        <div className="flex flex-wrap md:flex-nowrap items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center whitespace-nowrap text-gray-600 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 font-medium">
            <Calendar size={18} className="mr-2 text-[#00a76b] shrink-0" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => window.print()} className="flex items-center whitespace-nowrap gap-2 bg-[#00a76b] hover:bg-[#00915c] text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm">
            <Download size={18} className="shrink-0" />
            Download Report
          </button>
        </div>
      </div>

      {/* 2. Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Employees', val: stats.totalEmployees, subtext: '+12 this month', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', hoverBorder: 'hover:border-blue-400 hover:shadow-blue-500/10' },
          { label: 'Active Employees', val: stats.activeEmployees, subtext: `${stats.activeEmployeesPercent}% of total`, icon: CheckCircle, color: 'text-[#00a76b]', bg: 'bg-green-50', hoverBorder: 'hover:border-[#00a76b] hover:shadow-green-500/10' },
          { label: <>New<br/>Joiners</>, val: stats.newJoiners, subtext: '+3 this month', icon: UserPlus, color: 'text-indigo-500', bg: 'bg-indigo-50', hoverBorder: 'hover:border-indigo-400 hover:shadow-indigo-500/10' },
          { label: 'Employees on Leave', val: stats.employeesOnLeave, subtext: `${stats.employeesOnLeavePercent}% of total`, icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-50', hoverBorder: 'hover:border-orange-400 hover:shadow-orange-500/10' },
          { label: <>Pending<br/>Leave</>, val: stats.pendingLeaveApprovals, subtext: 'Requires your action', icon: Clock, color: 'text-red-500', bg: 'bg-red-50', hoverBorder: 'hover:border-red-400 hover:shadow-red-500/10' },
          { label: 'Open Positions', val: stats.openPositions, subtext: '0 new openings', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50', hoverBorder: 'hover:border-purple-400 hover:shadow-purple-500/10' },
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
            <select value={attPeriod} onChange={(e) => setAttPeriod(e.target.value)} className="text-xs bg-gray-50 border-none rounded-lg font-bold text-gray-600 cursor-pointer outline-none p-1.5">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="h-64 w-full">
            {charts.attendanceOverview.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.attendanceOverview} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="present" stroke="#00a76b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="absent" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm font-medium">No attendance data</div>
            )}
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
            <select 
              value={leavePeriod} 
              onChange={(e) => setLeavePeriod(e.target.value)} 
              className="text-xs bg-gray-50 border border-gray-100 rounded-lg font-bold text-gray-600 cursor-pointer outline-none p-1.5 hover:bg-gray-100 transition-colors"
            >
              <option value="This Month">This Month</option>
              <option value="This Week">This Week</option>
              <option value="This Year">This Year</option>
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
            </select>
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
              <select value={payrollPeriod} onChange={(e) => setPayrollPeriod(e.target.value)} className="text-xs bg-gray-50 rounded-lg font-bold text-gray-600 outline-none p-1.5">
                <option>{payrollPeriod}</option>
              </select>
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
          <button onClick={() => navigate('/hr/payroll')} className="w-full mt-6 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
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
              { label: 'Add Employee', icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-50', path: '/hr/create-user' },
              { label: 'Add Department', icon: Layers, color: 'text-indigo-500', bg: 'bg-indigo-50', path: '/hr/departments' },
              { label: 'Create Job', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50', path: '/hr/jobs' },
              { label: 'Approve Leave', icon: CheckCircle, color: 'text-[#00a76b]', bg: 'bg-green-50', path: '/hr/leave' },
              { label: 'Run Payroll', icon: Activity, color: 'text-orange-500', bg: 'bg-orange-50', path: '/hr/payroll' },
              { label: 'Announcement', icon: Bell, color: 'text-red-500', bg: 'bg-red-50', path: '/hr/notifications' },
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
            <button onClick={() => navigate('/hr/leave')} className="text-xs font-bold text-[#00a76b] hover:underline">View All</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {pendingApprovals.length > 0 ? (
              <div className="space-y-3">
                {pendingApprovals.map((approval) => (
                  <div key={approval._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="p-3 bg-white shadow-sm rounded-xl text-blue-500">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{approval.name}</h4>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">{approval.type} • {approval.subType}</p>
                        <p className="text-xs font-semibold text-gray-400 mt-1">{approval.details}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 sm:mt-0">
                      <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md uppercase">
                        {Math.floor((new Date() - new Date(approval.date)) / (1000 * 60 * 60 * 24)) || 1} days ago
                      </span>
                      <button onClick={() => handleApproveLeave(approval._id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#00a76b] text-white hover:bg-[#00915c] transition-colors shadow-sm">
                        <Check size={16} strokeWidth={3} />
                      </button>
                      <button onClick={() => handleRejectLeave(approval._id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm">
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
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900">Birthdays & Anniv.</h3>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
            {upcomingCelebrations.length > 0 ? upcomingCelebrations.map(celeb => (
              <div key={celeb._id} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={celeb.profileImage ? `http://localhost:5000${celeb.profileImage}` : `https://ui-avatars.com/api/?name=${celeb.name}&background=random`} alt={celeb.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                  <div>
                    <p className="font-bold text-sm text-gray-900">{celeb.name}</p>
                    <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                      {celeb.type === 'Birthday' ? <Cake size={12} className="text-pink-400" /> : <Gift size={12} className="text-purple-400" />}
                      {celeb.type}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {new Date(celeb.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <Gift size={40} className="mb-3 text-gray-200" />
                <p className="font-medium text-sm">No upcoming events this week</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 h-[380px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900">HR Announcements</h3>
            <button onClick={() => navigate('/hr/announcements')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
            {announcements.length > 0 ? announcements.map((ann) => (
              <div key={ann._id} className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-blue-500 text-white px-2 py-0.5 rounded shadow-sm">NEW</span>
                  <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{ann.title || ann.message}</h4>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400">
                <Bell size={32} className="mx-auto mb-2 text-gray-200" />
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
          <select className="text-xs bg-gray-50 rounded-lg font-bold text-gray-600 outline-none p-1.5">
            <option>This Quarter</option>
          </select>
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

    </div>
  );
};

export default HRDashboard;
