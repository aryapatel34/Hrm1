import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  GraduationCap, Plus, Search, Calendar, Award, BookOpen, Clock,
  FileText, CheckCircle, Play, MoreVertical, Trash2, Edit3, Users,
  ChevronRight, TrendingUp, Info, HelpCircle, Download, Check
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const COLORS = {
  emerald: '#00a76b',
  blue: '#2563eb',
  amber: '#f59e0b',
  rose: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  teal: '#06b6d4'
};

const CHART_COLORS = [COLORS.emerald, COLORS.blue, COLORS.purple, COLORS.amber, COLORS.teal];

// Predefined Mock Training Programs Database
const INITIAL_PROGRAMS = [
  { id: '1', title: 'Workforce OS Integration & Security', category: 'Compliance', trainer: 'Priya Shah', start: '2026-07-15', end: '2026-07-20', duration: '12 hrs', capacity: 35, enrolled: 28, status: 'Upcoming', materials: 'security_handbook.pdf' },
  { id: '2', title: 'Advanced React 19 & Next.js Core Patterns', category: 'Technical', trainer: 'Jonas Becker', start: '2026-07-02', end: '2026-07-10', duration: '20 hrs', capacity: 25, enrolled: 24, status: 'Ongoing', materials: 'react19_patterns.zip' },
  { id: '3', title: 'Leadership & Tactical Team Orchestration', category: 'Leadership', trainer: 'Marcus Lee', start: '2026-06-15', end: '2026-06-25', duration: '15 hrs', capacity: 15, enrolled: 15, status: 'Completed', materials: 'tactical_orchestration.pdf' },
  { id: '4', title: 'Client Communication & Support Excellence', category: 'Soft Skills', trainer: 'Sara Lopez', start: '2026-07-18', end: '2026-07-25', duration: '8 hrs', capacity: 40, enrolled: 12, status: 'Upcoming', materials: 'client_success.pdf' },
  { id: '5', title: 'Secure Cloud Dossiers & Document Security', category: 'Technical', trainer: 'Alex Rivera', start: '2026-07-05', end: '2026-07-12', duration: '10 hrs', capacity: 30, enrolled: 30, status: 'Ongoing', materials: 'cloud_security_audit.pdf' }
];

const INITIAL_ASSIGNMENTS = [
  { id: '1', title: 'Workforce OS Integration & Security', employeeName: 'Mission Alpha', employeeId: 'EMP-ALP', progress: 40, status: 'Ongoing' },
  { id: '2', title: 'Advanced React 19 & Next.js Core Patterns', employeeName: 'Mission Bravo', employeeId: 'EMP-BRA', progress: 85, status: 'Ongoing' },
  { id: '3', title: 'Leadership & Tactical Team Orchestration', employeeName: 'Mission Charlie', employeeId: 'EMP-CHA', progress: 100, status: 'Completed' },
  { id: '4', title: 'Secure Cloud Dossiers & Document Security', employeeName: 'Mission Delta', employeeId: 'EMP-DEL', progress: 100, status: 'Completed' },
  { id: '5', title: 'Advanced React 19 & Next.js Core Patterns', employeeName: 'Mission Echo', employeeId: 'EMP-ECH', progress: 10, status: 'Ongoing' }
];

export default function Training() {
  const [role, setRole] = useState(() => sessionStorage.getItem('role') || 'employee');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [activeTab, setActiveTab] = useState('programs'); // programs, progress, materials, certifications
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Data State
  const [programs, setPrograms] = useState(INITIAL_PROGRAMS);
  const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);

  // Program Creation Modal / Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProgram, setNewProgram] = useState({
    title: '', category: 'Technical', trainer: '', start: '', end: '', duration: '', capacity: 20, materials: ''
  });

  // Program Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    programId: '1', employeeName: 'Mission Alpha', employeeId: 'EMP-ALP'
  });

  // Track theme reactively
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Filter Programs
  const filteredPrograms = programs.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.trainer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Filter Assignments
  const filteredAssignments = assignments.filter(a => {
    return a.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           a.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Handler for adding a program
  const handleAddProgram = (e) => {
    e.preventDefault();
    if (!newProgram.title || !newProgram.trainer || !newProgram.start || !newProgram.end) {
      toast.error('All program fields are required');
      return;
    }
    const created = {
      ...newProgram,
      id: String(programs.length + 1),
      enrolled: 0,
      status: 'Upcoming'
    };
    setPrograms([created, ...programs]);
    setShowAddModal(false);
    setNewProgram({ title: '', category: 'Technical', trainer: '', start: '', end: '', duration: '', capacity: 20, materials: '' });
    toast.success('Training Program Created successfully!');
  };

  // Handler for assigning program
  const handleAssignProgram = (e) => {
    e.preventDefault();
    const prog = programs.find(p => p.id === assignForm.programId);
    if (!prog) return;

    // Update program enrollment count
    setPrograms(programs.map(p => p.id === prog.id ? { ...p, enrolled: p.enrolled + 1 } : p));

    const newAssign = {
      id: String(assignments.length + 1),
      title: prog.title,
      employeeName: assignForm.employeeName,
      employeeId: assignForm.employeeId,
      progress: 0,
      status: 'Ongoing'
    };

    setAssignments([newAssign, ...assignments]);
    setShowAssignModal(false);
    toast.success(`Assigned course to ${assignForm.employeeName}`);
  };

  // Handler for simulation progress update (employee perspective)
  const handleUpdateProgress = (assignmentId) => {
    setAssignments(assignments.map(a => {
      if (a.id === assignmentId) {
        const nextProg = Math.min(100, a.progress + 25);
        const nextStatus = nextProg === 100 ? 'Completed' : 'Ongoing';
        if (nextProg === 100) {
          toast.success(`Congratulations! Course "${a.title}" completed. Certificate available.`);
        } else {
          toast.success(`Progress updated to ${nextProg}%`);
        }
        return { ...a, progress: nextProg, status: nextStatus };
      }
      return a;
    }));
  };

  // Simulation certificate download
  const handleDownloadCertificate = (courseTitle) => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1200)),
      {
        loading: 'Generating Secure Certificate...',
        success: `Downloaded Certificate - ${courseTitle}.pdf`,
        error: 'Generation failed'
      }
    );
  };

  const isHR = role === 'hr' || role === 'admin';

  // Metrics Calculations
  const totalPrograms = programs.length;
  const activeEnrolled = assignments.filter(a => a.status === 'Ongoing').length;
  const completedTrainings = assignments.filter(a => a.status === 'Completed').length;
  const certificationRate = totalPrograms > 0 ? Math.round((completedTrainings / assignments.length) * 100) : 0;

  // Chart data: count by category
  const categoryChartData = [
    { name: 'Technical', count: programs.filter(p => p.category === 'Technical').length },
    { name: 'Soft Skills', count: programs.filter(p => p.category === 'Soft Skills').length },
    { name: 'Leadership', count: programs.filter(p => p.category === 'Leadership').length },
    { name: 'Compliance', count: programs.filter(p => p.category === 'Compliance').length }
  ];

  return (
    <div className="space-y-8 pb-24">
      {/* ─── TITLE BANNER ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-6 shadow-sm">
        <div>
          <h2 className="text-[20px] font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="text-[#00a76b]" size={24} />
            Training & Professional Development
          </h2>
          <p className="text-xs text-slate-400 dark:text-[#829e92] font-semibold mt-1">
            {isHR ? 'Orchestrate professional training modules, assign curricula, and track certifications.' : 'View your assigned curricula, track learning progress, and claim certifications.'}
          </p>
        </div>
        {isHR && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 border border-[#dcdbd3] dark:border-[#1a2d29] hover:border-[#00a76b] hover:text-[#00a76b] dark:text-[#a3b3af] rounded-full text-xs font-bold bg-white dark:bg-[#111c18] cursor-pointer transition-colors"
            >
              Assign Course
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-full font-bold text-xs transition-all cursor-pointer border-none shadow-sm flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Create Program</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── DYNAMIC STATISTICS CARD ROW ──────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Curricula', val: totalPrograms, info: 'Active Programs', color: COLORS.emerald, icon: BookOpen },
          { label: 'Active Learners', val: activeEnrolled, info: 'Current Assignments', color: COLORS.blue, icon: Users },
          { label: 'Certifications Issued', val: completedTrainings, info: 'Course completions', color: COLORS.purple, icon: Award },
          { label: 'Success Velocity', val: `${certificationRate}%`, info: 'Completion Rate', color: COLORS.amber, icon: TrendingUp }
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md transition-all flex flex-col justify-between h-[120px] group"
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
              <h3 className="text-[18px] font-black text-slate-800 dark:text-white leading-none mb-1">{card.val}</h3>
              <p className="text-[9px] font-bold text-[#829e92] dark:text-[#527068] uppercase tracking-widest">{card.info}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── MAIN WORKSPACE AND SIDEBAR MIX ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Course Catalog (Columns 1-8) */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-[#eceae3] dark:border-[#1a2d29]">
              {/* Tab Navigation */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'programs', label: 'Curricula Catalog' },
                  { id: 'progress', label: 'Progress Ledger' },
                  { id: 'materials', label: 'Dossier Resources' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#00a76b] text-white'
                        : 'bg-slate-50 dark:bg-[#111c18] text-slate-400 hover:text-slate-700 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Filtering / Search */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#111c18] text-xs font-semibold rounded-full border-none focus:outline-none focus:ring-1 focus:ring-[#00a76b]/20"
                  />
                </div>
              </div>
            </div>

            {/* TAB CONTENTS */}
            {activeTab === 'programs' && (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e2eae7] dark:border-[#13221e] bg-slate-50 dark:bg-[#111c18]/45">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[#829e92]">Course Title</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[#829e92]">Category</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[#829e92]">Trainer</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[#829e92] text-center">Enrollment</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[#829e92] text-center">Status</th>
                      {isHR && <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[#829e92] text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2eae7] dark:divide-[#13221e]">
                    {filteredPrograms.map((p, idx) => (
                      <tr key={idx} className="transition-colors hover:bg-slate-50 dark:hover:bg-[#111c18]/30">
                        <td className="px-4 py-4 text-xs font-bold text-slate-800 dark:text-white">
                          <div>
                            <p>{p.title}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{p.duration} • Starts {p.start}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold text-slate-400">{p.category}</td>
                        <td className="px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-350">{p.trainer}</td>
                        <td className="px-4 py-4 text-xs font-bold text-center tabular-nums">
                          {p.enrolled} / {p.capacity}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            p.status === 'Completed' ? 'bg-slate-100 text-slate-600 dark:bg-slate-900/60 dark:text-[#a3b3af]' :
                            p.status === 'Ongoing' ? 'bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        {isHR && (
                          <td className="px-4 py-4 text-right">
                            <button 
                              onClick={() => {
                                setPrograms(programs.filter(x => x.id !== p.id));
                                toast.success('Program decommissioned');
                              }}
                              className="p-1 hover:text-red-500 bg-transparent border-none cursor-pointer"
                              title="Delete Curricula"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="space-y-4">
                {filteredAssignments.map((a, idx) => (
                  <div key={idx} className="p-4 border border-[#eceae3] dark:border-[#1a2d29] rounded-xl bg-slate-50/50 dark:bg-[#111c18]/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white leading-tight">{a.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">
                        Learner: {a.employeeName} ({a.employeeId})
                      </p>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 dark:bg-[#162722] h-1.5 rounded-full overflow-hidden mt-3">
                        <div 
                          className="h-full bg-[#00a76b] transition-all duration-300"
                          style={{ width: `${a.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-800 dark:text-white tabular-nums">{a.progress}%</span>
                        <span className={`block text-[9px] font-black uppercase tracking-wider ${
                          a.status === 'Completed' ? 'text-green-500' : 'text-amber-500'
                        }`}>{a.status}</span>
                      </div>
                      
                      {/* Action buttons based on Role */}
                      {!isHR && a.status === 'Ongoing' && (
                        <button
                          onClick={() => handleUpdateProgress(a.id)}
                          className="px-3 py-1.5 bg-[#00a76b] hover:bg-[#00915c] text-white text-[10px] font-black rounded-lg border-none cursor-pointer flex items-center gap-1 uppercase"
                        >
                          <Play size={10} fill="currentColor" />
                          Resume Lesson
                        </button>
                      )}
                      
                      {a.status === 'Completed' && (
                        <button
                          onClick={() => handleDownloadCertificate(a.title)}
                          className="px-3 py-1.5 border border-purple-500/25 hover:bg-purple-500/10 text-purple-500 text-[10px] font-black rounded-lg bg-transparent cursor-pointer flex items-center gap-1 uppercase"
                        >
                          <Award size={10} />
                          Certificate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {programs.map((p, idx) => (
                  <div key={idx} className="p-4 border border-[#eceae3] dark:border-[#1a2d29] rounded-[18px] bg-slate-50/50 dark:bg-[#111c18]/20 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#00a76b]/10 text-[#00a76b] flex items-center justify-center">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-slate-700 dark:text-white leading-tight truncate">{p.title} Resource</h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">{p.materials || 'curricula_resources.pdf'}</p>
                    </div>
                    <button 
                      onClick={() => toast.success(`Initiated dossier download: ${p.materials || 'resources.pdf'}`)}
                      className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:text-[#00a76b] bg-transparent cursor-pointer transition-colors shrink-0"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Dashboard Sidebar (Columns 9-12) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Categories Chart */}
          <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-[#a3b3af] mb-1 uppercase tracking-wider">Curricula Breakdown</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-4">Subject distribution analysis</p>
            </div>
            
            <div className="h-[140px] w-full select-none">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 9, fill: isDark ? '#829e92' : '#9ca3af' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.emerald} radius={[3, 3, 0, 0]}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upcoming sessions panel */}
          <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
            <h3 className="text-xs font-black text-slate-800 dark:text-[#a3b3af] mb-4 uppercase tracking-wider">Upcoming Curricula</h3>
            <div className="space-y-4">
              {programs.filter(p => p.status === 'Upcoming').map((p, idx) => (
                <div key={idx} className="p-3 border border-[#eceae3] dark:border-[#1a2d29] rounded-xl bg-transparent">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{p.category}</span>
                    <span className="text-[9px] font-bold text-[#00a76b] uppercase tracking-wider">{p.start}</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-700 dark:text-white leading-tight mt-1">{p.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-2 font-semibold">Led by Trainer: {p.trainer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL: CREATE TRAINING PROGRAM ────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] w-full max-w-md p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#eceae3] dark:border-[#1a2d29]">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Create Curricula Module</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleAddProgram} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next.js Architecture Dossier"
                  value={newProgram.title}
                  onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none focus:border-[#00a76b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={newProgram.category}
                    onChange={(e) => setNewProgram({ ...newProgram, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none focus:border-[#00a76b]"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Soft Skills">Soft Skills</option>
                    <option value="Leadership">Leadership</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Duration</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10 hrs"
                    value={newProgram.duration}
                    onChange={(e) => setNewProgram({ ...newProgram, duration: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none focus:border-[#00a76b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Trainer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Shah"
                  value={newProgram.trainer}
                  onChange={(e) => setNewProgram({ ...newProgram, trainer: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none focus:border-[#00a76b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newProgram.start}
                    onChange={(e) => setNewProgram({ ...newProgram, start: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none focus:border-[#00a76b]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={newProgram.end}
                    onChange={(e) => setNewProgram({ ...newProgram, end: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none focus:border-[#00a76b]"
                  />
                </div>
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
                  Submit Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ASSIGN PROGRAM TO EMPLOYEE ──────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] w-full max-w-md p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#eceae3] dark:border-[#1a2d29]">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Assign Course Curriculum</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleAssignProgram} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Select Course</label>
                <select
                  value={assignForm.programId}
                  onChange={(e) => setAssignForm({ ...assignForm, programId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none focus:border-[#00a76b]"
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Employee Name</label>
                <select
                  value={assignForm.employeeName}
                  onChange={(e) => {
                    const map = {
                      'Mission Alpha': 'EMP-ALP',
                      'Mission Bravo': 'EMP-BRA',
                      'Mission Charlie': 'EMP-CHA',
                      'Mission Delta': 'EMP-DEL',
                      'Mission Echo': 'EMP-ECH'
                    };
                    setAssignForm({
                      ...assignForm,
                      employeeName: e.target.value,
                      employeeId: map[e.target.value] || 'EMP-GEN'
                    });
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] rounded-xl focus:outline-none focus:border-[#00a76b]"
                >
                  <option value="Mission Alpha">Mission Alpha (EMP-ALP)</option>
                  <option value="Mission Bravo">Mission Bravo (EMP-BRA)</option>
                  <option value="Mission Charlie">Mission Charlie (EMP-CHA)</option>
                  <option value="Mission Delta">Mission Delta (EMP-DEL)</option>
                  <option value="Mission Echo">Mission Echo (EMP-ECH)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-[#1a2d29] hover:bg-slate-50 rounded-full font-bold bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-full font-bold cursor-pointer border-none"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
