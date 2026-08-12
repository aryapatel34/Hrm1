import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm p-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <X size={20} />
        </button>
        
        <div className="flex-1 flex flex-col justify-between h-full pt-6">
          <div className="overflow-y-auto pr-1 flex-1 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Comp-Off Approvals</h2>
            
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
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{req.employee}</span>
                      <span className="text-xs text-gray-500">{req.dateWorked}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{req.reason}</p>
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => handleAction(req._id, 'reject')} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-1">
                        <XCircle size={14} /> Reject
                      </button>
                      <button onClick={() => handleAction(req._id, 'approve')} className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-xs font-bold flex items-center gap-1">
                        <Check size={14} /> Approve
                      </button>
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
