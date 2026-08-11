import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowRight } from 'lucide-react';

const EmployeeLeaveAudit = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/hr-dashboard/leave-audits', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.success) {
          setAuditLogs(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch audits:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // Derived metrics from logs
  const issuesFound = auditLogs.filter(a => a.status === 'Issues Found').length;

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Employee Leave Audit</h2>
        <button className="text-xs font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300">
          This Month ▼
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Audits Completed</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{auditLogs.filter(a => a.status === 'Completed').length}</span>
        </div>
        <div className="flex-1 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Pending Audits</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{auditLogs.filter(a => a.status === 'In Progress').length}</span>
        </div>
        <div className="flex-1 p-4 rounded-xl border border-red-100 bg-red-50 dark:bg-red-900/10 dark:border-red-900/20 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Issues Found</span>
          <span className="text-2xl font-black text-red-600 tabular-nums">{issuesFound}</span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-4">Recent Audit Activities</h3>
        <div className="space-y-4">
          {loading ? (
            <p className="text-center py-4 text-sm text-gray-400">Loading audit logs...</p>
          ) : auditLogs.length === 0 ? (
            <p className="text-center py-4 text-sm text-gray-400">No recent audit activities.</p>
          ) : (
            auditLogs.map((log, i) => (
              <div key={i} className="flex justify-between items-center group cursor-pointer">
                <div className="flex gap-3 items-center">
                  <img src={log.img} alt="Avatar" className="w-8 h-8 rounded-full" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{log.text}</p>
                    <p className="text-[10px] font-semibold text-gray-500">{log.time}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                  log.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                  log.status === 'Issues Found' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {log.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <button className="mt-6 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all w-max">
        View All Audit Logs <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default EmployeeLeaveAudit;
