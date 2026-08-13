import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const LeaveAllocationSummary = () => {
  const [allocationData, setAllocationData] = useState([]);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('this_month');
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [selectOpen, setSelectOpen] = useState(false);
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

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full transition-all duration-200 hover:border-indigo-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave Allocation Summary</h2>
        <div className="relative">
          <button
            onClick={() => setSelectOpen(!selectOpen)}
            className="flex items-center gap-1.5 text-xs font-bold bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 outline-none cursor-pointer transition-all"
          >
            {filter === 'this_month' && 'This Month'}
            {filter === 'last_month' && 'Last Month'}
            {filter === 'last_2_months' && 'Last 2 Months'}
            {filter === 'this_year' && 'This Year'}
            <ChevronDown size={14} className={`transition-transform duration-200 ${selectOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {selectOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSelectOpen(false)} />
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-800 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                {[
                  { value: 'this_month', label: 'This Month' },
                  { value: 'last_month', label: 'Last Month' },
                  { value: 'last_2_months', label: 'Last 2 Months' },
                  { value: 'this_year', label: 'This Year' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setFilter(opt.value); setSelectOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${filter === opt.value ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-6 flex-1 w-full">
        {/* Recharts Pie Donut Chart */}
        <div className="w-40 h-40 flex-shrink-0 flex items-center justify-center relative mx-auto">
          {allocationData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart width={160} height={160}>
                <Pie
                  data={allocationData}
                  cx={75}
                  cy={75}
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {allocationData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      style={{ outline: 'none' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-40 h-40 rounded-full border-4 border-dashed border-gray-250 flex items-center justify-center">
              <span className="text-xs text-gray-400">No Data</span>
            </div>
          )}

          {/* Center text hole */}
          <div className="absolute w-28 h-28 bg-white dark:bg-[#1e293b] rounded-full flex flex-col items-center justify-center pointer-events-none shadow-sm border border-gray-50 dark:border-gray-800/50">
            <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums tracking-tight">
              {hoveredSegment ? hoveredSegment.value.toLocaleString() : totalDays.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 text-center max-w-[90px] truncate">
              {hoveredSegment ? hoveredSegment.name : 'Total Days'}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 w-full max-w-[280px] mx-auto">
          {loading ? (
            <p className="text-sm text-gray-400">Loading chart data...</p>
          ) : (
            allocationData.map((item, i) => (
              <div 
                key={i} 
                className={`flex items-center justify-between gap-4 text-sm font-semibold cursor-pointer p-1.5 rounded transition-all duration-150 ${hoveredSegment?.name === item.name ? 'bg-gray-150 dark:bg-gray-800 scale-[1.02]' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                onMouseEnter={() => setHoveredSegment(item)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-700 dark:text-gray-300 w-28 text-left truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-900 dark:text-white w-6 text-right">{item.value.toLocaleString()}</span>
                  <span className="text-gray-500 w-10 text-right">
                    ({totalDays > 0 ? Math.round((item.value / totalDays) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>


    </div>
  );
};

export default LeaveAllocationSummary;
