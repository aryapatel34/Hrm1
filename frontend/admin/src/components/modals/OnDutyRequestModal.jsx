import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

const OnDutyRequestModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    isFullDay: true,
    fromTime: '',
    toTime: '',
    reason: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem('token');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast.error('Start Date, End Date, and Reason are required');
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End Date cannot be before Start Date');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post('/api/on-duty', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('On Duty request submitted successfully');
      setFormData({ startDate: '', endDate: '', isFullDay: true, fromTime: '', toTime: '', reason: '', location: '' });
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Submit On Duty Request</h2>
          
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
                <input 
                  type="date" 
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-250 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
                <input 
                  type="date" 
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-255 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="fullDay"
                checked={formData.isFullDay}
                onChange={(e) => setFormData({...formData, isFullDay: e.target.checked})}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="fullDay" className="text-xs font-bold text-gray-700 dark:text-gray-300">Full Day</label>
            </div>

            {!formData.isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">From Time</label>
                  <input 
                    type="time" 
                    value={formData.fromTime}
                    onChange={(e) => setFormData({...formData, fromTime: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">To Time</label>
                  <input 
                    type="time" 
                    value={formData.toTime}
                    onChange={(e) => setFormData({...formData, toTime: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Reason/Purpose *</label>
              <textarea 
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 resize-none outline-none text-gray-900 dark:text-white"
                rows={4}
                placeholder="E.g., Client meeting at their office"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Location (Optional)</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                placeholder="Where will you be?"
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

export default OnDutyRequestModal;
