import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  Calendar, Clock, Plane, CheckCircle2, Plus, Search,
  SlidersHorizontal, Download, X, AlertCircle, Info,
  ArrowRight, User, FileText, ChevronLeft, ChevronRight, MoreHorizontal, CalendarDays
} from 'lucide-react';
import { io } from 'socket.io-client';
import ViewPolicyDrawer from '../../components/modals/ViewPolicyDrawer';
import ViewHolidaysDrawer from '../../components/modals/ViewHolidaysDrawer';
import ViewUpcomingLeavesDrawer from '../../components/modals/ViewUpcomingLeavesDrawer';
import ViewLeaveRequestsDrawer from '../../components/modals/ViewLeaveRequestsDrawer';
import OnDutyRequestModal from '../../components/modals/OnDutyRequestModal';
import MyOnDutyRequestsModal from '../../components/modals/MyOnDutyRequestsModal';
import CompOffRequestModal from '../../components/modals/CompOffRequestModal';
import MyCompOffRequestsModal from '../../components/modals/MyCompOffRequestsModal';
import MyCompOffOnDutyRequestsDrawer from '../../components/modals/MyCompOffOnDutyRequestsDrawer';
import CustomDatePicker from '../../components/CustomDatePicker';

const CustomSelect = ({ value, onChange, options, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-4 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-xs font-semibold text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
      >
        <span className={selectedOption ? "text-gray-900 dark:text-white" : "text-gray-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[10000]" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-[10001] w-full mt-1 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                  value === opt.value 
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const LeaveManagement = () => {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [compOffs, setCompOffs] = useState([]);
  const [onDutys, setOnDutys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });
  const [openedFromHistory, setOpenedFromHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editFormData, setEditFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isPolicyDrawerOpen, setIsPolicyDrawerOpen] = useState(false);
  const [isHolidaysDrawerOpen, setIsHolidaysDrawerOpen] = useState(false);
  const [isUpcomingLeavesDrawerOpen, setIsUpcomingLeavesDrawerOpen] = useState(false);
  const [isLeaveRequestsDrawerOpen, setIsLeaveRequestsDrawerOpen] = useState(false);
  const [isCompOffOnDutyDrawerOpen, setIsCompOffOnDutyDrawerOpen] = useState(false);
  const [isOnDutyModalOpen, setIsOnDutyModalOpen] = useState(false);
  const [isMyOnDutyModalOpen, setIsMyOnDutyModalOpen] = useState(false);
  const [isCompOffModalOpen, setIsCompOffModalOpen] = useState(false);
  const [isMyCompOffModalOpen, setIsMyCompOffModalOpen] = useState(false);
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
      const [leavesResponse, quotasResponse, holidaysResponse, policiesResponse, compOffResponse, onDutyResponse] = await Promise.all([
        axios.get('/api/leaves/my', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/leaves/my-quotas', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/holidays', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get('/api/leave-policies', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get('/api/comp-off/my', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get('/api/on-duty/my', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      setLeaves(leavesResponse.data);
      if (quotasResponse.data) {
        setQuotas(quotasResponse.data);
      }
      if (holidaysResponse.data && Array.isArray(holidaysResponse.data)) {
        setHolidays(holidaysResponse.data);
      }
      if (policiesResponse.data && Array.isArray(policiesResponse.data)) {
        setPolicies(policiesResponse.data);
      }
      setCompOffs(compOffResponse.data || []);
      setOnDutys(onDutyResponse.data || []);
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
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const days = calculateDays(formData.startDate, formData.endDate);
      await axios.post('/api/leaves/apply', { ...formData, totalDays: days }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('Your leave request has been submitted successfully!');
      setShowSuccessScreen(true);
      setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
      fetchMyLeaves();
    } catch (err) {
      console.error('Submit failed:', err);
      toast.error('Failed to submit leave request: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDetails = () => {
    setIsModalOpen(false);
    setSelectedLeave(null);
    setIsEditing(false);
    setShowCancelInput(false);
    setCancellationReason('');
    setOpenedFromHistory(false);
    setShowSuccessScreen(false);
    setSuccessMessage('');
  };

  const handleBackToHistory = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setShowCancelInput(false);
    setCancellationReason('');
    setOpenedFromHistory(false);
    setShowSuccessScreen(false);
    setSuccessMessage('');
    setIsLeaveRequestsDrawerOpen(true);
  };

  const handleStartEdit = () => {
    if (!selectedLeave) return;
    setEditFormData({
      leaveType: selectedLeave.leaveType,
      startDate: selectedLeave.startDate.split('T')[0],
      endDate: selectedLeave.endDate.split('T')[0],
      reason: selectedLeave.reason || ''
    });
    setIsEditing(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const days = calculateDays(editFormData.startDate, editFormData.endDate);
      await axios.put(`/api/leaves/update/${selectedLeave._id}`, { ...editFormData, totalDays: days }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('Your leave request has been updated successfully!');
      setShowSuccessScreen(true);
      fetchMyLeaves();
    } catch (err) {
      console.error('Update failed:', err);
      toast.error('Failed to update leave request: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestCancellationSubmit = async () => {
    if (!cancellationReason) {
      toast.error('Please provide a reason for cancellation.');
      return;
    }
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await axios.post(`/api/leaves/request-cancellation/${selectedLeave._id}`, { cancellationReason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('Your cancellation request has been submitted successfully!');
      setShowSuccessScreen(true);
      setCancellationReason('');
      fetchMyLeaves();
    } catch (err) {
      console.error('Cancellation request failed:', err);
      toast.error('Failed to submit cancellation request: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Withdraw Leave Request',
      message: 'Are you sure you want to withdraw this leave request?',
      onConfirm: async () => {
        try {
          await axios.put(`/api/leaves/cancel/${id}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.success('Leave request withdrawn.');
          handleCloseDetails();
          fetchMyLeaves();
        } catch (err) {
          console.error('Cancel failed:', err);
          toast.error('Failed to withdraw request: ' + (err.response?.data?.message || err.message));
        }
      }
    });
  };

  const approvedLeaves = leaves.filter(l => l.status === 'approved');

  const usedEarned = approvedLeaves.filter(l => l.leaveType === 'earned').reduce((acc, curr) => acc + (curr.totalDays || 0), 0);
  const usedSick = approvedLeaves.filter(l => l.leaveType === 'sick').reduce((acc, curr) => acc + (curr.totalDays || 0), 0);
  const usedCasual = approvedLeaves.filter(l => l.leaveType === 'casual').reduce((acc, curr) => acc + (curr.totalDays || 0), 0);

  const sickBalance = Math.max(0, QUOTAS.sick - usedSick);
  const annualBalance = Math.max(0, QUOTAS.earned - usedEarned);

  const clAllowance = policies.find(p => p.type === 'casual' || p.name?.toLowerCase().includes('casual'))?.annualAllowance ?? 12;
  const slAllowance = policies.find(p => p.type === 'sick' || p.name?.toLowerCase().includes('sick'))?.annualAllowance ?? 10;
  const elAllowance = policies.find(p => p.type === 'earned' || p.name?.toLowerCase().includes('earned'))?.annualAllowance ?? 20;
  const cfEarned = policies.find(p => p.type === 'earned' || p.name?.toLowerCase().includes('earned'))?.carryForwardLimit ?? 5;

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
    const isHoliday = holidays.some(h => {
      if (!h || !h.date || h.isActive === false) return false;
      const hDate = new Date(h.date);
      if (isNaN(hDate.getTime())) return false;
      return hDate.getDate() === day.date && hDate.getMonth() === currentMonth;
    });
    if (isHoliday) return 'holiday';

    // Check leaves
    const dayStr = dateObj.toISOString().split('T')[0];
    const leaveForDay = leaves.find(l => {
      if (!l || !l.startDate || !l.endDate) return false;
      const sDate = new Date(l.startDate);
      const eDate = new Date(l.endDate);
      if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return false;
      const s = sDate.toISOString().split('T')[0];
      const e = eDate.toISOString().split('T')[0];
      return dayStr >= s && dayStr <= e;
    });

    if (leaveForDay) {
      if (leaveForDay.status === 'approved') return 'approved';
      if (leaveForDay.status === 'pending') return 'pending';
    }
    return null;
  };

  const getDayTooltip = (day) => {
    if (!day.isCurrentMonth) return '';
    const dateObj = new Date(currentYear, currentMonth, day.date);
    if (dateObj.getDay() === 0) return 'Weekly Off';

    const matchingHoliday = holidays.find(h => {
      if (!h || !h.date || h.isActive === false) return false;
      const hDate = new Date(h.date);
      if (isNaN(hDate.getTime())) return false;
      return hDate.getDate() === day.date && hDate.getMonth() === currentMonth;
    });
    if (matchingHoliday) {
      return `Holiday\n${matchingHoliday.name || matchingHoliday.title || 'Holiday'}`;
    }

    const dayStr = dateObj.toISOString().split('T')[0];
    const leaveForDay = leaves.find(l => {
      if (!l || !l.startDate || !l.endDate) return false;
      const sDate = new Date(l.startDate);
      const eDate = new Date(l.endDate);
      if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return false;
      const s = sDate.toISOString().split('T')[0];
      const e = eDate.toISOString().split('T')[0];
      return dayStr >= s && dayStr <= e;
    });

    if (leaveForDay) {
      const type = leaveForDay.leaveType?.replace(/([A-Z])/g, ' $1').trim() || leaveForDay.type || 'Leave';
      const statusText = leaveForDay.status.charAt(0).toUpperCase() + leaveForDay.status.slice(1);
      const reasonText = leaveForDay.reason ? `\nReason: ${leaveForDay.reason}` : '';
      return `${statusText} Leave\nType: ${type} Leave${reasonText}`;
    }
    return '';
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-orange-100 text-orange-700';
      case 'cancellation_pending': return 'bg-red-100 text-red-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#08100e] text-[#3b3e3c] dark:text-[#cbd5e1] font-['Inter',sans-serif] px-0 pt-0 pb-6 lg:px-1 lg:pt-0 lg:pb-6 transition-colors duration-300">

      {/* 1. Header Section */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Leave Manage</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button onClick={() => setIsCompOffModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-xs font-bold flex items-center gap-1 transition-colors">
              <Plus size={14} /> Comp-Off
            </button>
          </div>

          <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button onClick={() => setIsOnDutyModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-xs font-bold flex items-center gap-1 transition-colors">
              <Plus size={14} /> On Duty
            </button>
          </div>

          <button onClick={() => setIsRequestModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition-colors whitespace-nowrap ml-2">
            <Plus size={16} /> Apply for Leave
          </button>
        </div>
      </div>

      {/* 2. Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {[
          { title: 'Total Leave Balance', value: totalBalance, unit: 'Days', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100', hoverBorder: 'hover:border-purple-500 hover:shadow-purple-500/5', link: 'View Details' },
          { title: 'Active Leave Types', value: activeLeaveTypesCount, unit: '', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', hoverBorder: 'hover:border-green-500 hover:shadow-green-500/5', link: 'View Types' },
          { title: 'Total Leave Allocated', value: totalAllocated, unit: 'Days', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-100', hoverBorder: 'hover:border-purple-500 hover:shadow-purple-500/5', link: 'View Allocation' },
          { title: 'Leaves Taken (YTD)', value: totalUsed, unit: 'Days', icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-100', hoverBorder: 'hover:border-blue-500 hover:shadow-blue-500/5', link: 'View Report' },
          { title: 'Pending Requests', value: pendingCount, unit: pendingCount === 1 ? 'Request' : 'Requests', icon: User, color: 'text-orange-600', bg: 'bg-orange-100', hoverBorder: 'hover:border-orange-500 hover:shadow-orange-500/5', link: 'View Requests' }
        ].map((card, idx) => (
          <div key={idx} className={`bg-white dark:bg-[#111c18] p-3.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all group ${card.hoverBorder}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.bg} group-hover:scale-110 transition-transform duration-200`}>
                <card.icon size={16} className={card.color} />
              </div>
              <div className="min-w-0 relative group">
                <h3 className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate cursor-help">{card.title}</h3>
                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block z-50 bg-gray-900 dark:bg-gray-750 text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap pointer-events-none uppercase tracking-wider">
                  {card.title}
                </div>
              </div>
            </div>
            <div className="flex items-baseline shrink-0 ml-2">
              <span className="text-xl font-black text-gray-900 dark:text-white mr-1 leading-none">{card.value}</span>
              {card.unit && <span className="text-[9px] font-bold text-gray-400 leading-none">{card.unit}</span>}
            </div>
          </div>
        ))}
        <ViewPolicyDrawer isOpen={isPolicyDrawerOpen} onClose={() => setIsPolicyDrawerOpen(false)} />
        <ViewHolidaysDrawer isOpen={isHolidaysDrawerOpen} onClose={() => setIsHolidaysDrawerOpen(false)} />
        <ViewUpcomingLeavesDrawer isOpen={isUpcomingLeavesDrawerOpen} onClose={() => setIsUpcomingLeavesDrawerOpen(false)} leaves={leaves} />
        <ViewLeaveRequestsDrawer 
          isOpen={isLeaveRequestsDrawerOpen} 
          onClose={() => setIsLeaveRequestsDrawerOpen(false)} 
          leaves={leaves} 
          onSelectLeave={(l) => {
            setSelectedLeave(l);
            setOpenedFromHistory(true);
            setIsLeaveRequestsDrawerOpen(false);
            setIsModalOpen(true);
          }}
        />
      </div>

      {/* 3. Two-Column Section: Balance & Calendar (70/30 Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-4 items-stretch">

        {/* Leave Balance Summary */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111c18] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 flex flex-col justify-start gap-2 transition-all duration-200 hover:border-emerald-500">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Leave Balance Summary</h2>
              <p className="text-[10px] text-gray-500 mt-1">As on {refDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 dark:bg-[#162722]">
                <tr>
                  <th className="px-4 py-2 rounded-l-lg">Leave Type</th>
                  <th className="px-4 py-2 text-center">Balance</th>
                  <th className="px-4 py-2 text-center">Used</th>
                  <th className="px-4 py-2 text-center rounded-r-lg">Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Casual Leave (CL)', balance: QUOTAS.casual - usedCasual, used: usedCasual, total: QUOTAS.casual, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
                  { name: 'Sick Leave (SL)', balance: sickBalance, used: usedSick, total: QUOTAS.sick, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
                  { name: 'Earned Leave (EL)', balance: annualBalance, used: usedEarned, total: QUOTAS.earned, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-100' },
                  { name: 'Optional Holiday (OH)', balance: QUOTAS.optionalHoliday, used: 0, total: QUOTAS.optionalHoliday, icon: FileText, color: 'text-pink-600', bg: 'bg-pink-100' }
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-[#162722]/50 transition-all duration-150 cursor-pointer">
                    <td className="px-4 py-2 flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${row.bg}`}>
                        <row.icon size={14} className={row.color} />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-200">{row.name}</span>
                    </td>
                    <td className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-200">{row.balance}</td>
                    <td className="px-4 py-2 text-center font-medium text-gray-500">{row.used}</td>
                    <td className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-200">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leave Calendar */}
        <div className="lg:col-span-3 bg-white dark:bg-[#111c18] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 flex flex-col justify-between transition-all duration-200 hover:border-indigo-500">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Leave Calendar</h2>
          </div>

          <div className="flex justify-between items-center mb-2">
            <button onClick={() => setRefDate(new Date(currentYear, currentMonth - 1, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <ChevronLeft size={18} />
            </button>
            <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">
              {refDate.toLocaleString('default', { month: 'long' })} {currentYear}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setRefDate(new Date())} className="text-[9px] font-bold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded hover:bg-gray-200">Today</button>
              <button onClick={() => setRefDate(new Date(currentYear, currentMonth + 1, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-[9px] font-bold text-gray-400 py-0.5">{day}</div>
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
                dot = <div className="w-1 h-1 rounded-full bg-green-500"></div>;
              } else if (status === 'pending') {
                dot = <div className="w-1 h-1 rounded-full bg-orange-500"></div>;
              } else if (status === 'holiday') {
                dot = <div className="w-1 h-1 rounded-full bg-purple-500"></div>;
              } else if (status === 'weekly-off') {
                dot = <div className="w-1 h-1 rounded-full bg-gray-300"></div>;
              }

              if (isToday) {
                textClass = "text-red-500 font-bold";
                bgClass = "border border-red-200 dark:border-red-900/50";
              }

              return (
                <div
                  key={idx}
                  title={getDayTooltip(day)}
                  className={`aspect-square flex flex-col items-center justify-between py-1 rounded-lg text-[11px] cursor-pointer transition-colors ${bgClass} ${textClass}`}
                >
                  <span className="w-full flex-1 flex items-center justify-center">{day.date}</span>
                  <div className="w-full h-1.5 flex items-center justify-center mb-0.5">
                    {dot}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-[9px] text-gray-500 font-medium">
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Approved</div>
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Pending</div>
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Holiday</div>
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> Weekly Off</div>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Section: Upcoming Leaves & Policy (30/70 Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-4 items-stretch">

        {/* My Upcoming Leaves */}
        <div className="lg:col-span-3 bg-white dark:bg-[#111c18] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col justify-between transition-all duration-200 hover:border-orange-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">My Upcoming Leaves</h2>
            <button onClick={() => setIsUpcomingLeavesDrawerOpen(true)} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">View All</button>
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
        <div className="lg:col-span-7 bg-white dark:bg-[#111c18] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 transition-all duration-200 hover:border-purple-500">
          <div className="flex justify-between items-center mb-3.5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Leave Policy</h2>
            <button onClick={() => setIsPolicyDrawerOpen(true)} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">View Full Policy</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="py-2 px-3 border border-gray-100 dark:border-gray-850 hover:border-purple-500 dark:hover:border-purple-500 transition-colors rounded-xl flex items-center gap-3 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Calendar size={14} />
              </div>
              <div>
                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Annual Leave Allocation</h4>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mt-0.5">
                  CL: {clAllowance} | SL: {slAllowance} | EL: {elAllowance} <span className="text-[9px] text-gray-400 font-normal font-sans">/ year</span>
                </p>
              </div>
            </div>
            <div className="py-2 px-3 border border-gray-100 dark:border-gray-850 hover:border-green-500 dark:hover:border-green-500 transition-colors rounded-xl flex items-center gap-3 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                <Clock size={14} />
              </div>
              <div>
                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Carry Forward</h4>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mt-0.5">
                  {cfEarned > 0 ? `Max ${cfEarned} Days` : 'Not Allowed'} <span className="text-[9px] text-gray-400 font-normal font-sans">/ year</span>
                </p>
              </div>
            </div>
            <div className="py-2 px-3 border border-gray-100 dark:border-gray-850 hover:border-orange-500 dark:hover:border-orange-500 transition-colors rounded-xl flex items-center gap-3 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <AlertCircle size={14} />
              </div>
              <div>
                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Advance Notice</h4>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mt-0.5">
                  3 Days <span className="text-[9px] text-gray-400 font-normal font-sans">(minimum)</span>
                </p>
              </div>
            </div>
            <div className="py-2 px-3 border border-gray-100 dark:border-gray-850 hover:border-pink-500 dark:hover:border-pink-500 transition-colors rounded-xl flex items-center gap-3 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                <FileText size={14} />
              </div>
              <div>
                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Medical Certificate</h4>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mt-0.5">
                  Required after 2 sick days
                </p>
              </div>
            </div>
            <div className="col-span-2 py-2 px-3 border border-gray-100 dark:border-gray-850 hover:border-blue-500 dark:hover:border-blue-500 transition-colors rounded-xl flex items-center gap-3 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} />
              </div>
              <div>
                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Max Continuous Leave</h4>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mt-0.5">
                  15 Days <span className="text-[9px] text-gray-400 font-normal font-sans">(at a time)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Two-Column Section: Requests & Holidays (70/30 Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* My Leave Requests */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111c18] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 transition-all duration-200 hover:border-blue-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">My Leave Requests</h2>
            <div className="flex items-center gap-3.5">
              <button onClick={() => setIsCompOffOnDutyDrawerOpen(true)} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer">Comp-Off / On-Duty</button>
              <button onClick={() => setIsLeaveRequestsDrawerOpen(true)} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer">View All Requests</button>
            </div>
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
                  <th className="py-1.5 px-3 font-semibold whitespace-nowrap">Leave Dates</th>
                  <th className="py-1.5 px-3 font-semibold whitespace-nowrap">Leave Type</th>
                  <th className="py-1.5 px-3 font-semibold whitespace-nowrap">Duration</th>
                  <th className="py-1.5 px-3 font-semibold whitespace-nowrap">Reason</th>
                  <th className="py-1.5 px-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="py-1.5 px-3 font-semibold text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.length > 0 ? [...filteredLeaves].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4).map((lv, idx) => (
                  <tr key={idx} onClick={() => { setSelectedLeave(lv); setIsModalOpen(true); }} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-[#162722] transition-colors cursor-pointer">
                    <td className="py-2 px-3 font-bold text-gray-900 dark:text-gray-200 min-w-[180px]">
                      {lv.startDate ? (() => {
                        const d = new Date(lv.startDate);
                        return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                      })() : 'Invalid Date'}
                      {lv.startDate !== lv.endDate && lv.endDate && (() => {
                        const d = new Date(lv.endDate);
                        return isNaN(d.getTime()) ? '' : ` - ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                      })()}
                    </td>
                    <td className="py-2 px-3 font-medium text-gray-700 dark:text-gray-300 capitalize whitespace-nowrap">{lv.leaveType} Leave</td>
                    <td className="py-2 px-3 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{lv.totalDays} {lv.totalDays === 1 ? 'Day' : 'Days'}</td>
                    <td className="py-2 px-3 text-gray-500 max-w-[200px] truncate">{lv.reason || '-'}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(lv.status)} capitalize`}>
                        {lv.status === 'cancellation_pending' ? 'Cancellation Requested' : lv.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedLeave(lv); setIsModalOpen(true); }} className="p-1 hover:bg-gray-250 rounded text-gray-500">
                        <MoreHorizontal size={16} />
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
        <div className="lg:col-span-3 bg-white dark:bg-[#111c18] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 transition-all duration-200 hover:border-pink-500">
          <div className="flex justify-between items-center mb-3.5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Upcoming Holidays</h2>
            <button onClick={() => setIsHolidaysDrawerOpen(true)} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">View Calendar</button>
          </div>
          <div className="space-y-2">
            {holidays.length > 0 ? holidays.filter(h => {
              if (!h || !h.date || h.isActive === false) return false;
              const hDate = new Date(h.date);
              return !isNaN(hDate.getTime()) && hDate >= new Date();
            }).slice(0, 5).map((h, idx) => {
              const hDate = new Date(h.date);
              const dateStr = hDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              const dayStr = hDate.toLocaleDateString('en-GB', { weekday: 'long' });
              return (
                <div key={idx} className="flex items-center justify-between py-1.5 px-3 border border-gray-100 dark:border-gray-850 rounded-xl transition-all duration-200 hover:border-purple-500 hover:bg-purple-50/20 dark:hover:bg-purple-950/10 cursor-pointer hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center shrink-0">
                      <Calendar size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 leading-tight">{dateStr}</h4>
                      <p className="text-[9px] text-gray-500 leading-none mt-0.5">{dayStr}</p>
                    </div>
                  </div>
                  <div className="font-semibold text-xs text-gray-700 dark:text-gray-300 text-right">
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

      {/* Removed Comp-Off and On Duty Requests boxes from layout */}

      {/* REQUEST LEAVE MODAL (Keeping the same form logic, just updating UI styles) */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setIsRequestModalOpen(false) }}>
          <div className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pl-8 pr-6 py-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-250 dark:border-gray-800">
            <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-6 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Request Leave</h2>
              <button type="button" onClick={() => setIsRequestModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {showSuccessScreen ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
                  <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/20 text-green-500 flex items-center justify-center mb-4 animate-bounce">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Request Submitted!</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-8">{successMessage}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuccessScreen(false);
                      setIsRequestModalOpen(false);
                    }}
                    className="w-full py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 text-xs transition-colors cursor-pointer"
                  >
                    Close Panel
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between h-full overflow-hidden">
                  <div className="overflow-y-auto pr-1 flex-1 space-y-4 pb-2">

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Leave Type</label>
                    <CustomSelect
                      value={formData.leaveType}
                      onChange={val => setFormData({ ...formData, leaveType: val })}
                      placeholder="Choose Leave Type"
                      options={[
                        { value: 'sick', label: 'Sick Leave (SL)' },
                        { value: 'casual', label: 'Casual Leave (CL)' },
                        { value: 'earned', label: 'Earned Leave (EL)' },
                        { value: 'emergency', label: 'Emergency Leave' }
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Start Date</label>
                      <CustomDatePicker
                        name="startDate"
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        placeholder="dd-mm-yyyy"
                        className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-300 dark:border-gray-600 rounded-lg h-10 flex items-center text-xs text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">End Date</label>
                      <CustomDatePicker
                        name="endDate"
                        value={formData.endDate}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        placeholder="dd-mm-yyyy"
                        align="right"
                        className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-300 dark:border-gray-600 rounded-lg h-10 flex items-center text-xs text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Reason</label>
                    <textarea
                      required
                      value={formData.reason}
                      onChange={e => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="State your reason..."
                      className="w-full min-h-[120px] bg-gray-50 dark:bg-[#0f172a] border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 resize-none text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAILS DRAWER */}
      {isModalOpen && selectedLeave && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) handleCloseDetails() }}>
          <div className="fixed right-0 top-0 bottom-0 h-full w-full max-w-sm pl-8 pr-6 py-6 bg-white dark:bg-[#1e293b] shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-6 shrink-0">
              <div className="flex items-center gap-3">
                {openedFromHistory && (
                  <button type="button" onClick={handleBackToHistory} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronLeft size={20} />
                  </button>
                )}
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isEditing ? 'Edit Leave Request' : showCancelInput ? 'Cancel Leave' : `${selectedLeave.leaveType.charAt(0).toUpperCase() + selectedLeave.leaveType.slice(1)} Leave Details`}
                </h2>
              </div>
              <button type="button" onClick={handleCloseDetails} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {showSuccessScreen ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
                  <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/20 text-green-500 flex items-center justify-center mb-4 animate-bounce">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Request Submitted!</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-8">{successMessage}</p>
                  <button
                    type="button"
                    onClick={handleCloseDetails}
                    className="w-full py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 text-xs transition-colors cursor-pointer"
                  >
                    Close Panel
                  </button>
                </div>
              ) : isEditing ? (
                <form onSubmit={handleEditSubmit} className="flex-1 flex flex-col justify-between h-full overflow-hidden">
                  <div className="overflow-y-auto pr-1 flex-1 space-y-4 pb-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
                      <CustomSelect
                        value={editFormData.leaveType}
                        onChange={val => setEditFormData({ ...editFormData, leaveType: val })}
                        placeholder="Choose Leave Type"
                        options={[
                          { value: 'sick', label: 'Sick Leave (SL)' },
                          { value: 'casual', label: 'Casual Leave (CL)' },
                          { value: 'earned', label: 'Earned Leave (EL)' },
                          { value: 'emergency', label: 'Emergency Leave' }
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                        <CustomDatePicker
                          name="startDate"
                          value={editFormData.startDate}
                          onChange={e => setEditFormData({ ...editFormData, startDate: e.target.value })}
                          placeholder="dd-mm-yyyy"
                          className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-250 dark:border-gray-700 rounded-xl h-10 flex items-center text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                        <CustomDatePicker
                          name="endDate"
                          value={editFormData.endDate}
                          onChange={e => setEditFormData({ ...editFormData, endDate: e.target.value })}
                          placeholder="dd-mm-yyyy"
                          align="right"
                          className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-250 dark:border-gray-700 rounded-xl h-10 flex items-center text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                      <textarea
                        required
                        value={editFormData.reason}
                        onChange={e => setEditFormData({ ...editFormData, reason: e.target.value })}
                        placeholder="State your reason..."
                        rows="4"
                        className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-255 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 mt-4">
                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2 rounded-xl font-bold text-gray-500 hover:text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : showCancelInput ? (
                <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
                  <div className="overflow-y-auto pr-1 flex-1 space-y-4 pb-2">
                    <div>
                       <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Reason for Cancellation</label>
                      <textarea
                        required
                        value={cancellationReason}
                        onChange={e => setCancellationReason(e.target.value)}
                        placeholder="Why do you want to cancel this approved leave? (e.g. I came to office today)"
                        rows="4"
                        className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-255 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 mt-4">
                    <button type="button" onClick={() => setShowCancelInput(false)} className="flex-1 py-2 rounded-xl font-bold text-gray-500 hover:text-gray-750 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs cursor-pointer">
                      Back
                    </button>
                    <button type="button" onClick={handleRequestCancellationSubmit} disabled={isSubmitting} className="flex-1 py-2 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
                  <div className="overflow-y-auto pr-1 flex-1 space-y-5">
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-150 dark:border-gray-800">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Start Date</label>
                        <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                          {new Date(selectedLeave.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">End Date</label>
                        <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                          {new Date(selectedLeave.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Days</label>
                        <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">{selectedLeave.totalDays} day(s)</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
                        <p className="mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(selectedLeave.status)} capitalize`}>
                            {selectedLeave.status === 'cancellation_pending' ? 'Cancellation Requested' : selectedLeave.status}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Reason</label>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-150 dark:border-gray-800">
                        {selectedLeave.reason || 'No justification provided.'}
                      </p>
                    </div>

                    {selectedLeave.status === 'cancellation_pending' && selectedLeave.cancellationReason && (
                      <div>
                        <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2 block">Cancellation Reason</label>
                        <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed p-4 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/20">
                          {selectedLeave.cancellationReason}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className={`pt-4 border-t border-gray-200 dark:border-gray-800 grid gap-3 mt-4 ${selectedLeave.status === 'pending' ? 'grid-cols-3' : selectedLeave.status === 'approved' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {selectedLeave.status === 'pending' && (
                      <>
                        <button onClick={handleStartEdit} className="w-full py-2 rounded-xl font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 transition-colors text-xs cursor-pointer whitespace-nowrap text-center">
                          Edit
                        </button>
                        <button onClick={() => handleCancel(selectedLeave._id)} className="w-full py-2 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 transition-colors text-xs cursor-pointer whitespace-nowrap text-center">
                          Withdraw
                        </button>
                      </>
                    )}
                    {selectedLeave.status === 'approved' && (
                      <button onClick={() => setShowCancelInput(true)} className="w-full py-2 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 transition-colors text-xs cursor-pointer whitespace-nowrap text-center">
                        Request Cancellation
                      </button>
                    )}
                    <button onClick={handleCloseDetails} className="w-full py-2 rounded-xl font-bold text-gray-500 hover:text-gray-705 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors text-xs cursor-pointer whitespace-nowrap text-center">
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* On Duty Modal */}
      <OnDutyRequestModal isOpen={isOnDutyModalOpen} onClose={() => setIsOnDutyModalOpen(false)} />
      <MyOnDutyRequestsModal isOpen={isMyOnDutyModalOpen} onClose={() => setIsMyOnDutyModalOpen(false)} />

      {/* Comp-Off Modals */}
      <CompOffRequestModal isOpen={isCompOffModalOpen} onClose={() => setIsCompOffModalOpen(false)} />
      <MyCompOffRequestsModal isOpen={isMyCompOffModalOpen} onClose={() => setIsMyCompOffModalOpen(false)} />

      {/* New Comp-Off & On Duty Requests Drawer */}
      <MyCompOffOnDutyRequestsDrawer
        isOpen={isCompOffOnDutyDrawerOpen}
        onClose={() => setIsCompOffOnDutyDrawerOpen(false)}
        compOffs={compOffs}
        onDutys={onDutys}
        getStatusColor={getStatusColor}
      />

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-150 dark:border-gray-800 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="flex-1 py-2 rounded-xl font-bold text-gray-500 hover:text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                }}
                className="flex-1 py-2 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 text-xs transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
