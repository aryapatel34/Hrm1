import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

const AddHolidayModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'public', // public, optional
    description: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post('/api/holidays', formData, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      toast.success('Holiday added successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to add holiday');
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Add Holiday</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Holiday Name</label>
            <input 
              required type="text" 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
              placeholder="e.g. Diwali"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input 
                required type="date" 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
                value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Holiday Type</label>
              <select 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
                value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="public">Public Holiday</option>
                <option value="optional">Restricted / Optional</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
            <textarea 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white"
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg font-bold text-white bg-pink-600 hover:bg-pink-700">
              {loading ? 'Adding...' : 'Add Holiday'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddHolidayModal;
