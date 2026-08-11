import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HolidayManagement = ({ refreshTrigger }) => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/holidays', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHolidays(res.data || []);
      } catch (err) {
        console.error('Failed to fetch holidays:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, refreshTrigger]);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Holidays</h2>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Holiday Name</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {loading ? (
              <tr><td colSpan="3" className="text-center py-8 text-gray-400">Loading holidays...</td></tr>
            ) : holidays.length === 0 ? (
              <tr><td colSpan="3" className="text-center py-8 text-gray-400">No holidays defined.</td></tr>
            ) : (
              holidays.map((holiday) => (
                <tr key={holiday._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-4 font-bold text-gray-900 dark:text-white text-xs">{holiday.name}</td>
                  <td className="px-4 py-4 text-xs font-bold text-gray-700 dark:text-gray-300">
                    {new Date(holiday.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                      holiday.type === 'Public' || holiday.type === 'National' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {holiday.type}
                    </span>
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

export default HolidayManagement;
