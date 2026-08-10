import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TeamLeaveBalance = () => {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/leaves/manager/balances?page=${currentPage}&limit=5`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setBalances(res.data.data || []);
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.pages);
        setTotalItems(res.data.pagination.total);
      }
    } catch (err) {
      toast.error('Failed to load leave balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [currentPage]);

  const startEntry = totalItems === 0 ? 0 : (currentPage - 1) * 5 + 1;
  const endEntry = Math.min(currentPage * 5, totalItems);

  const renderProgressBar = (used, total, colorClass) => {
    const p = total > 0 ? (used / total) * 100 : 0;
    return (
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold text-gray-900 dark:text-white mb-1">{used} / {total}</span>
        <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${p}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Team Leave Balance</h2>
        <button className="text-indigo-600 text-sm font-bold hover:underline border border-indigo-100 px-3 py-1 rounded-lg">View all</button>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 text-xs text-center">
              <th className="pb-3 font-semibold text-left">Employee</th>
              <th className="pb-3 font-semibold">CL<br/><span className="text-[10px] font-normal">(Casual)</span></th>
              <th className="pb-3 font-semibold">SL<br/><span className="text-[10px] font-normal">(Sick)</span></th>
              <th className="pb-3 font-semibold">EL<br/><span className="text-[10px] font-normal">(Earned)</span></th>
              <th className="pb-3 font-semibold">CO<br/><span className="text-[10px] font-normal">(Comp Off)</span></th>
              <th className="pb-3 font-semibold">Total<br/><span className="text-[10px] font-normal">Balance</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {loading ? (
              <tr><td colSpan="6" className="py-8 text-center text-gray-500">Loading...</td></tr>
            ) : balances.length === 0 ? (
              <tr><td colSpan="6" className="py-8 text-center text-gray-500">No balances found.</td></tr>
            ) : (
              balances.map(bal => {
                const empName = bal.employeeId?.name || 'Unknown';
                let avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=random`;
                if (bal.employeeId?.profileImage) {
                  avatar = bal.employeeId.profileImage.startsWith('http') ? bal.employeeId.profileImage : `${import.meta.env.VITE_API_URL || ''}${bal.employeeId.profileImage}`;
                }

                return (
                  <tr key={bal._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 text-left">
                      <div className="flex items-center gap-3">
                        <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{empName}</span>
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      {renderProgressBar(bal.usedLeave?.casual || 0, bal.casualLeave, 'bg-green-500')}
                    </td>
                    <td className="py-4 text-center">
                      {renderProgressBar(bal.usedLeave?.sick || 0, bal.sickLeave, 'bg-blue-500')}
                    </td>
                    <td className="py-4 text-center">
                      {renderProgressBar(bal.usedLeave?.earned || 0, bal.earnedLeave, 'bg-purple-500')}
                    </td>
                    <td className="py-4 text-center">
                      {renderProgressBar(bal.usedLeave?.compOff || 0, bal.compOff, 'bg-orange-500')}
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{bal.usedLeave?.total || 0} / {bal.totalLeave || 0}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          Showing {startEntry} to {endEntry} of {totalItems} entries
        </span>
        <div className="flex gap-1">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          {Array.from({ length: totalPages }).map((_, i) => (
            <button 
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-7 h-7 rounded-md text-sm font-bold ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {i + 1}
            </button>
          ))}
          
          <button 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamLeaveBalance;
