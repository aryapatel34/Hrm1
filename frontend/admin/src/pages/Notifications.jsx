import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, Send, Loader2, Users, Briefcase, UserCheck, ChevronDown, Trash2, Edit2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
  announcement: 'bg-orange-100 text-orange-600',
  task:         'bg-blue-100 text-blue-600',
  leave:        'bg-purple-100 text-purple-600',
  attendance:   'bg-green-100 text-green-600',
  emergency:    'bg-red-100 text-red-600',
  default:      'bg-gray-100 text-gray-600',
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);

  const [employees, setEmployees]         = useState([]);

  // form state
  const [form, setForm] = useState({ 
    message: '', 
    type: 'announcement', 
    targetRole: 'all', 
    targetUserId: '',
    specificRoleFilter: 'all',
    _targetRoleOpen: false,
    _roleFilterOpen: false,
    _empSelectOpen: false
  });
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const formRef = useRef(null);

  const token   = sessionStorage.getItem('token');
  const role    = sessionStorage.getItem('role') || 'admin';
  const headers = { Authorization: `Bearer ${token}` };
  const currentUserId = (() => { try { return JSON.parse(atob(token.split('.')[1]))?.id; } catch { return null; } })();

  // Click outside handler for custom dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formRef.current && !formRef.current.contains(event.target)) {
        setForm(f => {
          if (f._targetRoleOpen || f._roleFilterOpen || f._empSelectOpen) {
            return { ...f, _targetRoleOpen: false, _roleFilterOpen: false, _empSelectOpen: false };
          }
          return f;
        });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── FETCH ── */
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res  = await axios.get('/api/notifications', { headers });
      const data = res.data?.notifications ?? res.data ?? [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch notifications error:', err);
      toast.error('Could not load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchNotifications(); 
    const fetchEmployees = async () => {
      try {
        const res = await axios.get('/api/employees', { headers });
        setEmployees(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Fetch employees error:', err);
      }
    };
    fetchEmployees();
  }, []);

  /* ── BACKGROUND REFRESH ── */
  const backgroundRefresh = async () => {
    try {
      const res  = await axios.get('/api/notifications', { headers });
      const data = res.data?.notifications ?? res.data ?? [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Background refresh failed', err);
    }
  };

  /* ── DELETE NOTIFICATION ── */
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await axios.delete(`/api/notifications/${id}`, { headers });
      toast.success('Announcement deleted');
      backgroundRefresh();
    } catch (err) {
      toast.error('Failed to delete announcement');
    }
  };

  /* ── PREPARE EDIT ── */
  const handleEdit = (notif) => {
    setEditingId(notif._id);
    setForm({ 
      ...form, 
      message: notif.message, 
      type: notif.type,
      targetRole: 'all' // Reset targeting info since it can't be easily reversed
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Editing mode active. Update the message below.', { icon: '✏️' });
  };

  /* ── SEND OR UPDATE ANNOUNCEMENT ── */
  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) { toast.error('Please enter a message'); return; }
    if (!editingId && form.targetRole === 'specific' && !form.targetUserId) { toast.error('Please select an employee'); return; }
    
    setSending(true);
    try {
      if (editingId) {
        const res = await axios.put(`/api/notifications/${editingId}`, { message: form.message }, { headers });
        toast.success(res.data?.message || 'Announcement updated!');
        setEditingId(null);
        setForm({ message: '', type: 'announcement', targetRole: 'all', targetUserId: '', specificRoleFilter: 'all' });
        backgroundRefresh();
      } else {
        let targetLabel = 'All Employees';
        if (form.targetRole === 'specific') {
          const emp = employees.find(e => e.userId && e.userId._id === form.targetUserId);
          targetLabel = emp ? emp.userId.name : 'Specific Person';
        } else if (form.targetRole === 'employee') targetLabel = 'Employees Only';
        else if (form.targetRole === 'manager') targetLabel = 'Managers Only';
        else if (form.targetRole === 'hr') targetLabel = 'HR Only';
        else if (form.targetRole === 'admin') targetLabel = 'Admins Only';

        const payload = { ...form, targetLabel };

        const res = await axios.post('/api/notifications', payload, { headers });
        toast.success(res.data?.message || 'Announcement sent!');
        setForm({ message: '', type: 'announcement', targetRole: 'all', targetUserId: '', specificRoleFilter: 'all' });
        backgroundRefresh(); // Use backgroundRefresh for new sends as well to be consistent
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process request');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="px-3 md:px-5 pb-20 pt-0 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4 w-full">
        <h1 className="text-[28px] font-black text-[#201515] dark:text-white tracking-tight">
          Notification
        </h1>
        <button 
          onClick={fetchNotifications} 
          className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-full font-bold text-xs transition-all cursor-pointer border-none shadow-sm flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* ── SEND ANNOUNCEMENT FORM ── */}
        {role !== 'employee' && (
          <div className="xl:col-span-1">
            <div className="bg-white rounded-[5px] border border-[#eceae3] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#eceae3] bg-[#fffdf9]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[5px] bg-[#ff4f00] flex items-center justify-center">
                  <Send size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[14px] font-black text-[#201515]">Create Announcement</h2>
                  <p className="text-[11px] font-medium text-[#939084]">Send to employees by role</p>
                </div>
              </div>
            </div>

            <form ref={formRef} onSubmit={handleSend} className="p-6 space-y-5">
              {/* Target Role - Hide in edit mode */}
              {!editingId && (
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] mb-2">
                  Send To
                </label>
                <div className="relative">
                  <div 
                    onClick={() => setForm(f => ({ ...f, _targetRoleOpen: !f._targetRoleOpen, _roleFilterOpen: false, _empSelectOpen: false }))}
                    className={`w-full bg-[#fffdf9] border ${form._targetRoleOpen ? 'border-[#ff4f00]' : 'border-[#eceae3]'} rounded-[5px] px-4 py-3 text-[13px] font-bold text-[#201515] cursor-pointer flex justify-between items-center transition-colors`}
                  >
                    <span>
                      {{
                        'all': 'All Employees',
                        'employee': 'Employees Only',
                        'manager': 'Managers Only',
                        'hr': 'HR Only',
                        'admin': 'Admins Only',
                        'specific': 'Specific Person'
                      }[form.targetRole]}
                    </span>
                    <ChevronDown size={14} className={`text-[#939084] transition-transform ${form._targetRoleOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {form._targetRoleOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#eceae3] rounded-[8px] shadow-lg overflow-hidden z-20">
                      {[
                        {v: 'all', l: 'All Employees'},
                        {v: 'employee', l: 'Employees Only'},
                        {v: 'manager', l: 'Managers Only'},
                        ...(role !== 'manager' ? [{v: 'hr', l: 'HR Only'}] : []),
                        ...(role === 'admin' ? [{v: 'admin', l: 'Admins Only'}] : []),
                        {v: 'specific', l: 'Specific Person'}
                      ].map(opt => (
                        <div 
                          key={opt.v}
                          onClick={() => setForm(f => ({ ...f, targetRole: opt.v, targetUserId: '', _targetRoleOpen: false }))}
                          className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${form.targetRole === opt.v ? 'bg-[#ff4f00]/10 text-[#ff4f00]' : 'text-[#201515] hover:bg-[#fffdf9]'}`}
                        >
                          {opt.l}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Specific Person Selection */}
              {!editingId && form.targetRole === 'specific' && (
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] mb-2">
                    Select Employee
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Role Filter */}
                    <div className="relative">
                      <div 
                        onClick={() => setForm(f => ({ ...f, _roleFilterOpen: !f._roleFilterOpen, _targetRoleOpen: false, _empSelectOpen: false }))}
                        className={`w-full bg-[#fffdf9] border ${form._roleFilterOpen ? 'border-[#ff4f00]' : 'border-[#eceae3]'} rounded-[5px] px-4 py-3 text-[13px] font-bold text-[#201515] cursor-pointer flex justify-between items-center transition-colors`}
                      >
                        <span>
                          {{
                            'all': 'Any Role',
                            'employee': 'Employees',
                            'manager': 'Managers',
                            'hr': 'HR',
                            'admin': 'Admins'
                          }[form.specificRoleFilter]}
                        </span>
                        <ChevronDown size={14} className={`text-[#939084] transition-transform ${form._roleFilterOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {form._roleFilterOpen && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#eceae3] rounded-[8px] shadow-lg overflow-hidden z-20">
                          {[
                            {v: 'all', l: 'Any Role'},
                            {v: 'employee', l: 'Employees'},
                            {v: 'manager', l: 'Managers'},
                            ...(role !== 'manager' ? [{v: 'hr', l: 'HR'}] : []),
                            ...(role === 'admin' ? [{v: 'admin', l: 'Admins'}] : [])
                          ].map(opt => (
                            <div 
                              key={opt.v}
                              onClick={() => setForm(f => ({ ...f, specificRoleFilter: opt.v, targetUserId: '', _roleFilterOpen: false }))}
                              className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${form.specificRoleFilter === opt.v ? 'bg-[#ff4f00]/10 text-[#ff4f00]' : 'text-[#201515] hover:bg-[#fffdf9]'}`}
                            >
                              {opt.l}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Employee Name Select */}
                    <div className="relative">
                      <div 
                        onClick={() => setForm(f => ({ ...f, _empSelectOpen: !f._empSelectOpen, _targetRoleOpen: false, _roleFilterOpen: false }))}
                        className={`w-full bg-[#fffdf9] border ${form._empSelectOpen ? 'border-[#ff4f00]' : 'border-[#eceae3]'} rounded-[5px] px-4 py-3 text-[13px] font-bold text-[#201515] cursor-pointer flex justify-between items-center transition-colors`}
                      >
                        <span className="truncate">
                          {form.targetUserId ? employees.find(e => e.userId && e.userId._id === form.targetUserId)?.userId?.name || '-- Name --' : '-- Name --'}
                        </span>
                        <ChevronDown size={14} className={`text-[#939084] shrink-0 ml-2 transition-transform ${form._empSelectOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {form._empSelectOpen && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#eceae3] rounded-[8px] shadow-lg overflow-hidden z-20 max-h-60 overflow-y-auto">
                          <div 
                            onClick={() => setForm(f => ({ ...f, targetUserId: '', _empSelectOpen: false }))}
                            className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${!form.targetUserId ? 'bg-[#ff4f00]/10 text-[#ff4f00]' : 'text-[#201515] hover:bg-[#fffdf9]'}`}
                          >
                            -- Name --
                          </div>
                          {employees
                            .filter(emp => emp.userId && (form.specificRoleFilter === 'all' || emp.userId.role === form.specificRoleFilter))
                            .filter(emp => role === 'admin' || emp.userId.role !== 'admin')
                            .map(emp => (
                              <div 
                                key={emp.userId._id}
                                onClick={() => setForm(f => ({ ...f, targetUserId: emp.userId._id, _empSelectOpen: false }))}
                                className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${form.targetUserId === emp.userId._id ? 'bg-[#ff4f00]/10 text-[#ff4f00]' : 'text-[#201515] hover:bg-[#fffdf9]'}`}
                              >
                                {emp.userId.name}
                              </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Type */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] mb-2">
                  Notification Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['announcement', 'task', 'leave', 'emergency'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`px-3 py-2 rounded-[5px] text-[11px] font-black uppercase tracking-wider border transition-all capitalize ${
                        form.type === t
                          ? 'bg-[#ff4f00] text-white border-[#ff4f00]'
                          : 'bg-[#fffdf9] text-[#36342e] border-[#eceae3] hover:border-[#ff4f00]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] mb-2">
                  Message
                </label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={5}
                  placeholder="Type your announcement here..."
                  className="w-full bg-[#fffdf9] border border-[#eceae3] rounded-[5px] px-4 py-3 text-[13px] font-medium text-[#201515] placeholder-[#c5c0b1] focus:outline-none focus:border-[#ff4f00] resize-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-[#ff4f00] hover:bg-[#e64600] disabled:opacity-60 text-white px-6 py-3 rounded-[5px] font-black text-[13px] transition-all"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : editingId ? (
                  <Edit2 size={16} />
                ) : (
                  <Send size={16} />
                )}
                {sending ? 'Processing...' : editingId ? 'Update Announcement' : 'Send Announcement'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm({ message: '', type: 'announcement', targetRole: 'all', targetUserId: '', specificRoleFilter: 'all' }); }}
                  className="w-full mt-2 flex items-center justify-center bg-white border border-[#eceae3] hover:bg-gray-50 text-[#201515] px-6 py-3 rounded-[5px] font-black text-[13px] transition-all"
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>

          {/* Quick stats */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { label: 'Total Notifications', val: notifications.length, icon: Bell },
            ].map((s, i) => (
              <div key={i} className="col-span-2 bg-white border border-[#eceae3] rounded-[5px] p-4 text-center shadow-sm">
                <p className="text-[22px] font-black text-[#201515]">{s.val}</p>
                <p className="text-[10px] font-black text-[#939084] uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* ── NOTIFICATIONS LIST ── */}
        <div className={role === 'employee' ? 'xl:col-span-3' : 'xl:col-span-2'}>
          <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.01)] overflow-hidden">

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={36} className="animate-spin text-[#00a76b]" />
              </div>
            ) : (() => {
              // Apply manager specific filter
              const displayNotifications = role === 'manager' 
                ? notifications.filter(n => n.senderId === currentUserId)
                : notifications;

              if (displayNotifications.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mb-4">
                      <Bell size={28} className="text-[#00a76b]" />
                    </div>
                    <h3 className="text-[16px] font-bold text-slate-800 dark:text-white mb-2">No announcements found</h3>
                    <p className="text-[13px] font-medium text-slate-500 dark:text-[#829e92]">Send an announcement using the form on the left</p>
                  </div>
                );
              }

              return (
                <div>
                  <div className="divide-y divide-[#e2eae7] dark:divide-[#13221e]">
                    {(() => {
                      const totalPages = Math.ceil(displayNotifications.length / itemsPerPage);
                      const indexOfLastItem = currentPage * itemsPerPage;
                      const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                      const currentItems = displayNotifications.slice(indexOfFirstItem, indexOfLastItem);
                      
                      return currentItems.map((notif) => {
                        const colorClass = TYPE_COLORS[notif.type] || TYPE_COLORS.default;
                        const isCreator = notif.senderId && String(notif.senderId) === currentUserId;
                        return (
                          <div
                            key={notif._id}
                            className="p-6 flex items-start gap-4 transition-colors bg-white dark:bg-[#0c1512] hover:bg-slate-50 dark:hover:bg-[#111c18] group relative"
                          >
                            {/* Icon */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                              <Bell size={16} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pr-16">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-[14px] leading-snug font-bold text-slate-800 dark:text-white">
                                  {notif.message}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${colorClass}`}>
                                  {notif.type || 'general'}
                                </span>
                                {isCreator && notif.targetLabel && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-[#1a2d29] text-slate-500 dark:text-[#829e92]">
                                    Sent to: {notif.targetLabel}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-widest">
                                  {new Date(notif.createdAt).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Edit / Delete Actions */}
                            {isCreator && (
                              <div className="absolute right-5 top-5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                <button 
                                  onClick={() => handleEdit(notif)}
                                  className="p-1.5 text-slate-450 hover:text-[#ff4f00] hover:bg-orange-50 rounded"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(notif._id)}
                                  className="p-1.5 text-slate-450 hover:text-red-500 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Pagination Controls */}
                  {(() => {
                    const totalPages = Math.max(Math.ceil(displayNotifications.length / itemsPerPage), 1);
                    return (
                      <div className="px-6 py-4 bg-slate-50 dark:bg-[#111c18] border-t border-[#e2eae7] dark:border-[#13221e] flex items-center justify-between">
                        <button
                          onClick={() => {
                            setCurrentPage(prev => Math.max(prev - 1, 1));
                            document.querySelector('.max-h-\\[680px\\]')?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={currentPage === 1}
                          className="px-4 py-2 text-xs font-bold bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-xl text-slate-600 dark:text-[#a3b3af] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#111c18] transition-all cursor-pointer"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-bold text-slate-500 dark:text-[#829e92]">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => {
                            setCurrentPage(prev => Math.min(prev + 1, totalPages));
                            document.querySelector('.max-h-\\[680px\\]')?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 text-xs font-bold bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-xl text-slate-600 dark:text-[#a3b3af] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#111c18] transition-all cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Notifications;
