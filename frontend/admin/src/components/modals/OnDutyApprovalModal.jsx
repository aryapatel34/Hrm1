import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X, CheckCircle, XCircle } from 'lucide-react';

const OnDutyApprovalModal = ({ isOpen, onClose }) => {
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
      const res = await axios.get('/api/on-duty/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (err) {
      toast.error('Failed to fetch on-duty requests');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status, reason = '') => {
    try {
      setLoading(true);
      await axios.put(`/api/on-duty/${id}/status`, { status, rejectionReason: reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Request ${status} successfully`);
      fetchRequests();
    } catch (err) {
      toast.error('Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl w-full max-w-4xl p-6 relative max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">On Duty Requests</h2>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {loading && requests.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No on-duty requests found.</div>
          ) : (
            requests.map(req => (
              <div key={req._id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {req.employeeId?.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize
                      ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                        req.status === 'approved' ? 'bg-green-100 text-green-700' : 
                        'bg-red-100 text-red-700'}`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    <strong>Date:</strong> {new Date(req.startDate).toLocaleDateString()} 
                    {req.startDate !== req.endDate ? ` to ${new Date(req.endDate).toLocaleDateString()}` : ''}
                    {!req.isFullDay && ` (${req.fromTime} - ${req.toTime})`}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    <strong>Reason:</strong> {req.reason}
                  </p>
                  {req.location && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Location:</strong> {req.location}
                    </p>
                  )}
                  {req.status === 'rejected' && req.rejectionReason && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <strong>Rejection Reason:</strong> {req.rejectionReason}
                    </p>
                  )}
                </div>

                {req.status === 'pending' && (
                  <div className="flex flex-row md:flex-col gap-2 justify-center">
                    <button 
                      onClick={() => handleUpdateStatus(req._id, 'approved')}
                      disabled={loading}
                      className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button 
                      onClick={() => {
                        const reason = prompt('Reason for rejection?');
                        if (reason !== null) {
                          handleUpdateStatus(req._id, 'rejected', reason);
                        }
                      }}
                      disabled={loading}
                      className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OnDutyApprovalModal;
