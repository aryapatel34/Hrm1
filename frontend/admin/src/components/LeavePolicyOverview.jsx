import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LeavePolicyOverview = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/leave-policies', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPolicies(res.data || []);
      } catch (err) {
        console.error('Failed to fetch policies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full transition-all duration-200 hover:border-indigo-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave Policy Overview</h2>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Policy Name</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Days</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Carry Forward</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {loading ? (
              <tr><td colSpan="3" className="text-center py-8 text-gray-400">Loading policies...</td></tr>
            ) : policies.length === 0 ? (
              <tr><td colSpan="3" className="text-center py-8 text-gray-400">No leave policies defined.</td></tr>
            ) : (
              policies.map((policy) => (
                <tr key={policy._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-4 font-bold text-gray-900 dark:text-white text-xs">{policy.name}</td>
                  <td className="px-4 py-4 text-xs font-black text-gray-900 dark:text-white text-center tabular-nums">{policy.annualAllowance || 0}</td>
                  <td className="px-4 py-4 text-xs font-bold text-gray-700 dark:text-gray-300 text-center">
                    {policy.carryForwardLimit > 0 ? `Yes (Max: ${policy.carryForwardLimit})` : 'No'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeavePolicyOverview;
