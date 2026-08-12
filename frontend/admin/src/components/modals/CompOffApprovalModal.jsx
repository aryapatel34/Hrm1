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
      setRequests(res.data);
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl w-full max-w-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Compensatory Off approval</h2>
        
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="py-10 text-center text-gray-500 font-medium bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            No pending Comp-Off requests
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Date Worked</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req._id} className="bg-white border-b dark:bg-[#1e293b] dark:border-gray-700">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {req.employeeId?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">{req.dateWorked}</td>
                    <td className="px-4 py-3">{req.reason}</td>
                    <td className="px-4 py-3 flex justify-end gap-2">
                      {req.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction(req._id, 'approve')}
                            className="p-1.5 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleAction(req._id, 'reject')}
                            className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-bold rounded-lg capitalize ${
                          req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {req.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CompOffApprovalModal;
