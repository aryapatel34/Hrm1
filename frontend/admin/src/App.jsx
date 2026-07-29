import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};
import { Toaster } from 'react-hot-toast';
import Login from '@shared/pages/Login';
import ForgotPassword from '@shared/pages/ForgotPassword';
import ResetPassword from '@shared/pages/ResetPassword';

import AdminDashboard from './pages/admin/AdminDashboard';
import HRDashboard from './pages/hr/HRDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import Employees from './pages/admin/Employees';
import EmployeeForm from './pages/admin/EmployeeForm';
import EmployeeDetail from './pages/admin/EmployeeDetail';
import Tasks from './pages/admin/Tasks';
import Attendance from './pages/Attendance';

import HRTasks from './pages/hr/HRTasks';
import LeaveManagement from './pages/hr/LeaveManagement';
import TeamManagement from './pages/hr/TeamManagement';
import HREmployees from './pages/hr/HREmployees';
import EmployeeLeave from './pages/employee/LeaveManagement';
import EmployeePayslips from './pages/employee/EmployeePayslips';
import EmployeeDocuments from './pages/employee/EmployeeDocuments';
import EmployeePerformance from './pages/employee/EmployeePerformance';
import Payroll from './pages/Payroll';
import ManagerTasks from './pages/manager/ManagerTasks';
import Performance from './pages/Performance';
import Reports from './pages/Reports';
import Recruitment from './pages/Recruitment';
import Training from './pages/Training';
import Settings from './pages/admin/Settings';
import Departments from './pages/Departments';
import Designations from './pages/Designations';
import RolesPermissions from './pages/admin/RolesPermissions';
import AuditLogs from './pages/admin/AuditLogs';
import Integrations from './pages/admin/Integrations';
import CreateUser from './pages/admin/CreateUser';
import MainLayout from '@shared/layouts/MainLayout';
import Profile from '@shared/pages/Profile';
import ProjectManagement from './pages/hr/ProjectManagement';
import ManagerProjects from './pages/manager/ManagerProjects';
import EmployeeProjects from './pages/employee/EmployeeProjects';
import Screenshots from './pages/Screenshots';
import Chat from '@shared/pages/Chat';
import TaskManagement from './pages/TaskManagement';
import TaskCreate from './pages/TaskCreate';
import TaskUpdate from './pages/TaskUpdate';
import Notifications from './pages/Notifications';
import AllNotifications from './pages/AllNotifications';
import SmartTimeTracker from './pages/SmartTimeTracker';

// ROUTE PROTECTION LOGIC
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = sessionStorage.getItem('token');
  const role = sessionStorage.getItem('role');

  if (!token) return <Navigate to="/login" replace />;

  // ROLE SPECIFIC CHECK (ADMIN OVERRIDE)
  if (role === 'admin') return children;

  if (allowedRole && role !== allowedRole) {
    return <Navigate to={`/${role}/dashboard`} replace />;
  }

  return children;
};

// ROOT REDIRECT LOGIC: Redirect to appropriate dashboard if logged in, otherwise to login
const RootRedirect = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const token = sessionStorage.getItem('token');
    const role = sessionStorage.getItem('role');

    if (token && role) {
      navigate(`/${role}/dashboard`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return null;
};

const App = () => {
  return (
    <>
      <ScrollToTop />
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* REDIRECTS FOR OLD PATHS */}
        <Route path="/select-role" element={<Navigate to="/login" replace />} />
        <Route path="/login/:role" element={<Navigate to="/login" replace />} />

        {/* ADMIN MODULE */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/add" element={<EmployeeForm />} />
          <Route path="employees/edit/:id" element={<EmployeeForm />} />
          <Route path="employees/view/:id" element={<EmployeeDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="task-management" element={<TaskManagement />} />
          <Route path="task-management/create" element={<TaskCreate />} />
          <Route path="task-management/update/:id" element={<TaskUpdate />} />

          <Route path="leave" element={<LeaveManagement />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="performance" element={<Performance />} />
          <Route path="reports" element={<Reports />} />
          <Route path="recruitment" element={<Recruitment />} />
          <Route path="settings" element={<Settings />} />
          <Route path="create-user" element={<CreateUser />} />
          <Route path="chat" element={<Chat />} />
          <Route path="screenshots" element={<Screenshots />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="notifications/all" element={<AllNotifications />} />
          <Route path="time-tracker" element={<SmartTimeTracker />} />
          <Route path="documents" element={<EmployeeDocuments />} />
          <Route path="training" element={<Training />} />
          <Route path="roles-permissions" element={<RolesPermissions />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="departments" element={<Departments />} />
          <Route path="designations" element={<Designations />} />
        </Route>

        {/* HR MODULE */}
        <Route path="/hr" element={
          <ProtectedRoute allowedRole="hr">
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<HRDashboard />} />
          <Route path="dashboard" element={<HRDashboard />} />
          <Route path="tasks" element={<HRTasks />} />
          <Route path="task-management" element={<TaskManagement />} />
          <Route path="task-management/create" element={<TaskCreate />} />
          <Route path="task-management/update/:id" element={<TaskUpdate />} />
          <Route path="leave" element={<LeaveManagement />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="employees" element={<HREmployees />} />
          <Route path="employees/view/:id" element={<EmployeeDetail />} />
          <Route path="employees/edit/:id" element={<EmployeeForm />} />
          <Route path="create-user" element={<CreateUser />} />
          <Route path="teams" element={<TeamManagement />} />
          <Route path="recruitment" element={<Recruitment />} />
          <Route path="performance" element={<Performance />} />
          <Route path="reports" element={<Reports />} />
          <Route path="projects" element={<ProjectManagement />} />
          <Route path="chat" element={<Chat />} />
          <Route path="screenshots" element={<Screenshots />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="notifications/all" element={<AllNotifications />} />
          <Route path="time-tracker" element={<SmartTimeTracker />} />
          <Route path="documents" element={<EmployeeDocuments />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="settings" element={<Settings />} />
          <Route path="training" element={<Training />} />
          <Route path="roles-permissions" element={<RolesPermissions />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="departments" element={<Departments />} />
          <Route path="designations" element={<Designations />} />
        </Route>

        {/* EMPLOYEE MODULE */}
        <Route path="/employee" element={
          <ProtectedRoute allowedRole="employee">
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="task-management" element={<TaskManagement />} />
          <Route path="task-management/create" element={<TaskCreate />} />
          <Route path="task-management/update/:id" element={<TaskUpdate />} />
          <Route path="projects" element={<EmployeeProjects />} />
          <Route path="leave" element={<EmployeeLeave />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="time-tracker" element={<SmartTimeTracker />} />
          <Route path="payslips" element={<EmployeePayslips />} />
          <Route path="documents" element={<EmployeeDocuments />} />
          <Route path="performance" element={<EmployeePerformance />} />
          <Route path="recruitment" element={<Recruitment />} />
          <Route path="reports" element={<Reports />} />
          <Route path="chat" element={<Chat />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="notifications/all" element={<AllNotifications />} />
          <Route path="training" element={<Training />} />
          <Route path="roles-permissions" element={<RolesPermissions />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="departments" element={<Departments />} />
          <Route path="designations" element={<Designations />} />
        </Route>

        {/* MANAGER MODULE */}
        <Route path="/manager" element={
          <ProtectedRoute allowedRole="manager">
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<ManagerDashboard />} />
          <Route path="dashboard" element={<ManagerDashboard />} />
          <Route path="tasks" element={<ManagerTasks />} />
          <Route path="employees" element={<HREmployees />} />
          <Route path="employees/edit/:id" element={<EmployeeForm />} />
          <Route path="employees/view/:id" element={<EmployeeDetail />} />
          <Route path="task-management" element={<TaskManagement />} />
          <Route path="task-management/create" element={<TaskCreate />} />
          <Route path="task-management/update/:id" element={<TaskUpdate />} />
          <Route path="projects" element={<ManagerProjects />} />
          <Route path="leave" element={<LeaveManagement />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="chat" element={<Chat />} />
          <Route path="screenshots" element={<Screenshots />} />
          <Route path="recruitment" element={<Recruitment />} />
          <Route path="performance" element={<Performance />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="time-tracker" element={<SmartTimeTracker />} />
          <Route path="documents" element={<EmployeeDocuments />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="settings" element={<Settings />} />
          <Route path="training" element={<Training />} />
          <Route path="roles-permissions" element={<RolesPermissions />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="departments" element={<Departments />} />
          <Route path="designations" element={<Designations />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="notifications/all" element={<AllNotifications />} />
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
