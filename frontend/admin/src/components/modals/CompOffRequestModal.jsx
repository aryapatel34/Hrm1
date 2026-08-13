import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

const CompOffRequestModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    dateWorked: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem('token');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dateWorked || !formData.reason) {
      toast.error('Date and Reason are required');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post('/api/comp-off', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Compensatory Off request submitted successfully');
      setFormData({ dateWorked: '', reason: '' });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed right-0 top-0 bottom-0 h-full w-full max-w-sm pl-8 pr-6 py-6 bg-white dark:bg-[#1e293b] shadow-2xl flex flex-col justify-between border-l-2 border-gray-300 dark:border-gray-800">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full transition-colors">
          <X size={20} />
        </button>

        <div className="flex-1 flex flex-col pt-6 h-full overflow-hidden">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Submit Comp-Off Request</h2>
          
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Date Worked (Holiday/Weekend) *</label>
              <input 
                type="date" 
                value={formData.dateWorked}
                onChange={(e) => setFormData({...formData, dateWorked: e.target.value})}
                className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-250 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Reason (e.g., Server Maintenance) *</label>
              <textarea 
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 resize-none outline-none text-gray-900 dark:text-white"
                rows={4}
                placeholder="Explain why you worked on this day"
                required
              />
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 mt-4">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl flex-1 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-[#00a76b] hover:bg-[#00a76b]/95 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex-1"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CompOffRequestModal;
