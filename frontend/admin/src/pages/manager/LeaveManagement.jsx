import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ClipboardList, Users, CalendarDays, PieChart, TrendingUp } from 'lucide-react';

import PendingApprovalQueue from '../../components/manager/PendingApprovalQueue';
import EmployeeAvailabilityChart from '../../components/manager/EmployeeAvailabilityChart';
import TeamLeaveCalendar from '../../components/manager/TeamLeaveCalendar';
import TeamLeaveBalance from '../../components/manager/TeamLeaveBalance';
import LeaveAnalyticsCharts from '../../components/manager/LeaveAnalyticsCharts';
import QuickActions from '../../components/manager/QuickActions';

const LeaveManagement = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/leaves/manager/summary', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setStats(res.data);
    } catch (error) {
      toast.error('Failed to load leave summary stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Management Dashboard</h1>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        
        {/* Pending Approvals */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">Pending Approvals</span>
          </div>
          <div className="flex items-end gap-2 mt-2 mb-4">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.pending || 0}</span>
            <span className="text-sm font-medium text-gray-500 mb-1">Requests</span>
          </div>
          <button className="text-indigo-600 text-sm font-bold hover:underline self-start">View all &rarr;</button>
        </div>

        {/* Employees On Leave Today */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">Employees On Leave Today</span>
          </div>
          <div className="flex items-end gap-2 mt-2 mb-4">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.onLeaveToday || 0}</span>
            <span className="text-sm font-medium text-gray-500 mb-1">Employees</span>
          </div>
          <button className="text-indigo-600 text-sm font-bold hover:underline self-start">View details &rarr;</button>
        </div>

        {/* Upcoming Leaves */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">Upcoming Leaves</span>
              <span className="text-xs text-gray-500">(Next 7 Days)</span>
            </div>
          </div>
          <div className="flex items-end gap-2 mt-2 mb-4">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.upcoming || 0}</span>
            <span className="text-sm font-medium text-gray-500 mb-1">Employees</span>
          </div>
          <button className="text-indigo-600 text-sm font-bold hover:underline self-start">View details &rarr;</button>
        </div>

        {/* Team Availability */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">Team Availability</span>
          </div>
          <div className="mt-2 mb-4">
            <div className="flex items-end gap-1 mb-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.availabilityPercent || 0}</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white mb-1">%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-1">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${stats?.availabilityPercent || 0}%` }}></div>
            </div>
            <span className="text-xs text-gray-500 font-medium">{stats?.availableCount || 0} Available</span>
          </div>
        </div>

        {/* This Month Requests */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">This Month<br/>Leave Requests</span>
          </div>
          <div className="mt-2 mb-2">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.thisMonthRequests || 0}</span>
              <span className="text-sm font-medium text-gray-500 mb-1">Requests</span>
            </div>
            <div className="flex items-center mt-1">
              <TrendingUp className={`w-3 h-3 ${stats?.growth >= 0 ? 'text-emerald-500' : 'text-red-500'} mr-1`} />
              <span className={`text-xs font-bold ${stats?.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {Math.abs(stats?.growth || 0)}% {stats?.growth >= 0 ? 'more' : 'less'} than last month
              </span>
            </div>
          </div>
          <button className="text-indigo-600 text-sm font-bold hover:underline self-start">View details &rarr;</button>
        </div>

      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        
        {/* Left Column (2/3 width) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <PendingApprovalQueue onAction={triggerRefresh} />
        </div>

        {/* Right Column (1/3 width) */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <EmployeeAvailabilityChart trigger={refreshTrigger} />
        </div>

      </div>

      {/* Calendar and Balances Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <TeamLeaveCalendar />
        <TeamLeaveBalance />
      </div>

      {/* Analytics Charts */}
      <LeaveAnalyticsCharts />

      {/* Quick Actions */}
      <QuickActions />

    </div>
  );
};

export default LeaveManagement;
