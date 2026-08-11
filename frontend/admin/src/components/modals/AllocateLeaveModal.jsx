import React, { useState, useEffect } from 'react';
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
      axios.get('/api/users?role=employee', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      }).then(res => {
        setEmployees(res.data.users || res.data || []);
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
      toast.error('Allocation functionality is pending backend support.');
      onClose(); // close anyway since backend is pending
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Allocate Leave</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Select Employee</label>
            <select 
              required
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
              value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})}
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name} ({emp.department})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
              <select 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
                value={formData.leaveType} onChange={e => setFormData({...formData, leaveType: e.target.value})}
              >
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="earned">Earned Leave</option>
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
          
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700">
              {loading ? 'Allocating...' : 'Allocate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AllocateLeaveModal;
