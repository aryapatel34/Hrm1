import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const EmployeeAvailabilityChart = ({ trigger }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/leaves/manager/availability', {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load availability');
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, [trigger]);

  const legend = [
    { label: 'Available', color: 'bg-emerald-600', hex: '#059669', key: 'available' },
    { label: 'On Leave', color: 'bg-blue-600', hex: '#2563eb', key: 'onLeave' },
    { label: 'Work From Home', color: 'bg-purple-600', hex: '#9333ea', key: 'workFromHome' },
    { label: 'Half Day', color: 'bg-orange-500', hex: '#f97316', key: 'halfDay' },
    { label: 'Absent', color: 'bg-red-500', hex: '#ef4444', key: 'absent' }
  ];

  const total = data?.totalEmployees || 0;

  // Prepare data for recharts
  const chartData = legend.map(item => ({
    name: item.label,
    value: data ? data[item.key] : 0,
    color: item.hex
  })).filter(item => item.value > 0);

  // If no data, add a dummy slice so chart draws a gray circle
  if (chartData.length === 0) {
    chartData.push({ name: 'No Data', value: 1, color: '#e5e7eb' });
  }

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Employee Availability</h2>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading chart...</div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-6 flex-1 w-full">
          {/* Donut Chart using Recharts */}
          <div className="relative w-40 h-40 flex items-center justify-center mx-auto">
            <PieChart width={160} height={160}>
              <Pie
                data={chartData}
                cx={75}
                cy={75}
                innerRadius={55}
                outerRadius={75}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [value, name]} 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{total}</span>
              <span className="text-[10px] text-gray-500 font-medium text-center leading-tight mt-1">Total<br/>Employees</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-3 w-full max-w-[280px] mx-auto">
            {legend.map(item => {
              const val = data ? data[item.key] : 0;
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return (
                <div key={item.key} className="flex items-center justify-between gap-4 text-sm font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1.5 rounded transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-gray-700 dark:text-gray-300 w-28">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-900 dark:text-white w-6 text-right">{val}</span>
                    <span className="text-gray-500 w-10 text-right">({pct}%)</span>
                  </div>
                </div>
              );
            })}
            <button className="text-indigo-600 text-sm font-bold text-center mt-2 hover:underline w-full">
              View full details &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAvailabilityChart;
