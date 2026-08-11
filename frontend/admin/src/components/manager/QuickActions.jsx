import React from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { CheckCircle, Users, Calendar, Clock, Download, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuickActions = () => {
  const navigate = useNavigate();

  const handleExport = async (format) => {
    try {
      const loadingToast = toast.loading(`Generating ${format.toUpperCase()} report...`);
      const response = await axios.get(`/api/leaves/manager/export?format=${format}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        responseType: 'blob', // crucial for file downloads
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `team_leaves.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      toast.dismiss(loadingToast);
      toast.success('Report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button 
          onClick={() => toast('Please select leaves from the pending queue to approve.')}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors text-sm font-bold text-gray-700 dark:text-gray-200"
        >
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          Approve Leave
        </button>

        <button 
          onClick={() => toast('Bulk approval feature coming soon.')}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors text-sm font-bold text-gray-700 dark:text-gray-200"
        >
          <Users className="w-5 h-5 text-purple-500" />
          Bulk Approval
        </button>

        <button 
          onClick={() => window.scrollTo(0, 500)}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors text-sm font-bold text-gray-700 dark:text-gray-200"
        >
          <Calendar className="w-5 h-5 text-orange-500" />
          Team Calendar
        </button>

        <button 
          onClick={() => window.scrollTo(0, 500)}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors text-sm font-bold text-gray-700 dark:text-gray-200"
        >
          <Clock className="w-5 h-5 text-blue-500" />
          Team Leave Balance
        </button>

        <button 
          onClick={() => handleExport('pdf')}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors text-sm font-bold text-gray-700 dark:text-gray-200"
        >
          <Download className="w-5 h-5 text-emerald-600" />
          Download Report
        </button>

        <button 
          onClick={() => handleExport('xlsx')}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors text-sm font-bold text-gray-700 dark:text-gray-200"
        >
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          Export to Excel
        </button>
      </div>
    </div>
  );
};

export default QuickActions;
