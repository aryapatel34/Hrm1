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

  const startEntry = totalItems === 0 ? 0 : (currentPage - 1) * 5 + 1;
  const endEntry = Math.min(currentPage * 5, totalItems);

  const filteredLeaves = leaves.filter(leave => {
    if (!searchTerm) return true;
    const empName = leave.user?.name || 'Unknown';
    return empName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pending Approval Queue</h2>
          <span className="text-sm font-medium text-gray-500">({totalItems})</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by employee name..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
              <th className="pb-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {loading ? (
              <tr><td colSpan="8" className="py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredLeaves.length === 0 ? (
              <tr><td colSpan="8" className="py-8 text-center text-gray-500">No pending leaves found.</td></tr>
            ) : (
              filteredLeaves.map(leave => {
                const empName = leave.user?.name || 'Unknown';
                let avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=random`;
                if (leave.user?.profileImage) {
                  avatar = leave.user.profileImage.startsWith('http') ? leave.user.profileImage : `${import.meta.env.VITE_API_URL || ''}${leave.user.profileImage}`;
                }
                
                let typeColor = 'text-gray-700 bg-gray-100';
                let typeLabel = leave.leaveType;
                if(leave.leaveType === 'earned') { typeColor = 'text-blue-700 bg-blue-50'; typeLabel = 'Earned Leave (EL)'; }
                if(leave.leaveType === 'sick') { typeColor = 'text-red-700 bg-red-50'; typeLabel = 'Sick Leave (SL)'; }
                if(leave.leaveType === 'casual') { typeColor = 'text-green-700 bg-green-50'; typeLabel = 'Casual Leave (CL)'; }
                if(leave.leaveType === 'emergency') { typeColor = 'text-orange-700 bg-orange-50'; typeLabel = 'Comp Off (CO)'; }

                return (
                  <tr key={leave._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-center text-xs">
                    <td className="py-3 text-left">
                      <div className="flex items-center gap-3">
                        <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <span className="font-bold text-gray-900 dark:text-white truncate">{empName}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-700 dark:text-gray-300 font-medium">{typeLabel}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300 font-medium">{formatDate(leave.startDate)}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300 font-medium">{formatDate(leave.endDate)}</td>
                    <td className="py-3 font-semibold text-gray-900 dark:text-white">{leave.totalDays} Day{leave.totalDays > 1 ? 's' : ''}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300 font-medium max-w-[120px] truncate" title={leave.reason}>{leave.reason}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300 font-medium">{formatDate(leave.createdAt)}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleApprove(leave._id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors" title="Approve">
                          <CheckCircle2 className="w-6 h-6" />
                        </button>
                        <button onClick={() => handleReject(leave._id)} className="p-1 text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Reject">
                          <XCircle className="w-6 h-6" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          Showing {startEntry} to {endEntry} of {totalItems} entries
        </span>
        <div className="flex gap-1">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          {Array.from({ length: totalPages }).map((_, i) => (
            <button 
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-7 h-7 rounded-md text-sm font-bold ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {i + 1}
            </button>
          ))}
          
          <button 
            disabled={currentPage === totalPages || totalPages === 0}
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
