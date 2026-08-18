import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { LogIn, LogOut, CalendarPlus, Briefcase, Clock, FileText, User, Loader2 } from 'lucide-react';
import { startDesktopTracker, stopDesktopTracker } from '@shared/services/desktopTrackerService';

const token = () => sessionStorage.getItem('token') || localStorage.getItem('token');

const QuickActionsRow = ({ role = 'admin', title = 'Quick Actions' }) => {
  const navigate = useNavigate();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(false);

  const fetchStatus = async () => {
    try {
      const t = token();
      if (!t) return;
      const headers = { Authorization: `Bearer ${t}` };

      // Fetch time status and attendance in parallel for instant response
      const [timerRes, attRes] = await Promise.all([
        axios.get('/api/time/status', { headers }).catch(() => null),
        axios.get('/api/attendance/today', { headers }).catch(() => null)
      ]);

      if (timerRes?.data?.hasActiveSession || ['active', 'paused', 'idle'].includes(timerRes?.data?.status)) {
        setIsCheckedIn(true);
        return;
      }

      if (attRes?.data?.attendance) {
        const att = attRes.data.attendance;
        const hasClockedOut = Boolean((att.clockOut && att.clockOut !== '--') || att.checkOutTime);
        if ((att.checkInTime || att.clockIn) && !hasClockedOut) {
          setIsCheckedIn(true);
          return;
        }
      }

      setIsCheckedIn(false);
    } catch (e) {
      console.error('Error fetching check-in status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();

    const handleSync = () => fetchStatus();
    window.addEventListener('timerStatusChanged', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('timerStatusChanged', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const t = token();
      const headers = { Authorization: `Bearer ${t}` };

      try {
        await startDesktopTracker(t);
      } catch (_) {}

      try {
        await axios.post('/api/attendance/clock-in', {}, { headers });
      } catch (err) {
        if (err.response?.status === 400 && (err.response?.data?.message?.includes('Already clocked in') || err.response?.data?.message?.includes('already'))) {
          setIsCheckedIn(true);
          toast.success('You are currently checked in.');
          return;
        }
        throw err;
      }

      try {
        await axios.post('/api/time/start', {}, { headers });
      } catch (_) {}

      setIsCheckedIn(true);
      toast.success('Check-in successful & Desktop Tracker started!', {
        style: {
          borderRadius: '12px',
          background: '#0d2a22',
          color: '#fff',
          border: '1px solid #10b981',
          fontSize: '13px',
          fontWeight: '600'
        }
      });
      await fetchStatus();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckInLoading(true);
    try {
      const t = token();
      const headers = { Authorization: `Bearer ${t}` };

      // 1. If desktop tracker is running, open it to show the confirmation dialog
      const trackerActive = await stopDesktopTracker();
      if (trackerActive) {
        toast('Please confirm check-out in FluidHR Tracker app.', {
          icon: '⚡',
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#1c1917',
            color: '#fff',
            border: '1px solid #00a76b',
            fontSize: '13px',
            fontWeight: '600'
          }
        });
        setCheckInLoading(false);
        return;
      }

      // 2. Fallback direct checkout if app is not running
      await axios.put('/api/attendance/clock-out', {}, { headers });
      try {
        await axios.post('/api/time/stop', {}, { headers });
      } catch (_) {}

      setIsCheckedIn(false);
      toast.success('Checked out successfully!');
      await fetchStatus();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-out failed');
    } finally {
      setCheckInLoading(false);
    }
  };

  // Role based target URLs
  const getRoutes = () => {
    const prefix = role ? `/${role}` : '/admin';
    return {
      leave: `${prefix}/leave`,
      tasks: role === 'employee' ? '/employee/task-management' : `${prefix}/tasks`,
      timeTracker: `${prefix}/time-tracker`,
      payroll: role === 'employee' ? '/employee/payslips' : `${prefix}/payroll`,
      profile: `${prefix}/profile`
    };
  };

  const routes = getRoutes();

  const actions = [
    { icon: <CalendarPlus size={20} />, label: 'Apply Leave', color: '#3b82f6', border: '#bfdbfe', bgHover: '#eff6ff', to: routes.leave },
    { icon: <Briefcase size={20} />, label: 'My Tasks', color: '#8b5cf6', border: '#ddd6fe', bgHover: '#f5f3ff', to: routes.tasks },
    { icon: <Clock size={20} />, label: 'Time Tracker', color: '#f59e0b', border: '#fde68a', bgHover: '#fffbeb', to: routes.timeTracker },
    { icon: <FileText size={20} />, label: 'Payslip', color: '#ec4899', border: '#fbcfe8', bgHover: '#fdf2f8', to: routes.payroll },
    { icon: <User size={20} />, label: 'View Profile', color: '#10b981', border: '#a7f3d0', bgHover: '#ecfdf5', to: routes.profile },
  ];

  return (
    <div className="space-y-3 select-none">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Check In / Check Out Card */}
        {isCheckedIn ? (
          <button
            type="button"
            onClick={handleCheckOut}
            disabled={checkInLoading}
            className="flex items-center justify-center gap-2.5 px-3 py-2.5 bg-white dark:bg-[#0f0d0a] border rounded-2xl w-full h-14 transition-all shadow-xs hover:shadow-md cursor-pointer"
            style={{ borderColor: '#fca5a5', color: '#ef4444' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
          >
            {checkInLoading ? <Loader2 size={20} className="animate-spin shrink-0" /> : <LogOut size={20} className="shrink-0" />}
            <span className="text-xs font-bold whitespace-nowrap">
              {checkInLoading ? 'Checking Out...' : 'Check Out'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={checkInLoading}
            className="flex items-center justify-center gap-2.5 px-3 py-2.5 bg-white dark:bg-[#0f0d0a] border rounded-2xl w-full h-14 transition-all shadow-xs hover:shadow-md cursor-pointer"
            style={{ borderColor: '#86efac', color: '#00a76b' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf4'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
          >
            {checkInLoading ? <Loader2 size={20} className="animate-spin shrink-0" /> : <LogIn size={20} className="shrink-0" />}
            <span className="text-xs font-bold whitespace-nowrap">
              {checkInLoading ? 'Checking In...' : 'Check In'}
            </span>
          </button>
        )}

        {/* Other Quick Action Buttons */}
        {actions.map((act, i) => (
          <button
            key={i}
            type="button"
            onClick={() => navigate(act.to)}
            className="flex items-center justify-center gap-2.5 px-3 py-2.5 bg-white dark:bg-[#0f0d0a] border rounded-2xl w-full h-14 transition-all shadow-xs hover:shadow-md cursor-pointer"
            style={{ borderColor: act.border, color: act.color }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = act.bgHover}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
          >
            <span className="shrink-0">{act.icon}</span>
            <span className="text-xs font-bold whitespace-nowrap">{act.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsRow;
