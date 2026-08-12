import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

const AllocateLeaveModal = ({ isOpen, onClose }) => {
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    userId: '',
    leaveType: 'casual',
    days: 0,
    action: 'add'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      axios.get('/api/employees', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      }).then(res => {
        const data = res.data;
        const list = (data && typeof data === 'object') 
          ? (data.employees || data.data || (Array.isArray(data) ? data : [])) 
          : [];
        setEmployees(list);
      }).catch(err => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Dummy endpoint for now. Ideally goes to an allocation API
      await axios.post('/api/leaves/allocate', formData, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      toast.success('Leave allocated successfully');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to allocate leave');
    } finally {
      setLoading(false);
    }
  };

  console.log("LOG: employees array:", employees);
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm p-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <X size={20} />
        </button>
        
        <div className="flex-1 flex flex-col justify-between h-full pt-6">
          <div className="overflow-y-auto pr-1 flex-1 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Allocate Leave</h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Select Employee</label>
              <select 
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
                value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})}
              >
                <option value="">-- Select Target --</option>
                <option value="employees">All Employees</option>
                <option value="managers">All Managers</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
                <select 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
                  value={formData.leaveType} onChange={e => setFormData({...formData, leaveType: e.target.value})}
                >
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="earned">Earned Leave</option>
                  <option value="compOff">Comp Off</option>
                  <option value="optional">Optional Holiday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Action</label>
                <select 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
                  value={formData.action} onChange={e => setFormData({...formData, action: e.target.value})}
                >
                  <option value="add">Add</option>
                  <option value="deduct">Deduct</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Number of Days</label>
              <input 
                required type="number" min="0.5" step="0.5"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
                value={formData.days} onChange={e => setFormData({...formData, days: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700">
              {loading ? 'Allocating...' : 'Allocate'}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default AllocateLeaveModal;
