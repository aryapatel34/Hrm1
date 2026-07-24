import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import EmployeeLayout from './layouts/EmployeeLayout';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import TimeTracker from './pages/TimeTracker';
import useAuthStore from '@shared/store/authStore';
import EmployeeDocuments from './pages/EmployeeDocuments';

// Shared pages that already exist for employee role
import Chat from '@shared/pages/Chat';
import AttendanceDashboard from '@shared/components/AttendanceDashboard';

// ─── Lazy page stubs for existing routes ──────────────────────────────────
// These preserve the existing route structure while the new layout is applied.
// Each placeholder can be replaced with a real page later.
const PlaceholderPage = ({ title }) => (
  <div className="space-y-4 animate-slide-up">
    <div>
      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>This section is coming soon.</p>
    </div>
    <div className="glass-card p-8 flex flex-col items-center justify-center text-center" style={{ minHeight: 300 }}>
      <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center"
        style={{ background: 'var(--accent-muted)' }}>
        <span className="text-2xl">🚧</span>
      </div>
      <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Under Construction</p>
      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
        This page will be fully built soon. Check back later!
      </p>
    </div>
  </div>
);

function App() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Employee portal — all routes live inside EmployeeLayout */}
        <Route path="/employee" element={<EmployeeLayout />}>
          <Route index element={<Navigate to="/employee/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="time-tracker" element={<TimeTracker />} />
          <Route path="chat" element={<Chat />} />
          <Route path="task-management/create" element={<PlaceholderPage title="Create Task" />} />
          <Route path="task-management" element={<PlaceholderPage title="Task Management" />} />
          <Route path="profile" element={<PlaceholderPage title="My Profile" />} />
          <Route path="settings" element={<PlaceholderPage title="Settings" />} />
          <Route path="notifications" element={<PlaceholderPage title="Notifications" />} />
          <Route path="employees/view/:id" element={<PlaceholderPage title="Employee Information" />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leave" element={<PlaceholderPage title="My Leaves" />} />
          <Route path="payslips" element={<PlaceholderPage title="Payslips" />} />
          <Route path="documents" element={<EmployeeDocuments />} />
          <Route path="performance" element={<PlaceholderPage title="My Performance" />} />
          <Route path="recruitment" element={<PlaceholderPage title="Recruitment" />} />
          <Route path="reports" element={<PlaceholderPage title="Reports" />} />
        </Route>

        {/* Legacy root routes (kept for backwards compatibility) */}
        <Route path="/" element={<Navigate to="/employee/dashboard" replace />} />
        <Route path="/attendance" element={<Navigate to="/employee/attendance" replace />} />
        <Route path="/leave" element={<Navigate to="/employee/leave" replace />} />
        <Route path="/timesheet" element={<Navigate to="/employee/time-tracker" replace />} />
        <Route path="/tasks" element={<Navigate to="/employee/task-management" replace />} />
        <Route path="/files" element={<Navigate to="/employee/documents" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/employee/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
