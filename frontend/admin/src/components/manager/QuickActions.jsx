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

  const actions = [
    { label: 'Approve Leave', icon: CheckCircle, color: 'text-emerald-500', hoverBorder: 'hover:border-emerald-500', hoverText: 'hover:text-emerald-600 dark:hover:text-emerald-400', onClick: () => toast('Please select leaves from the pending queue to approve.') },
    { label: 'Bulk Approval', icon: Users, color: 'text-purple-500', hoverBorder: 'hover:border-purple-500', hoverText: 'hover:text-purple-600 dark:hover:text-purple-400', onClick: () => toast('Bulk approval feature coming soon.') },
    { label: 'Team Calendar', icon: Calendar, color: 'text-orange-500', hoverBorder: 'hover:border-orange-500', hoverText: 'hover:text-orange-600 dark:hover:text-orange-400', onClick: () => window.scrollTo({ top: 500, behavior: 'smooth' }) },
    { label: 'Team Leave Balance', icon: Clock, color: 'text-blue-500', hoverBorder: 'hover:border-blue-500', hoverText: 'hover:text-blue-600 dark:hover:text-blue-400', onClick: () => window.scrollTo({ top: 500, behavior: 'smooth' }) },
    { label: 'Download Report', icon: Download, color: 'text-emerald-600', hoverBorder: 'hover:border-emerald-600', hoverText: 'hover:text-emerald-700 dark:hover:text-emerald-450', onClick: () => handleExport('pdf') },
    { label: 'Export to Excel', icon: FileSpreadsheet, color: 'text-emerald-600', hoverBorder: 'hover:border-emerald-600', hoverText: 'hover:text-emerald-700 dark:hover:text-emerald-455', onClick: () => handleExport('xlsx') }
  ];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 ml-1">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action, i) => (
          <button 
            key={i} 
            onClick={action.onClick} 
            className={`bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-800 text-gray-700 dark:text-gray-200 py-2 px-3 rounded-xl transition-all flex items-center justify-start gap-2.5 shadow-sm group cursor-pointer ${action.hoverBorder} ${action.hoverText}`}
          >
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#0f172a] group-hover:scale-105 transition-transform shrink-0">
              <action.icon size={15} className={action.color} />
            </div>
            <span className="text-left font-black text-[11px] tracking-tight leading-none truncate w-full">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
