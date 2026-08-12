import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

const CreatePolicyModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'casual',
    annualAllowance: 0,
    carryForwardLimit: 0,
    description: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post('/api/leave-policies', formData, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      toast.success('Policy created successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to create policy');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm p-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <X size={20} />
        </button>
        
        <div className="flex-1 flex flex-col justify-between h-full pt-6">
          <div className="overflow-y-auto pr-1 flex-1 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Create Leave Policy</h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Policy Name</label>
              <input 
                required type="text" 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
              <select 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
                value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="earned">Earned Leave</option>
                <option value="maternity">Maternity Leave</option>
                <option value="paternity">Paternity Leave</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Annual Allowance (Days)</label>
                <input 
                  required type="number" min="0" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
                  value={formData.annualAllowance} onChange={e => setFormData({...formData, annualAllowance: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Carry Forward Limit</label>
                <input 
                  required type="number" min="0" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
                  value={formData.carryForwardLimit} onChange={e => setFormData({...formData, carryForwardLimit: e.target.value})} 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
              <textarea 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700">
              {loading ? 'Creating...' : 'Create Policy'}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default CreatePolicyModal;
