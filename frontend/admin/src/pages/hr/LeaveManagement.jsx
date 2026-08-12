import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  CheckSquare, Clock, Users, Calendar, BarChart2,
  CheckCircle2, AlertTriangle, ArrowRight, XCircle, LayoutGrid,
  FileText, Upload, RefreshCcw, HandCoins, DollarSign, Check
} from 'lucide-react';
import LeavePolicyOverview from '../../components/LeavePolicyOverview';
import HolidayManagement from '../../components/HolidayManagement';
import LeaveAllocationSummary from '../../components/LeaveAllocationSummary';
import CompanyShutdowns from '../../components/CompanyShutdowns';
import EmployeeLeaveAudit from '../../components/EmployeeLeaveAudit';
import LeaveDashboardHeader from '../../components/LeaveDashboardHeader';
import EmployeeLeaveManagement from '../employee/LeaveManagement';

// Modals
import CreatePolicyModal from '../../components/modals/CreatePolicyModal';
import AllocateLeaveModal from '../../components/modals/AllocateLeaveModal';
import OnDutyApprovalModal from '../../components/modals/OnDutyApprovalModal';
import AddHolidayModal from '../../components/modals/AddHolidayModal';
import CompOffApprovalModal from '../../components/modals/CompOffApprovalModal';
import LeaveEncashmentModal from '../../components/modals/LeaveEncashmentModal';

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('employee'); // 'hr' or 'employee'
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [requestFilter, setRequestFilter] = useState('pending');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [requestFilter]);

  const leaveRequestsRef = useRef(null);
  
  // Data refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const scrollToRequests = (filterType) => {
    setRequestFilter(filterType);
    if (leaveRequestsRef.current) {
      leaveRequestsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleApproveLeave = async (id) => {
    try {
      await axios.put(`/api/leaves/hr-approve/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Leave request approved successfully');
      triggerRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve leave');
    }
  };

  const handleRejectLeave = async (id) => {
    try {
      await axios.put(`/api/leaves/reject/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Leave request rejected successfully');
      triggerRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject leave');
    }
  };

  const token = sessionStorage.getItem('token');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = sessionStorage.getItem('role');

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

      {/* VIEW MODE TOGGLE */}
      <div className="flex justify-start w-full mb-2 mt-2">
        <div className="bg-white dark:bg-[#1e293b] p-1 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm inline-flex">
          <button 
            onClick={() => setViewMode('employee')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'employee' ? 'bg-[#00a76b] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
          >
            My Leaves
          </button>
          <button 
            onClick={() => setViewMode('hr')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'hr' ? 'bg-[#00a76b] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
          >
            Team Leaves ({role === 'admin' ? 'Admin' : 'HR'})
          </button>
        </div>
      </div>

      {viewMode === 'employee' ? (
        <EmployeeLeaveManagement />
      ) : (
        <>
          {/* 2. SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Leave Requests', val: totalRequests, sub: 'This Month', icon: CheckSquare, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', filter: 'all' },
              { label: 'Pending Approvals', val: pendingRequests, sub: 'Requests', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', filter: 'pending' },
              { label: 'Employees On Leave', val: stats?.employeesOnLeave || 0, sub: 'Today', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
              { label: 'Leave Balance Allocated', val: (stats?.leaveBalanceAllocated || 0).toLocaleString(), sub: 'Days', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'Upcoming Holidays', val: stats?.upcomingHolidays || 0, sub: 'In Next 30 Days', icon: Calendar, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20' }
            ].map((stat, i) => {
              const isClickable = !!stat.filter;
              return (
                <div 
                  key={i} 
                  onClick={() => isClickable && scrollToRequests(stat.filter)}
                  className={`bg-white dark:bg-[#1e293b] p-5 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm transition-all flex flex-col justify-between ${
                    isClickable 
                      ? 'cursor-pointer hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' 
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                      <stat.icon size={20} className={stat.color} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{stat.val}</h3>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{stat.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. ROW 1: Policy Overview + Allocation Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <LeavePolicyOverview />
            <LeaveAllocationSummary />
          </div>

          {/* 7. ROW 5: Quick Actions Row */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 ml-1">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
              {[
                { label: 'Create Policy', icon: FileText, color: 'text-purple-500', onClick: () => setActiveModal('createPolicy') },
                { label: 'Allocate Leave', icon: ArrowRight, color: 'text-green-500', onClick: () => setActiveModal('allocateLeave') },
                { label: 'On Duty Requests', icon: Calendar, color: 'text-blue-500', onClick: () => setActiveModal('onDutyApproval') },
                { label: 'Add Holiday', icon: Calendar, color: 'text-pink-500', onClick: () => setActiveModal('addHoliday') },
                { label: 'Compensatory Off approval', icon: HandCoins, color: 'text-emerald-500', onClick: () => setActiveModal('compOff') },
                { label: 'Leave Encashment', icon: DollarSign, color: 'text-red-500', onClick: () => setActiveModal('leaveEncashment') },
                { label: 'Download Report', icon: Upload, color: 'text-indigo-500', isRotate: true, onClick: handleDownloadReport }
              ].map((action, i) => (
                <button key={i} onClick={action.onClick} className="bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-4 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-3 shadow-sm group">
                  <div className={`p-3 rounded-xl bg-gray-50 dark:bg-[#0f172a] ${action.color} group-hover:scale-110 transition-transform`}>
                    <action.icon size={20} className={action.isRotate ? "rotate-180" : ""} />
                  </div>
                  <span className="text-center">{action.label}</span>
                </button>
              ))}
            </div>
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
                <div className="flex flex-row items-baseline gap-2 mb-4 flex-wrap">
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{stat.val}</h3>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 leading-tight">{stat.sub}</p>
                </div>
                <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all">
                  {stat.link} <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* 6. ROW 4: Audit Log + Leave Requests (30/70 Split) */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-8 items-stretch">
            <div className="lg:col-span-3 flex flex-col h-[480px]">
              <EmployeeLeaveAudit />
            </div>
            <div ref={leaveRequestsRef} className="lg:col-span-7 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-6 flex flex-col justify-between h-[480px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Employee Leave Requests</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Review, approve, or reject employee leave applications</p>
                </div>
                <div className="bg-gray-100 dark:bg-[#0f172a] p-1 rounded-lg border border-gray-200 dark:border-gray-800 flex">
                  <button 
                    onClick={() => setRequestFilter('pending')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${requestFilter === 'pending' ? 'bg-[#00a76b] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
                  >
                    Pending Approvals ({pendingRequests})
                  </button>
                  <button 
                    onClick={() => setRequestFilter('all')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${requestFilter === 'all' ? 'bg-[#00a76b] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
                  >
                    All Requests ({totalRequests})
                  </button>
                </div>
              </div>

              {leaves.filter(l => requestFilter === 'all' || l.status?.toLowerCase() === 'pending').length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 font-medium py-12">No leave requests found.</div>
              ) : (
                <>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                      <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-4 py-2 font-bold">Employee</th>
                          <th className="px-4 py-2 font-bold">Leave Type</th>
                          <th className="px-4 py-2 font-bold">Duration</th>
                          <th className="px-4 py-2 font-bold text-center">Days</th>
                          <th className="px-4 py-2 font-bold">Reason</th>
                          <th className="px-4 py-2 font-bold">Status</th>
                          {requestFilter === 'pending' && <th className="px-4 py-2 font-bold text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {leaves
                          .filter(l => requestFilter === 'all' || l.status?.toLowerCase() === 'pending')
                          .slice((currentPage - 1) * 5, currentPage * 5)
                          .map(leave => (
                            <tr key={leave._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                              <td className="px-4 py-2">
                                <div className="font-bold text-gray-900 dark:text-white">{leave.user?.name || 'Unknown'}</div>
                                <div className="text-[10px] text-gray-400">{leave.user?.email}</div>
                              </td>
                              <td className="px-4 py-2 font-semibold capitalize text-gray-700 dark:text-gray-300">
                                {leave.leaveType?.replace(/([A-Z])/g, ' $1').trim() || leave.type}
                              </td>
                              <td className="px-4 py-2 text-xs">
                                {leave.startDate && new Date(leave.startDate).toLocaleDateString('en-GB')} to{' '}
                                {leave.endDate && new Date(leave.endDate).toLocaleDateString('en-GB')}
                              </td>
                              <td className="px-4 py-2 font-bold text-gray-900 dark:text-white text-center">{leave.totalDays || 0}</td>
                              <td className="px-4 py-2 max-w-[200px] truncate text-xs" title={leave.reason}>
                                {leave.reason || '-'}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  leave.status?.toLowerCase() === 'approved' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' :
                                  leave.status?.toLowerCase() === 'pending' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' :
                                  'bg-red-50 dark:bg-red-900/20 text-red-600'
                                }`}>
                                  {leave.status}
                                </span>
                              </td>
                              {requestFilter === 'pending' && (
                                <td className="px-4 py-2 text-right">
                                  <div className="flex justify-end gap-2 flex-wrap">
                                    <button 
                                      onClick={() => handleRejectLeave(leave._id)}
                                      className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-1 border border-red-100 dark:border-red-900/30"
                                    >
                                      <XCircle size={14} /> Reject
                                    </button>
                                    <button 
                                      onClick={() => handleApproveLeave(leave._id)}
                                      className="px-2.5 py-1.5 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 transition-colors text-xs font-bold flex items-center gap-1 border border-green-100 dark:border-green-900/30"
                                    >
                                      <Check size={14} /> Approve
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination controls */}
                  {Math.ceil(leaves.filter(l => requestFilter === 'all' || l.status?.toLowerCase() === 'pending').length / 5) > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Page {currentPage} of {Math.ceil(leaves.filter(l => requestFilter === 'all' || l.status?.toLowerCase() === 'pending').length / 5)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50"
                        >
                          Prev
                        </button>
                        <button 
                          onClick={() => setCurrentPage(p => Math.min(Math.ceil(leaves.filter(l => requestFilter === 'all' || l.status?.toLowerCase() === 'pending').length / 5), p + 1))}
                          disabled={currentPage === Math.ceil(leaves.filter(l => requestFilter === 'all' || l.status?.toLowerCase() === 'pending').length / 5)}
                          className="px-3 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <CreatePolicyModal isOpen={activeModal === 'createPolicy'} onClose={() => setActiveModal(null)} onSuccess={() => {}} />
      <AllocateLeaveModal isOpen={activeModal === 'allocateLeave'} onClose={() => setActiveModal(null)} />
      <OnDutyApprovalModal isOpen={activeModal === 'onDutyApproval'} onClose={() => setActiveModal(null)} />
      <AddHolidayModal isOpen={activeModal === 'addHoliday'} onClose={() => setActiveModal(null)} onSuccess={triggerRefresh} />
      <CompOffApprovalModal isOpen={activeModal === 'compOff'} onClose={() => setActiveModal(null)} />
      <LeaveEncashmentModal isOpen={activeModal === 'leaveEncashment'} onClose={() => setActiveModal(null)} />
    </div>
  );
};

export default Leaves;
