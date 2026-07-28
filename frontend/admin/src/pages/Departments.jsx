import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Building2, Users, CheckCircle2, AlertCircle, Plus, Search, Edit3, Trash2,
  Eye, RefreshCw, X, SlidersHorizontal, ChevronLeft, ChevronRight, UserPlus,
  Download, Upload, ShieldAlert, BarChart3, Activity, Info, FileText, Settings,
  ArrowLeft, Mail, Phone, MapPin, DollarSign, Award, ShieldCheck, GraduationCap,
  ArrowUpRight, FileSpreadsheet, Lock, FolderSync
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const COLORS = {
  emerald: '#00a76b',
  blue: '#2563eb',
  amber: '#f59e0b',
  rose: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  teal: '#06b6d4',
  indigo: '#6366f1'
};

const CHART_COLORS = [COLORS.emerald, COLORS.blue, COLORS.purple, COLORS.amber, COLORS.teal, COLORS.pink];

const INITIAL_DEPARTMENTS = [
  { id: '1', name: 'Engineering', code: 'ENG', head: 'Jonas Becker', parent: 'Operations', employees: 62, budget: 1200000, location: 'HQ - Floor 3', email: 'eng@fluidhr.com', phone: '+1 (555) 0192', status: 'Active', desc: 'Product engineering, software development, and site reliability operations.', created: '2025-01-10', updated: '2026-07-01' },
  { id: '2', name: 'Sales', code: 'SAL', head: 'Liam Murphy', parent: 'Business Development', employees: 28, budget: 850000, location: 'HQ - Floor 2', email: 'sales@fluidhr.com', phone: '+1 (555) 0183', status: 'Active', desc: 'Direct enterprise sales, account management, and corporate development.', created: '2025-02-15', updated: '2026-06-25' },
  { id: '3', name: 'Design', code: 'DSN', head: 'Sara Lopez', parent: 'Product Development', employees: 18, budget: 350000, location: 'HQ - Floor 3', email: 'design@fluidhr.com', phone: '+1 (555) 0174', status: 'Active', desc: 'Product UI/UX design, visual assets, and brand design guidelines.', created: '2025-03-01', updated: '2026-07-02' },
  { id: '4', name: 'Marketing', code: 'MKT', head: 'Sophie Turner', parent: 'Business Development', employees: 22, budget: 450000, location: 'HQ - Floor 2', email: 'marketing@fluidhr.com', phone: '+1 (555) 0165', status: 'Active', desc: 'Digital marketing, client growth, social media, and sponsorships.', created: '2025-01-05', updated: '2026-07-08' },
  { id: '5', name: 'Finance', code: 'FIN', head: 'Aisha Johnson', parent: 'Corporate Operations', employees: 14, budget: 600000, location: 'HQ - Floor 4', email: 'finance@fluidhr.com', phone: '+1 (555) 0156', status: 'Active', desc: 'Company treasury, payroll disbursements, tax planning, and auditing.', created: '2025-01-05', updated: '2026-07-08' },
  { id: '6', name: 'HR', code: 'HRM', head: 'Priya Shah', parent: 'Corporate Operations', employees: 16, budget: 400000, location: 'HQ - Floor 4', email: 'hr@fluidhr.com', phone: '+1 (555) 0147', status: 'Active', desc: 'Talent recruitment, employee relations, and policy compliance.', created: '2025-01-05', updated: '2026-07-08' }
];

export default function Departments() {
  const [role, setRole] = useState(() => sessionStorage.getItem('role') || 'hr');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [loading, setLoading] = useState(true);
  const [depts, setDepts] = useState(INITIAL_DEPARTMENTS);
  const [employees, setEmployees] = useState([]);
  
  // Tab states: 'directory', 'analytics', 'audit'
  const [activeTab, setActiveTab] = useState('directory');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Detailed view state
  const [viewedDept, setViewedDept] = useState(null);
  const [detailTab, setDetailTab] = useState('overview'); // overview, employees, attendance, performance, training, documents, history

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Form State
  const [formState, setFormState] = useState({
    name: '', code: '', head: '', parent: 'Operations', budget: 500000, location: 'HQ - Floor 3',
    email: '', phone: '', status: 'Active', desc: ''
  });

  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
    employeeId: '', targetDeptId: ''
  });

  // Logs List
  const [logs, setLogs] = useState([
    { timestamp: '2026-07-08 10:20:12', user: 'Priya Shah', action: 'Transferred employee EMP-ALP to Engineering', category: 'Transfer' },
    { timestamp: '2026-07-07 14:15:35', user: 'System Admin', action: 'Updated budget for Marketing Department', category: 'Update' },
    { timestamp: '2026-07-05 09:30:00', user: 'Priya Shah', action: 'Created new Department: Quality Assurance (QA)', category: 'Creation' }
  ]);

  // Sync theme status reactively
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const token = sessionStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const [empRes, deptRes] = await Promise.all([
        axios.get('/api/employees', config).catch(() => ({ data: [] })),
        axios.get('/api/departments', config).catch(() => ({ data: [] }))
      ]);

      const emps = Array.isArray(empRes.data) ? empRes.data : [];
      setEmployees(emps);

      if (Array.isArray(deptRes.data) && deptRes.data.length > 0) {
        setDepts(deptRes.data.map(d => ({
          id: d._id || d.id,
          name: d.name,
          code: d.code || d.name.substring(0, 3).toUpperCase(),
          head: d.manager?.fullName || d.head || 'Unassigned',
          parent: d.parent || 'Corporate Operations',
          employees: emps.filter(e => e.department?.name === d.name || e.department === d.name || e.department === d._id).length || 0,
          budget: d.budget || 500000,
          location: d.location || 'HQ - Floor 3',
          email: d.email || `${d.name.toLowerCase().replace(' ', '')}@fluidhr.com`,
          phone: d.phone || '+1 (555) 0100',
          status: d.status || 'Active',
          desc: d.description || 'Corporate operations subdivision.',
          created: d.createdAt ? d.createdAt.split('T')[0] : '2025-01-05',
          updated: d.updatedAt ? d.updatedAt.split('T')[0] : '2026-07-08'
        })));
      } else {
        // Fallback sync counts
        setDepts(INITIAL_DEPARTMENTS.map(d => ({
          ...d,
          employees: emps.filter(e => {
            const depName = e.department?.name || e.department || '';
            return depName.toLowerCase() === d.name.toLowerCase();
          }).length || d.employees
        })));
      }
    } catch (err) {
      console.error('Failed to sync departments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setFormState({
      name: '', code: '', head: 'Priya Shah', parent: 'Corporate Operations',
      budget: 500000, location: 'HQ - Floor 3', email: '', phone: '', status: 'Active', desc: ''
    });
    setIsEditMode(false);
    setShowAddModal(true);
  };

  const handleOpenEdit = (e, dept) => {
    e.stopPropagation();
    setSelectedDeptId(dept.id);
    setFormState({ ...dept });
    setIsEditMode(true);
    setShowAddModal(true);
  };

  const handleDelete = (e, id, name) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to permanently decommission the "${name}" department?`)) {
      setDepts(depts.filter(d => d.id !== id));
      setLogs([
        { timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19), user: 'HR Admin', action: `Decommissioned Department: ${name}`, category: 'Deactivation' },
        ...logs
      ]);
      toast.success(`Department "${name}" removed`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formState.name || !formState.code) {
      toast.error('Department Name and Code are required');
      return;
    }

    if (isEditMode) {
      setDepts(depts.map(d => d.id === selectedDeptId ? { ...d, ...formState, updated: new Date().toISOString().split('T')[0] } : d));
      setLogs([
        { timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19), user: 'HR Admin', action: `Modified Department details for: ${formState.name}`, category: 'Update' },
        ...logs
      ]);
      toast.success('Department updated successfully');
    } else {
      const created = {
        ...formState,
        id: String(depts.length + 1),
        employees: 0,
        created: new Date().toISOString().split('T')[0],
        updated: new Date().toISOString().split('T')[0]
      };
      setDepts([created, ...depts]);
      setLogs([
        { timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19), user: 'HR Admin', action: `Created new Department: ${formState.name}`, category: 'Creation' },
        ...logs
      ]);
      toast.success('Department registered successfully');
    }
    setShowAddModal(false);
  };

  // Employee Assignment & Transfer
  const handleOpenTransfer = (e) => {
    e.stopPropagation();
    setShowTransferModal(true);
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    const emp = employees.find(x => x._id === transferForm.employeeId || x.employeeId === transferForm.employeeId);
    const targetDept = depts.find(d => d.id === transferForm.targetDeptId);
    if (!emp || !targetDept) {
      toast.error('Invalid employee or target department selection');
      return;
    }

    // Auto-update counts
    const oldDeptName = emp.department?.name || emp.department || '';
    setDepts(depts.map(d => {
      let empsCount = d.employees;
      if (d.name.toLowerCase() === targetDept.name.toLowerCase()) {
        empsCount += 1;
      }
      if (d.name.toLowerCase() === oldDeptName.toLowerCase()) {
        empsCount = Math.max(0, empsCount - 1);
      }
      return { ...d, employees: empsCount };
    }));

    setEmployees(employees.map(x => x._id === emp._id ? { ...x, department: { name: targetDept.name } } : x));

    setLogs([
      { timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19), user: 'HR Admin', action: `Transferred employee "${emp.fullName}" to ${targetDept.name}`, category: 'Transfer' },
      ...logs
    ]);

    setShowTransferModal(false);
    toast.success(`Transferred ${emp.fullName} to ${targetDept.name}`);
  };

  // CSV Import Simulation
  const handleImport = (e) => {
    e.preventDefault();
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: 'Uploading CSV dossiers...',
        success: 'Successfully imported 2 new corporate subdivisions!',
        error: 'Validation failed'
      }
    ).then(() => {
      const parsed = [
        { id: '10', name: 'Quality Assurance', code: 'QAC', head: 'Mei Chen', parent: 'Product Development', employees: 8, budget: 200000, location: 'HQ - Floor 3', email: 'qa@fluidhr.com', phone: '+1 (555) 0110', status: 'Active', desc: 'Continuous integration auditing and bug matrix scans.', created: '2026-07-08', updated: '2026-07-08' }
      ];
      setDepts([...parsed, ...depts]);
      setShowImportModal(false);
    });
  };

  // Filters & Search logic
  const filteredDepts = depts.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.head.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalItems = filteredDepts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedDepts = filteredDepts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const isHR = role === 'hr' || role === 'admin';

  return (
    <div className="space-y-8 pb-24">
      {/* ─── BANNER HEADER ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-6 shadow-sm">
        <div>
          <h2 className="text-[20px] font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Building2 className="text-[#00a76b]" size={24} />
            Corporate Divisions Board
          </h2>
          <p className="text-xs text-slate-400 dark:text-[#829e92] font-semibold mt-1">Configure structural subdivisions, manage department heads, assign budgets, and audit change logs.</p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {isHR && (
            <>
              <button 
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 border border-[#dcdbd3] dark:border-[#1a2d29] hover:border-[#00a76b] hover:text-[#00a76b] dark:text-[#a3b3af] rounded-full text-xs font-bold bg-white dark:bg-[#111c18] cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Upload size={14} />
                <span>Import CSV</span>
              </button>
              <button 
                onClick={handleOpenTransfer}
                className="px-4 py-2 border border-[#dcdbd3] dark:border-[#1a2d29] hover:border-[#00a76b] hover:text-[#00a76b] dark:text-[#a3b3af] rounded-full text-xs font-bold bg-white dark:bg-[#111c18] cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <FolderSync size={14} />
                <span>Transfer Employee</span>
              </button>
              <button
                onClick={handleOpenAdd}
                className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-full font-bold text-xs transition-all cursor-pointer border-none shadow-sm flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Add Department</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── DYNAMIC DIRECTORY DOCK CANVAS ────────────────── */}
      {viewedDept ? (
        /* 1. DEDICATED DEPARTMENT DETAILS PROFILE */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setViewedDept(null)}
              className="px-4 py-2 border border-slate-200 dark:border-[#1a2d29] hover:bg-slate-50 dark:hover:bg-[#111c18] rounded-full text-xs font-bold bg-white dark:bg-[#0c1512] cursor-pointer flex items-center gap-1.5 text-slate-500 dark:text-slate-300 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Directory</span>
            </button>
            <div className="flex gap-2">
              {isHR && (
                <button
                  onClick={(e) => handleOpenEdit(e, viewedDept)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs cursor-pointer border-none shadow-sm flex items-center gap-1"
                >
                  <Edit3 size={13} />
                  <span>Edit Department</span>
                </button>
              )}
            </div>
          </div>

          {/* Department Header Card */}
          <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#00a76b]/10 text-[#00a76b] flex items-center justify-center font-black text-lg">
                {viewedDept.code}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  {viewedDept.name}
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    viewedDept.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-950/20' : 'bg-red-100 text-red-700 dark:bg-red-950/20'
                  }`}>{viewedDept.status}</span>
                </h3>
                <p className="text-xs text-slate-400 dark:text-[#829e92] font-semibold mt-1">HoD: {viewedDept.head} • Parent Unit: {viewedDept.parent}</p>
              </div>
            </div>

            <div className="flex gap-6 border-t md:border-t-0 pt-4 md:pt-0 w-full md:w-auto justify-between">
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Budget</span>
                <span className="text-sm font-extrabold text-[#00a76b] mt-1 block">${(viewedDept.budget / 1000).toFixed(0)}K</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Office Location</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-350 mt-1 block">{viewedDept.location}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Staff Mapped</span>
                <span className="text-sm font-black text-slate-800 dark:text-white mt-1 block tabular-nums">{viewedDept.employees} Employees</span>
              </div>
            </div>
          </div>

          {/* Department Specific Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Attendance Rate', val: '96.5%', desc: 'Current Month Average', color: COLORS.emerald, icon: CheckCircle2 },
              { label: 'Leave Requests', val: '2 Active', desc: 'Pending approvals', color: COLORS.amber, icon: Mail },
              { label: 'Performance Score', val: '88 / 100', desc: 'KPI Target average', color: COLORS.blue, icon: Award },
              { label: 'Training Completion', val: '92%', desc: 'Courses completed', color: COLORS.purple, icon: GraduationCap }
            ].map((card, i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md transition-all flex flex-col justify-between h-[120px]"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">{card.label}</span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${card.color}15`, color: card.color }}
                  >
                    <card.icon size={15} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white leading-none mb-1">{card.val}</h3>
                  <p className="text-[9px] font-bold text-[#829e92] dark:text-[#527068] uppercase tracking-widest">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main detailed content area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left side overview / stats */}
            <div className="lg:col-span-8 bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-[#eceae3] dark:border-[#1a2d29] pb-0.5">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'employees', label: 'Employees assigned' },
                  { id: 'attendance', label: 'Attendance' },
                  { id: 'performance', label: 'Performance' },
                  { id: 'training', label: 'Training' },
                  { id: 'documents', label: 'Documents' },
                  { id: 'history', label: 'Activity Logs' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setDetailTab(t.id)}
                    className={`px-4 py-2 text-xs font-bold border-b-2 bg-transparent cursor-pointer transition-all ${
                      detailTab === t.id
                        ? 'border-b-[#00a76b] text-[#00a76b]'
                        : 'border-b-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {detailTab === 'overview' && (
                <div className="space-y-6 text-xs">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#829e92] mb-3">Subdivision Overview</h4>
                    <p className="text-slate-600 dark:text-[#829e92] leading-relaxed font-medium">{viewedDept.desc}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-50 dark:border-slate-900">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Office Location</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-350">{viewedDept.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail size={14} className="text-slate-400 shrink-0" />
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Contact Email</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-350">{viewedDept.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Phone Number</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-350">{viewedDept.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <DollarSign size={14} className="text-slate-400 shrink-0" />
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Annual Budget Limit</p>
                          <p className="font-extrabold text-[#00a76b]">${(viewedDept.budget).toLocaleString()} USD</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'employees' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#e2eae7] dark:border-[#13221e] bg-slate-50 dark:bg-[#111c18]/45">
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[#829e92]">Name</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[#829e92]">Position</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[#829e92] text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2eae7] dark:divide-[#13221e]">
                        {employees.filter(e => {
                          const deptName = e.department?.name || e.department || '';
                          return deptName.toLowerCase() === viewedDept.name.toLowerCase();
                        }).map((emp, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{emp.fullName}</td>
                            <td className="px-4 py-3 text-slate-500">{emp.position || 'Specialist'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-green-100 text-green-700 uppercase">Active</span>
                            </td>
                          </tr>
                        ))}
                        {employees.filter(e => {
                          const deptName = e.department?.name || e.department || '';
                          return deptName.toLowerCase() === viewedDept.name.toLowerCase();
                        }).length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-slate-400 font-bold uppercase tracking-widest">No active personnel assigned to this node</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {detailTab === 'attendance' && (
                <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#829e92]">Attendance Activity History</h4>
                  <div className="p-4 border border-[#eceae3] dark:border-[#1a2d29] rounded-xl bg-slate-50/20">
                    <p className="mb-2">Average monthly attendance rate is steady at <span className="text-[#00a76b] font-black">96.5%</span>.</p>
                    <p>Current active leave rate is 4.2%.</p>
                  </div>
                </div>
              )}

              {detailTab === 'performance' && (
                <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#829e92]">Performance Metrics</h4>
                  <p>KPI score averages stand at <span className="text-blue-500 font-black">88 / 100</span>. Review targets completed successfully.</p>
                </div>
              )}

              {detailTab === 'training' && (
                <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#829e92]">Assigned training programs</h4>
                  <p>Average training completion rate is at <span className="text-purple-500 font-black">92%</span>.</p>
                </div>
              )}

              {detailTab === 'documents' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#829e92]">Department dossiers</h4>
                  <div className="p-3 border border-[#eceae3] dark:border-[#1a2d29] rounded-xl bg-slate-50/20 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><FileText size={14} /> procedures_manual.pdf</span>
                    <button onClick={() => toast.success('Downloaded procedures_manual.pdf')} className="text-[#00a76b] bg-transparent border-none cursor-pointer font-bold">Download</button>
                  </div>
                </div>
              )}

              {detailTab === 'history' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#829e92]">Action Logs Registry</h4>
                  <div className="relative border-l border-slate-200 pl-4 space-y-4 text-xs font-semibold">
                    <div className="relative">
                      <div className="absolute w-2 h-2 rounded-full bg-[#00a76b] -left-[21px] top-1"></div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">2026-07-08 10:22</p>
                      <p className="text-slate-700 dark:text-slate-300 mt-1">Audit status initialized to Active.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right side HoD profile */}
            <div className="lg:col-span-4 bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Department Head</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                    {viewedDept.head.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white">{viewedDept.head}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Manager, {viewedDept.name}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-900 mt-6 text-[10px] text-slate-400 font-bold space-y-1 uppercase">
                <p>Created: {viewedDept.created}</p>
                <p>Audited: {viewedDept.updated}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 2. MAIN DIRECTORY LAYOUT */
        <div className="space-y-6">
          {/* Controls toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[20px] p-4 shadow-sm">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search code, name, HoD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#111c18] border-none text-xs font-semibold rounded-full focus:outline-none focus:ring-1 focus:ring-[#00a76b]/20 text-slate-700 dark:text-[#a3b3af]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <SlidersHorizontal size={14} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-[#111c18] text-xs font-bold py-1.5 px-3 rounded-xl border border-gray-250 dark:border-[#1a2d29] focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>

              <button 
                onClick={fetchData}
                className="w-8 h-8 rounded-xl border border-slate-200 dark:border-[#1a2d29] hover:bg-gray-50 flex items-center justify-center bg-transparent cursor-pointer"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Directory table grid */}
          <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e2eae7] dark:border-[#13221e] bg-slate-50 dark:bg-[#111c18]/45">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#829e92]">Code</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#829e92]">Division Node</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#829e92]">Department Head</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#829e92]">Budget</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#829e92] text-center">Depth</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#829e92] text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#829e92] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2eae7] dark:divide-[#13221e]">
                  {paginatedDepts.map((d, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setViewedDept(d)}
                      className="hover:bg-slate-50/50 dark:hover:bg-[#111c18]/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-xs font-black text-[#00a76b]">{d.code}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-white">
                        <div>
                          <p>{d.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate max-w-[200px]">{d.desc}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-350">{d.head}</td>
                      <td className="px-6 py-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 tabular-nums">
                        ${(d.budget / 1000).toFixed(0)}K
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-center tabular-nums">{d.employees}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          d.status === 'Active' ? 'bg-green-105 text-green-700 dark:bg-green-950/20' : 'bg-red-105 text-red-700 dark:bg-red-950/20'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => setViewedDept(d)}
                            className="p-1.5 hover:text-[#00a76b] text-slate-400 bg-transparent border-none cursor-pointer"
                          >
                            <Eye size={14} />
                          </button>
                          {isHR && (
                            <>
                              <button 
                                onClick={(e) => handleOpenEdit(e, d)}
                                className="p-1.5 hover:text-blue-500 text-slate-400 bg-transparent border-none cursor-pointer"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={(e) => handleDelete(e, d.id, d.name)}
                                className="p-1.5 hover:text-red-500 text-slate-400 bg-transparent border-none cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedDepts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-bold uppercase tracking-widest">No subdivisions registered</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-[#e2eae7] dark:border-[#13221e] bg-slate-50/20 dark:bg-[#111c18]/10 flex justify-between items-center text-xs font-bold">
                <span className="text-slate-400">Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items</span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-[#1a2d29] flex items-center justify-center cursor-pointer disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-[#1a2d29] flex items-center justify-center cursor-pointer disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE/EDIT DEPARTMENT ────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] w-full max-w-md p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#eceae3] dark:border-[#1a2d29]">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{isEditMode ? 'Edit Department Node' : 'Initialize Department Node'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-bold uppercase mb-1.5">Department Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quality Assurance"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1.5">Code</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="QA"
                    value={formState.code}
                    onChange={(e) => setFormState({ ...formState, code: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1.5">Budget Limit</label>
                  <input
                    type="number"
                    required
                    value={formState.budget}
                    onChange={(e) => setFormState({ ...formState, budget: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1.5">Office Location</label>
                  <input
                    type="text"
                    required
                    placeholder="HQ - Floor 3"
                    value={formState.location}
                    onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1.5">Department Head</label>
                <select
                  value={formState.head}
                  onChange={(e) => setFormState({ ...formState, head: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none"
                >
                  <option value="Unassigned">Assign HoD...</option>
                  <option value="Priya Shah">Priya Shah</option>
                  <option value="Jonas Becker">Jonas Becker</option>
                  <option value="Sara Lopez">Sara Lopez</option>
                  <option value="Liam Murphy">Liam Murphy</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1.5">Status</label>
                <select
                  value={formState.status}
                  onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1.5">Description</label>
                <textarea
                  placeholder="Provide scope details..."
                  value={formState.desc}
                  onChange={(e) => setFormState({ ...formState, desc: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-[#1a2d29] hover:bg-slate-50 rounded-full font-bold bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-full font-bold cursor-pointer border-none"
                >
                  {isEditMode ? 'Save Modifications' : 'Initialize Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: TRANSFER EMPLOYEE ─────────────────────── */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] w-full max-w-md p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#eceae3] dark:border-[#1a2d29]">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Transfer Node Assignment</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1.5">Select Employee</label>
                <select
                  required
                  value={transferForm.employeeId}
                  onChange={(e) => setTransferForm({ ...transferForm, employeeId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none"
                >
                  <option value="">Choose Employee...</option>
                  {employees.map((emp, i) => (
                    <option key={i} value={emp._id}>{emp.fullName} ({emp.department?.name || emp.department || 'Unassigned'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1.5">Destination Department</label>
                <select
                  required
                  value={transferForm.targetDeptId}
                  onChange={(e) => setTransferForm({ ...transferForm, targetDeptId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none"
                >
                  <option value="">Choose Destination...</option>
                  {depts.map((d, i) => (
                    <option key={i} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-[#1a2d29] hover:bg-slate-50 rounded-full font-bold bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-full font-bold cursor-pointer border-none"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: IMPORT CSV ────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] w-full max-w-md p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#eceae3] dark:border-[#1a2d29]">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Import Subdivisions</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleImport} className="space-y-4 text-xs">
              <div className="p-8 border-2 border-dashed border-[#eceae3] dark:border-[#1a2d29] rounded-[20px] text-center hover:border-[#00a76b] transition-colors cursor-pointer">
                <Upload size={32} className="mx-auto text-slate-400 mb-4" />
                <p className="font-bold text-slate-600 dark:text-slate-350">Drag & Drop CSV / Excel here</p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-900">
                <button
                  type="button"
                  onClick={() => toast.success('Sample Template CSV downloaded successfully!')}
                  className="px-4 py-2 border border-slate-200 dark:border-[#1a2d29] hover:bg-slate-50 rounded-full font-bold bg-transparent cursor-pointer flex items-center gap-1"
                >
                  <Download size={12} />
                  <span>Template</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-[#1a2d29] hover:bg-slate-50 rounded-full font-bold bg-transparent cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-full font-bold cursor-pointer border-none shadow-sm"
                  >
                    Start Import
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
