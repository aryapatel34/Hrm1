import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Search, Filter, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const PendingApprovalQueue = ({ onAction }) => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/leaves/manager/pending?page=${currentPage}&limit=5`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setLeaves(res.data.data || []);
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.pages);
        setTotalItems(res.data.pagination.total);
      }
    } catch (err) {
      toast.error('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [currentPage]);

  useEffect(() => {
    const handleBulkApproval = async () => {
      if (!leaves || leaves.length === 0) {
        toast.error('No pending leave requests to approve.');
        return;
      }
      
      const confirmApprove = window.confirm(`Are you sure you want to approve all ${leaves.length} pending leave requests?`);
      if (!confirmApprove) return;
      
      try {
        const res = await axios.put('/api/leaves/manager/bulk-approve', { ids: leaves.map(l => l._id) }, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        toast.success(res.data.message || 'Bulk approval successful');
        fetchPending();
        if (onAction) onAction();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to perform bulk approval');
      }
    };

    window.addEventListener('trigger-bulk-approval', handleBulkApproval);
    return () => window.removeEventListener('trigger-bulk-approval', handleBulkApproval);
  }, [leaves]);

  const handleApprove = async (id) => {
    try {
      await axios.put(`/api/leaves/manager-approve/${id}`, {}, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      toast.success('Leave approved');
      fetchPending();
      if (onAction) onAction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve leave');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason === null) return;
    try {
      await axios.put(`/api/leaves/reject/${id}`, { reason }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      toast.success('Leave rejected');
      fetchPending();
      if (onAction) onAction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject leave');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const displayLeaves = leaves || [];
  const displayTotalItems = totalItems || 0;
  const displayTotalPages = totalPages || 1;

  const startEntry = displayTotalItems === 0 ? 0 : (currentPage - 1) * 5 + 1;
  const endEntry = Math.min(currentPage * 5, displayTotalItems);

  const filteredLeaves = displayLeaves.filter(leave => {
    if (!searchTerm) return true;
    const empName = leave.user?.name || 'Unknown';
    return empName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full flex flex-col transition-all duration-200 hover:border-violet-500">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pending Approval Queue</h2>
          <span className="text-sm font-medium text-gray-500">({displayTotalItems})</span>
        </div>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 text-xs text-center">
              <th className="pb-3 font-semibold text-left">Employee</th>
              <th className="pb-3 font-semibold">Leave Type</th>
              <th className="pb-3 font-semibold">From</th>
              <th className="pb-3 font-semibold">To</th>
              <th className="pb-3 font-semibold">Duration</th>
              <th className="pb-3 font-semibold">Reason</th>
              <th className="pb-3 font-semibold">Applied On</th>
              <th className="pb-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-gray-500">Loading pending requests...</td>
              </tr>
            ) : filteredLeaves.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-gray-500">No pending leaves found.</td>
              </tr>
            ) : (
              filteredLeaves.map((leave) => (
                <tr key={leave._id} className="border-b border-gray-50 dark:border-gray-850 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
                  <td className="py-2.5 text-left flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-50 to-violet-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100 shadow-sm shrink-0">
                      {leave.user?.name ? leave.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-gray-900 dark:text-white truncate">{leave.user?.name || 'Unknown'}</span>
                      <span className="text-[10px] text-gray-400 font-medium truncate">{leave.user?.email || 'No email'}</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      leave.leaveType === 'sick' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' :
                      leave.leaveType === 'casual' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' :
                      'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                    }`}>
                      {leave.leaveType}
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-500 dark:text-gray-400 font-medium">{formatDate(leave.startDate)}</td>
                  <td className="py-2.5 text-gray-500 dark:text-gray-400 font-medium">{formatDate(leave.endDate)}</td>
                  <td className="py-2.5 font-bold text-gray-900 dark:text-white">{leave.totalDays} day(s)</td>
                  <td className="py-2.5 text-gray-500 dark:text-gray-400 font-medium max-w-[150px] truncate" title={leave.reason}>{leave.reason || '-'}</td>
                  <td className="py-2.5 text-gray-400 font-medium">{formatDate(leave.createdAt)}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button 
                        onClick={() => handleApprove(leave._id)}
                        className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                        title="Approve"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleReject(leave._id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                        title="Reject"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          Showing {startEntry} to {endEntry} of {displayTotalItems} entries
        </span>
        <div className="flex gap-1">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          {Array.from({ length: displayTotalPages }).map((_, i) => (
            <button 
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-7 h-7 rounded-md text-sm font-bold ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {i + 1}
            </button>
          ))}
          
          <button 
            disabled={currentPage === displayTotalPages || displayTotalPages === 0}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalQueue;
