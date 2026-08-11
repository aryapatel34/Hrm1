import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  CheckSquare, Clock, Users, Calendar, BarChart2,
  CheckCircle2, AlertTriangle, ArrowRight, XCircle, LayoutGrid,
  FileText, Upload, RefreshCcw, HandCoins, DollarSign
} from 'lucide-react';
import LeavePolicyOverview from '../../components/LeavePolicyOverview';
import HolidayManagement from '../../components/HolidayManagement';
import LeaveAllocationSummary from '../../components/LeaveAllocationSummary';
import CompanyShutdowns from '../../components/CompanyShutdowns';
import AttendanceReconciliation from '../../components/AttendanceReconciliation';
import EmployeeLeaveAudit from '../../components/EmployeeLeaveAudit';
import LeaveDashboardHeader from '../../components/LeaveDashboardHeader';

// Modals
import CreatePolicyModal from '../../components/modals/CreatePolicyModal';
import AllocateLeaveModal from '../../components/modals/AllocateLeaveModal';
import BulkAllocationModal from '../../components/modals/BulkAllocationModal';
import AddHolidayModal from '../../components/modals/AddHolidayModal';
import CompOffApprovalModal from '../../components/modals/CompOffApprovalModal';
import LeaveEncashmentModal from '../../components/modals/LeaveEncashmentModal';

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  
  // Data refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const token = sessionStorage.getItem('token');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  // Basic stats for summary cards
  const pendingRequests = leaves.filter(l => l.status?.toLowerCase() === 'pending').length;
  const approvedLeaves = leaves.filter(l => l.status?.toLowerCase() === 'approved').length;
  const totalRequests = leaves.length;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leavesRes, statsRes] = await Promise.all([
          axios.get('/api/leaves', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/hr-dashboard/summary', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setLeaves(leavesRes.data || []);
        if (statsRes.data && statsRes.data.data) {
          setStats(statsRes.data.data.stats);
        }
      } catch (err) {
        console.error('Fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, refreshTrigger]);

  const handleDownloadReport = () => {
    if (!leaves || leaves.length === 0) {
      alert('No data available to download');
      return;
    }

    const headers = ['Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Total Days', 'Status', 'Reason'];
    const csvRows = [headers.join(',')];

    leaves.forEach(leave => {
      const empName = leave.user?.name || 'Unknown';
      const type = leave.leaveType || '';
      const start = leave.startDate ? new Date(leave.startDate).toISOString().split('T')[0] : '';
      const end = leave.endDate ? new Date(leave.endDate).toISOString().split('T')[0] : '';
      const days = leave.totalDays || 0;
      const status = leave.status || '';
      const reason = `"${(leave.reason || '').replace(/"/g, '""')}"`;

      csvRows.push([empName, type, start, end, days, status, reason].join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leave_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0b1120] text-[#1e293b] dark:text-[#cbd5e1] font-['Inter',sans-serif] px-4 pb-8 pt-2 transition-colors duration-300">

      {/* 1. HEADER */}
      <LeaveDashboardHeader userName={user.name?.split(' ')[0] || user.firstName || 'Admin'} />

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Leave Requests', val: totalRequests, sub: 'This Month', icon: CheckSquare, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', link: 'View All Requests' },
          { label: 'Pending Approvals', val: pendingRequests, sub: 'Requests', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', link: 'View Pending' },
          { label: 'Employees On Leave', val: stats?.employeesOnLeave || 0, sub: 'Today', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', link: 'View Calendar' },
          { label: 'Leave Balance Allocated', val: (stats?.leaveBalanceAllocated || 0).toLocaleString(), sub: 'Days', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', link: 'View Allocation' },
          { label: 'Upcoming Holidays', val: stats?.upcomingHolidays || 0, sub: 'In Next 30 Days', icon: Calendar, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', link: 'View Holidays' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1e293b] p-5 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{stat.val}</h3>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{stat.sub}</p>
            </div>
            <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all">
              {stat.link} <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* 3. ROW 1: Policy Overview + Allocation Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LeavePolicyOverview />
        <LeaveAllocationSummary />
      </div>

      {/* 4. ROW 2: Holiday Management + Shutdown Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <HolidayManagement refreshTrigger={refreshTrigger} />
        <CompanyShutdowns />
      </div>

      {/* 5. ROW 3: 5 Quick-Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Bulk Leave Allocation', val: (stats?.quickStats?.bulkAllocationDays || 0).toLocaleString(), sub: 'Days Allocated This Month', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', link: 'View Details' },
          { label: 'Bulk Import', val: (stats?.quickStats?.importedEmployees || 0).toLocaleString(), sub: 'Employees Imported This Month', icon: Upload, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', link: 'View Import Status' },
          { label: 'Leave Adjustments', val: (stats?.quickStats?.leaveAdjustments || 0).toLocaleString(), sub: 'Adjustments Made This Month', icon: RefreshCcw, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', link: 'View Adjustments' },
          { label: 'Comp-Off Management', val: (stats?.quickStats?.compOffsApproved || 0).toLocaleString(), sub: 'Comp-Offs Approved This Month', icon: HandCoins, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', link: 'View Comp-Offs' },
          { label: 'Leave Encashment', val: (stats?.quickStats?.encashmentsPending || 0).toLocaleString(), sub: 'Requests Pending This Month', icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', link: 'View Requests' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1e293b] p-5 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="flex flex-col gap-1 mb-4">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{stat.val}</h3>
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 max-w-[120px] leading-tight">{stat.sub}</p>
            </div>
            <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all">
              {stat.link} <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* 6. ROW 4: Attendance Reconciliation + Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AttendanceReconciliation />
        <EmployeeLeaveAudit />
      </div>

      {/* 7. ROW 5: Quick Actions Row */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 ml-1">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {[
            { label: 'Create Policy', icon: FileText, color: 'text-purple-500', onClick: () => setActiveModal('createPolicy') },
            { label: 'Allocate Leave', icon: ArrowRight, color: 'text-green-500', onClick: () => setActiveModal('allocateLeave') },
            { label: 'Bulk Allocation', icon: Upload, color: 'text-blue-500', onClick: () => setActiveModal('bulkAllocation') },
            { label: 'Add Holiday', icon: Calendar, color: 'text-pink-500', onClick: () => setActiveModal('addHoliday') },
            { label: 'Comp-Off Approval', icon: HandCoins, color: 'text-emerald-500', onClick: () => setActiveModal('compOff') },
            { label: 'Leave Encashment', icon: DollarSign, color: 'text-red-500', onClick: () => setActiveModal('leaveEncashment') },
            { label: 'Download Report', icon: Upload, color: 'text-indigo-500', isRotate: true, onClick: handleDownloadReport }
          ].map((action, i) => (
            <button key={i} onClick={action.onClick} className="bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-4 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-3 shadow-sm group">
              <div className={`p-3 rounded-xl bg-gray-50 dark:bg-[#0f172a] ${action.color} group-hover:scale-110 transition-transform`}>
                <action.icon size={20} className={action.isRotate ? "rotate-180" : ""} />
              </div>
              <span className="text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <CreatePolicyModal isOpen={activeModal === 'createPolicy'} onClose={() => setActiveModal(null)} onSuccess={() => {}} />
      <AllocateLeaveModal isOpen={activeModal === 'allocateLeave'} onClose={() => setActiveModal(null)} />
      <BulkAllocationModal isOpen={activeModal === 'bulkAllocation'} onClose={() => setActiveModal(null)} />
      <AddHolidayModal isOpen={activeModal === 'addHoliday'} onClose={() => setActiveModal(null)} onSuccess={triggerRefresh} />
      <CompOffApprovalModal isOpen={activeModal === 'compOff'} onClose={() => setActiveModal(null)} />
      <LeaveEncashmentModal isOpen={activeModal === 'leaveEncashment'} onClose={() => setActiveModal(null)} />

    </div>
  );
};

export default Leaves;
