import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowRight } from 'lucide-react';
// We would ideally use Recharts or Chart.js here, but we will create a simple visual donut using CSS conic-gradient
// to minimize external dependencies while achieving the look of the design.

const LeaveAllocationSummary = () => {
  const [allocationData, setAllocationData] = useState([]);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('this_month');
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/hr-dashboard/leave-allocations?filter=${filter}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.success) {
          setAllocationData(res.data.data);
          setTotalDays(res.data.totalDays);
        }
      } catch (err) {
        console.error('Failed to fetch allocations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, filter]);

  // Construct conic-gradient string
  let cumulativePercent = 0;
  const gradientStops = allocationData.map(item => {
    const percent = totalDays > 0 ? (item.value / totalDays) * 100 : 0;
    const stop = `${item.color} ${cumulativePercent}% ${cumulativePercent + percent}%`;
    cumulativePercent += percent;
    return stop;
  });

  const donutStyle = {
    background: `conic-gradient(${gradientStops.length > 0 ? gradientStops.join(', ') : '#e5e7eb 0% 100%'})`,
    borderRadius: '50%',
    position: 'relative'
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave Allocation Summary</h2>
        <select 
          className="text-xs font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="last_2_months">Last 2 Months</option>
          <option value="this_year">This Year</option>
        </select>
      </div>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8">
        {/* Donut Chart visual */}
        <div className="w-48 h-48 flex-shrink-0 flex items-center justify-center shadow-inner" style={donutStyle}>
          {/* Inner hole */}
          <div className="w-32 h-32 bg-white dark:bg-[#1e293b] rounded-full flex flex-col items-center justify-center z-10 shadow-sm border border-gray-50 dark:border-gray-800/50">
            <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums tracking-tight">
              {totalDays.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Total Days</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 w-full max-w-[220px]">
          {loading ? (
            <p className="text-sm text-gray-400">Loading chart data...</p>
          ) : (
            allocationData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></span>
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{item.name}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-black text-gray-900 dark:text-white tabular-nums">{item.value.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-gray-400 w-10 text-right">
                    ({totalDays > 0 ? ((item.value / totalDays) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <button className="mt-6 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all w-max">
        View Allocation Report <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default LeaveAllocationSummary;
