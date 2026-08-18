export const menuConfig = {
  employee: [
    { label: 'Dashboard', path: '/employee/dashboard', keywords: ['dashboard', 'home', 'main', 'overview'] },
    { label: 'My Attendance', path: '/employee/attendance', keywords: ['attendance', 'my attendance', 'check in', 'check out', 'clock in', 'clock out', 'time', 'hours', 'working hours', 'present', 'time tracker'] },
    { label: 'Apply Leave / My Leave', path: '/employee/leave', keywords: ['leave', 'apply leave', 'my leave', 'vacation', 'casual leave', 'sick leave', 'leave request', 'leave balance', 'time off', 'holiday'] },
    { label: 'My Tasks', path: '/employee/task-management', keywords: ['task', 'tasks', 'my tasks', 'work', 'to do', 'task board', 'assigned tasks', 'projects'] },
    { label: 'Create Task', path: '/employee/task-management/create', keywords: ['create task', 'add task', 'new task', 'task'] },
    { label: 'My Payslips / Payroll', path: '/employee/payslips', keywords: ['payslip', 'payslips', 'salary', 'payroll', 'pay', 'earnings', 'wage', 'slip', 'salary slip'] },
    { label: 'My Profile', path: '/employee/profile', keywords: ['profile', 'my profile', 'account', 'user', 'personal info', 'employee info', 'details'] },
    { label: 'My Documents', path: '/employee/documents', keywords: ['document', 'documents', 'files', 'upload', 'identity', 'pan', 'adhar', 'bank', 'my documents'] },
    { label: 'My Performance', path: '/employee/performance', keywords: ['performance', 'goals', 'kpi', 'review', 'appraisal', 'rating', 'my performance'] },
    { label: 'Notifications', path: '/employee/notifications', keywords: ['notification', 'notifications', 'alerts', 'messages', 'updates', 'notice'] },
    { label: 'Team Chat', path: '/employee/chat', keywords: ['chat', 'team chat', 'message', 'messages', 'conversation', 'talk'] },
    { label: 'Holiday Calendar', path: '/employee/holidays', keywords: ['holiday', 'holidays', 'calendar', 'leave calendar', 'festival', 'off days', 'company holidays'] },
    { label: 'Company Events', path: '/employee/events', keywords: ['event', 'events', 'celebration', 'activity', 'company events'] },
    { label: 'Settings', path: '/employee/settings', keywords: ['settings', 'setting', 'preferences', 'theme', 'dark mode'] }
  ],
  hr: [
    { label: 'Dashboard', path: '/hr/dashboard', keywords: ['dashboard', 'home', 'overview', 'main'] },
    { label: 'Employees', path: '/hr/employees', keywords: ['employee', 'employees', 'staff', 'team', 'workforce', 'add employee', 'manage employees'] },
    { label: 'Attendance', path: '/hr/attendance', keywords: ['attendance', 'check in', 'clock in', 'time tracking', 'working hours', 'team attendance'] },
    { label: 'Leave Management', path: '/hr/leaves', keywords: ['leave', 'leaves', 'apply leave', 'leave requests', 'vacation', 'sick leave', 'leave approval'] },
    { label: 'Payroll & Salary', path: '/hr/payroll', keywords: ['payroll', 'salary', 'payslips', 'pay', 'compensation', 'earnings'] },
    { label: 'Performance Management', path: '/hr/performance', keywords: ['performance', 'appraisal', 'kpi', 'goals', 'review', 'rating'] },
    { label: 'Daily Tasks Board', path: '/hr/tasks', keywords: ['task', 'tasks', 'daily tasks', 'to do', 'task management', 'board'] },
    { label: 'Reports & Analytics', path: '/hr/reports', keywords: ['report', 'reports', 'analytics', 'audit', 'summary', 'export'] },
    { label: 'Monitoring Logs & Screenshots', path: '/hr/screenshots', keywords: ['screenshot', 'screenshots', 'logs', 'monitoring', 'time tracking', 'activity'] },
    { label: 'Team Chat', path: '/hr/chat', keywords: ['chat', 'team chat', 'message', 'messages', 'conversation'] },
    { label: 'Notifications', path: '/hr/notifications', keywords: ['notification', 'notifications', 'alerts', 'notices'] },
    { label: 'Settings', path: '/hr/settings', keywords: ['settings', 'setting', 'preferences', 'configuration'] }
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', keywords: ['dashboard', 'home', 'overview', 'main'] },
    { label: 'Employees & Users', path: '/admin/employees', keywords: ['employee', 'employees', 'user', 'users', 'staff', 'team', 'add user', 'create user'] },
    { label: 'Attendance Management', path: '/admin/attendance', keywords: ['attendance', 'check in', 'clock in', 'time tracking', 'working hours', 'team attendance'] },
    { label: 'Leave Management', path: '/admin/leaves', keywords: ['leave', 'leaves', 'apply leave', 'leave requests', 'vacation', 'sick leave', 'leave approval'] },
    { label: 'Payroll Management', path: '/admin/payroll', keywords: ['payroll', 'salary', 'payslips', 'pay', 'compensation', 'earnings'] },
    { label: 'Performance Management', path: '/admin/performance', keywords: ['performance', 'appraisal', 'kpi', 'goals', 'review', 'rating'] },
    { label: 'Daily Tasks Board', path: '/admin/tasks', keywords: ['task', 'tasks', 'daily tasks', 'to do', 'task management', 'board'] },
    { label: 'Reports & Analytics', path: '/admin/reports', keywords: ['report', 'reports', 'analytics', 'audit', 'summary', 'export'] },
    { label: 'Monitoring Logs & Screenshots', path: '/admin/screenshots', keywords: ['screenshot', 'screenshots', 'logs', 'monitoring', 'time tracking', 'activity'] },
    { label: 'Team Chat', path: '/admin/chat', keywords: ['chat', 'team chat', 'message', 'messages', 'conversation'] },
    { label: 'Notifications', path: '/admin/notifications', keywords: ['notification', 'notifications', 'alerts', 'notices'] },
    { label: 'Settings', path: '/admin/settings', keywords: ['settings', 'setting', 'preferences', 'system settings'] }
  ],
  manager: [
    { label: 'Dashboard', path: '/manager/dashboard', keywords: ['dashboard', 'home', 'overview', 'main'] },
    { label: 'Team & Employees', path: '/manager/employees', keywords: ['employee', 'employees', 'team', 'staff', 'my team'] },
    { label: 'Team Attendance', path: '/manager/attendance', keywords: ['attendance', 'team attendance', 'check in', 'clock in', 'working hours'] },
    { label: 'Apply Leave', path: '/manager/leave', keywords: ['leave', 'leaves', 'apply leave', 'team leaves', 'leave approval', 'vacation'] },
    { label: 'Daily Tasks Board', path: '/manager/tasks', keywords: ['task', 'tasks', 'team tasks', 'task management', 'board', 'to do'] },
    { label: 'Monitoring Logs & Screenshots', path: '/manager/screenshots', keywords: ['screenshot', 'screenshots', 'logs', 'monitoring', 'activity'] },
    { label: 'Team Chat', path: '/manager/chat', keywords: ['chat', 'team chat', 'message', 'messages', 'conversation'] }
  ]
};
