import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { LogIn, LogOut, CalendarPlus, Briefcase, Clock, FileText, User, Loader2 } from 'lucide-react';
import { startDesktopTracker, stopDesktopTracker } from '@shared/services/desktopTrackerService';
import DesktopAppRequiredModal from '@shared/components/DesktopAppRequiredModal';

const token = () => sessionStorage.getItem('token') || localStorage.getItem('token');

const QuickActionsRow = ({ role = 'admin', title = 'Quick Actions' }) => {
  const navigate = useNavigate();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(true);
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [checkInHovered, setCheckInHovered] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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
        if (att.status === 'present' && att.inTime && !att.outTime) {
          setIsCheckedIn(true);
          return;
        }
      }

      setIsCheckedIn(false);
    } catch (_) {
    } finally {
      setInitialChecking(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const t = token();
      if (!t) {
        toast.error('Session expired. Please login again.');
        setCheckInLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${t}` };

      // 1. Direct Backend Check-in (instant attendance record)
      await axios.post('/api/attendance/clock-in', {}, { headers }).catch(() => null);

      // 2. Start Desktop App Tracker
      const trackerResult = await startDesktopTracker(t);
      if (!trackerResult.success) {
        setShowTrackerModal(true);
        setCheckInLoading(false);
        return;
      }

      // 3. Start Web Work Session
      await axios.post('/api/time/start', { taskName: 'General Work' }, { headers }).catch(() => null);

      setIsCheckedIn(true);
      toast.success('Check-in successful & Desktop Tracker started!', {
        style: {
          borderRadius: '12px',
          background: '#1c1917',
          color: '#fff',
          border: '1px solid #00a76b',
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
      if (!t) return;
      const headers = { Authorization: `Bearer ${t}` };

      // 1. Stop Desktop Tracker
      const trackerResult = await stopDesktopTracker();
      if (!trackerResult.success) {
        toast.error(trackerResult.message || 'Please close/stop the Desktop Tracker application first to check out.', {
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

      try {
        await axios.put('/api/attendance/clock-out', {}, { headers });
      } catch (_) {}

      try {
        await axios.post('/api/time/stop', {}, { headers });
      } catch (_) {}

      setIsCheckedIn(false);
      toast.success('Check-out successful & Desktop Tracker stopped!', {
        style: {
          borderRadius: '12px',
          background: '#2a0d0d',
          color: '#fff',
          border: '1px solid #ef4444',
          fontSize: '13px',
          fontWeight: '600'
        }
      });
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
    { icon: <CalendarPlus size={20} />, label: 'Apply Leave', color: '#3b82f6', border: '#3b82f6', darkBorder: '#3b82f6', bgHover: '#eff6ff', darkBgHover: 'rgba(59, 130, 246, 0.18)', to: routes.leave },
    { icon: <Briefcase size={20} />, label: 'My Tasks', color: '#8b5cf6', border: '#8b5cf6', darkBorder: '#8b5cf6', bgHover: '#f5f3ff', darkBgHover: 'rgba(139, 92, 246, 0.18)', to: routes.tasks },
    { icon: <Clock size={20} />, label: 'Time Tracker', color: '#f59e0b', border: '#f59e0b', darkBorder: '#f59e0b', bgHover: '#fffbeb', darkBgHover: 'rgba(245, 158, 11, 0.18)', to: routes.timeTracker },
    { icon: <FileText size={20} />, label: 'Payslip', color: '#ec4899', border: '#ec4899', darkBorder: '#ec4899', bgHover: '#fdf2f8', darkBgHover: 'rgba(236, 72, 153, 0.18)', to: routes.payroll },
    { icon: <User size={20} />, label: 'View Profile', color: '#10b981', border: '#10b981', darkBorder: '#10b981', bgHover: '#ecfdf5', darkBgHover: 'rgba(16, 185, 129, 0.18)', to: routes.profile },
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
            onMouseEnter={() => setCheckInHovered(true)}
            onMouseLeave={() => setCheckInHovered(false)}
            disabled={checkInLoading || initialChecking}
            className="flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-2xl w-full h-14 transition-all duration-200 shadow-xs hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            style={{ 
              backgroundColor: checkInHovered ? (isDark ? 'rgba(239, 68, 68, 0.18)' : '#fef2f2') : (isDark ? '#151c28' : '#ffffff'),
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: checkInHovered ? '#ef4444' : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'), 
              color: '#ef4444',
              boxShadow: checkInHovered ? (isDark ? '0 0 16px rgba(239, 68, 68, 0.50)' : '0 4px 12px rgba(239, 68, 68, 0.20)') : 'none'
            }}
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
            onMouseEnter={() => setCheckInHovered(true)}
            onMouseLeave={() => setCheckInHovered(false)}
            disabled={checkInLoading || initialChecking}
            className="flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-2xl w-full h-14 transition-all duration-200 shadow-xs hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            style={{ 
              backgroundColor: checkInHovered ? (isDark ? 'rgba(16, 185, 129, 0.18)' : '#f0fdf4') : (isDark ? '#151c28' : '#ffffff'),
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: checkInHovered ? (isDark ? '#10b981' : '#00a76b') : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'), 
              color: '#00a76b',
              boxShadow: checkInHovered ? (isDark ? '0 0 16px rgba(16, 185, 129, 0.50)' : '0 4px 12px rgba(16, 185, 129, 0.20)') : 'none'
            }}
          >
            {checkInLoading ? <Loader2 size={20} className="animate-spin shrink-0" /> : <LogIn size={20} className="shrink-0" />}
            <span className="text-xs font-bold whitespace-nowrap">
              {checkInLoading ? 'Checking In...' : 'Check In'}
            </span>
          </button>
        )}

        {/* Other Quick Action Buttons */}
        {actions.map((act, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => navigate(act.to)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-2xl w-full h-14 transition-all duration-200 shadow-xs hover:-translate-y-0.5 cursor-pointer"
              style={{ 
                backgroundColor: isHovered ? (isDark ? act.darkBgHover : act.bgHover) : (isDark ? '#151c28' : '#ffffff'),
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: isHovered ? (isDark ? act.darkBorder : act.border) : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'), 
                color: act.color,
                boxShadow: isHovered ? (isDark ? `0 0 16px ${act.darkBorder}60` : `0 4px 12px ${act.color}25`) : 'none'
              }}
            >
              <span className="shrink-0">{act.icon}</span>
              <span className="text-xs font-bold whitespace-nowrap">{act.label}</span>
            </button>
          );
        })}
      </div>

      <DesktopAppRequiredModal
        isOpen={showTrackerModal}
        onClose={() => setShowTrackerModal(false)}
        onRetry={handleCheckIn}
        token={token()}
        isRetrying={checkInLoading}
      />
    </div>
  );
};

export default QuickActionsRow;
