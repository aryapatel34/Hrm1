import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X, Check, XCircle } from 'lucide-react';

const CompOffApprovalModal = ({ isOpen, onClose }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/comp-off/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch comp-off requests');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleAction = async (id, action) => {
    try {
      let payload = { status: action === 'approve' ? 'approved' : 'rejected' };
      if (action === 'reject') {
        const reason = prompt('Reason for rejection?');
        if (reason === null) return;
        payload.rejectionReason = reason;
      }
      
      await axios.put(`/api/comp-off/${id}/status`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      fetchRequests();
    } catch (err) {
      toast.error('Failed to update request status');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm p-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <X size={20} />
        </button>

        <div className="flex-1 flex flex-col pt-6 h-full overflow-hidden">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Comp-Off Approvals</h2>
          
          <div className="overflow-y-auto pr-1 flex-1 space-y-4">
            {loading ? (
              <div className="py-10 text-center text-gray-500">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="py-10 text-center text-gray-500 font-medium bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                No pending Comp-Off requests
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req._id} className="p-4 rounded-xl border border-gray-150 dark:border-gray-800 space-y-2 bg-gray-50 dark:bg-[#0f172a]/50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{req.employeeId?.name || req.employee || 'Employee'}</span>
                      <span className="text-xs text-gray-500">
                        {req.dateWorked ? new Date(req.dateWorked).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{req.reason}</p>
                    <div className="flex justify-end gap-2 pt-2">
                      {req.status === 'pending' ? (
                        <>
                          <button onClick={() => handleAction(req._id, 'reject')} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-1">
                            <XCircle size={14} /> Reject
                          </button>
                          <button onClick={() => handleAction(req._id, 'approve')} className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-xs font-bold flex items-center gap-1">
                            <Check size={14} /> Approve
                          </button>
                        </>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-bold rounded-lg capitalize ${
                          req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {req.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 w-full">Close</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CompOffApprovalModal;
