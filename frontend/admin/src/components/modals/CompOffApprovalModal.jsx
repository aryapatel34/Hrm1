import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X, Check, XCircle } from 'lucide-react';

const CompOffApprovalModal = ({ isOpen, onClose }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Mocking fetch for comp-off requests since there might not be a specific API yet
      setTimeout(() => {
        setRequests([
          { _id: '1', employee: 'John Doe', dateWorked: '2023-10-14', reason: 'Weekend Server Maintenance', status: 'pending' },
          { _id: '2', employee: 'Jane Smith', dateWorked: '2023-10-15', reason: 'Emergency Client Meeting', status: 'pending' }
        ]);
        setLoading(false);
      }, 800);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = async (id, action) => {
    try {
      // Simulate API call
      setRequests(requests.filter(r => r._id !== id));
      toast.success(`Comp-Off request ${action}ed`);
    } catch (err) {
      toast.error(`Failed to ${action} request`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl w-full max-w-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Comp-Off Approvals</h2>
        
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
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{req.employee}</td>
                    <td className="px-4 py-3">{req.dateWorked}</td>
                    <td className="px-4 py-3">{req.reason}</td>
                    <td className="px-4 py-3 flex justify-end gap-2">
                      <button onClick={() => handleAction(req._id, 'approve')} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors" title="Approve">
                        <Check size={16} />
                      </button>
                      <button onClick={() => handleAction(req._id, 'reject')} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors" title="Reject">
                        <XCircle size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompOffApprovalModal;
