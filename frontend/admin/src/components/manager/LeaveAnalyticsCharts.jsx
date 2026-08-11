import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LabelList } from 'recharts';

const LeaveAnalyticsCharts = () => {
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [loading1, setLoading1] = useState(true);
  const [loading2, setLoading2] = useState(true);

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const res = await axios.get('/api/leaves/manager/monthly-trend', {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        setMonthlyTrend(res.data);
      } catch (err) {
        toast.error('Failed to load monthly trend');
      } finally {
        setLoading1(false);
      }
    };

    const fetchDept = async () => {
      try {
        const res = await axios.get('/api/leaves/manager/department-analytics', {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        setDepartmentData(res.data);
      } catch (err) {
        toast.error('Failed to load department analytics');
      } finally {
        setLoading2(false);
      }
    };

    fetchTrend();
    fetchDept();
  }, []);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxMonthlyCount = Math.max(10, ...(monthlyTrend.map(d => d.count)));
  const yAxisTicks = [0, 20, 40, 60, 80];

  const maxDeptCount = Math.max(10, 60, ...(departmentData.map(d => d.count)));
  const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-indigo-600', 'bg-orange-500', 'bg-teal-500', 'bg-gray-500'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      
      {/* Monthly Leave Trend */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-[350px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Monthly Leave Trend <span className="text-gray-500 text-sm font-medium">(This Year)</span></h2>
          <button className="text-indigo-600 text-sm font-bold hover:underline border border-indigo-100 px-3 py-1 rounded-lg">View report</button>
        </div>

        {loading1 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
        ) : (
          <div className="flex-1 w-full mt-4 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} domain={[0, 'dataMax']} />
                <Tooltip 
                  cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#3b82f6', stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  name="Total Leaves"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex justify-center items-center mt-2 gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
          <span className="w-4 h-1 bg-blue-500 rounded-full"></span> Total Leaves
        </div>
      </div>

      {/* Department Leave Analytics */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-[350px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Department Leave Analytics <span className="text-gray-500 text-sm font-medium">(This Month)</span></h2>
          <button className="text-indigo-600 text-sm font-bold hover:underline border border-indigo-100 px-3 py-1 rounded-lg">View report</button>
        </div>

        {loading2 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
        ) : (
          <div className="flex-1 w-full mt-4 h-full">
            {departmentData.length === 0 ? (
              <div className="text-center text-gray-500 py-10">No department data for this month.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f3f4f6" />
                  <XAxis type="number" hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis type="category" dataKey="department" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#374151' }} width={90} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" radius={[4, 4, 4, 4]} barSize={8}>
                    {departmentData.map((entry, index) => {
                      const hexColors = ['#059669', '#2563eb', '#ef4444', '#9333ea', '#f97316', '#0d9488', '#9ca3af'];
                      return <Cell key={`cell-${index}`} fill={hexColors[index % hexColors.length]} />
                    })}
                    <LabelList dataKey="count" position="right" style={{ fontSize: '12px', fontWeight: 'bold', fill: '#374151' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default LeaveAnalyticsCharts;
