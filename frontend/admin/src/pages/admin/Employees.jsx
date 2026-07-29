import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Trash2, Edit3, User, Eye, CheckCircle, XCircle, MoreVertical, RefreshCw, ChevronDown, Power } from 'lucide-react';
import { API_BASE_URL, getImageUrl } from '@shared/services/api';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('admin_searchTerm') || '');
  const [filterRole, setFilterRole] = useState(() => sessionStorage.getItem('admin_filterRole') || '');
  const [filterStatus, setFilterStatus] = useState(() => sessionStorage.getItem('admin_filterStatus') || 'active');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);


  const fetchEmployees = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get('/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data || []);
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    sessionStorage.setItem('admin_searchTerm', searchTerm);
    sessionStorage.setItem('admin_filterRole', filterRole);
    sessionStorage.setItem('admin_filterStatus', filterStatus);
  }, [searchTerm, filterRole, filterStatus]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uniqueEmployees = Array.from(new Map(employees.map(emp => [emp._id, emp])).values());
  const filteredEmployees = uniqueEmployees.filter(emp => {
    const fullName = emp.fullName?.toLowerCase() || emp.userId?.name?.toLowerCase() || '';
    const email = emp.email?.toLowerCase() || emp.userId?.email?.toLowerCase() || '';
    const empId = emp.employeeId?.toLowerCase() || '';

    const matchesSearch = fullName.includes(searchTerm.trim().toLowerCase()) ||
      email.includes(searchTerm.trim().toLowerCase()) ||
      empId.includes(searchTerm.trim().toLowerCase());

    const matchesRole = filterRole ? (emp.role === filterRole || emp.userId?.role === filterRole) : true;

    const empStatus = emp.status?.toLowerCase() || emp.userId?.status?.toLowerCase() || 'active';
    const matchesStatus = filterStatus ? empStatus === filterStatus : true;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleToggleStatus = async (emp) => {
    const currentStatus = emp.status?.toLowerCase() || emp.userId?.status?.toLowerCase() || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'inactive' ? 'Deactivate' : 'Reactivate';

    if (window.confirm(`Are you sure you want to ${actionText} this employee? Their status will be updated to ${newStatus.toUpperCase()}.`)) {
      try {
        const token = sessionStorage.getItem('token');
        await axios.patch(`/api/employees/${emp._id}/status`,
          { status: newStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchEmployees();
      } catch (err) {
        console.error('Status update failed:', err);
      }
    }
  };

  const handleDelete = async (empId) => {
    if (window.confirm('Are you sure you want to remove this employee? This will change their status to INACTIVE instead of permanently deleting the record.')) {
      try {
        const token = sessionStorage.getItem('token');
        await axios.delete(`/api/employees/${empId}`, { headers: { Authorization: `Bearer ${token}` } });
        fetchEmployees();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleRejectAll = async () => {
    const pendingNodes = employees.filter(e => e.status !== 'active' && e.userId?.status !== 'active');
    if (pendingNodes.length === 0) {
      alert('No unverified personnel nodes detected in current matrix.');
      return;
    }

    if (window.confirm(`⚠️ REGISTRY ALERT: You are about to mass-reject/deactivate ${pendingNodes.length} personnel nodes. Proceed?`)) {
      setLoading(true);
      try {
        const token = sessionStorage.getItem('token');
        await Promise.all(
          pendingNodes.map(e => axios.delete(`/api/employees/${e._id}`, { headers: { Authorization: `Bearer ${token}` } }))
        );
        fetchEmployees();
      } catch (err) {
        console.error('Mass veto failed:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="animate-fade-in pb-20 px-8">
      {/* HEADER SECTION */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end border-b border-[#c5c0b1] dark:border-[#38352e] pb-6">
        <div>
          <h1 className="zap-display-hero text-[#201515] dark:text-white">Personnel <span className="text-[#00a76b]">Registry</span></h1>
          <p className="zap-caption-upper text-[#939084] dark:text-[#a3a094] mt-2">Managing Institutional Personnel Matrix</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleRejectAll} className="zap-btn zap-btn-orange h-12 px-6 flex items-center gap-2">
            <XCircle size={16} />
            Reject All Pending
          </button>
          <button onClick={() => navigate('/admin/create-user')} className="zap-btn zap-btn-orange h-12 px-6">
            <UserPlus size={16} className="mr-2" />
            Create User
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-[#fffdf9] dark:bg-[#181612] p-6 border border-[#c5c0b1] dark:border-[#38352e] rounded-xl flex flex-col md:flex-row justify-between items-center gap-6 mb-10 shadow-sm">
        <div className="relative w-full md:w-96 flex items-center">
          <Search size={18} className="absolute left-4 text-[#939084]" />
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-white dark:bg-[#0f0d0a] border border-[#c5c0b1] dark:border-[#38352e] rounded-xl pl-12 pr-4 text-[14px] font-bold text-[#201515] dark:text-white focus:outline-none focus:border-[#00a76b] transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="relative min-w-[180px]" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full h-12 px-6 bg-white dark:bg-[#0f0d0a] border border-[#00a76b] rounded-xl text-[12px] font-black uppercase tracking-widest text-[#00a76b] outline-none flex items-center justify-between gap-4 cursor-pointer transition-all hover:bg-[#00a76b]/5 shadow-sm"
            >
              {filterRole === '' ? 'All Roles' : filterRole.toUpperCase()}
              <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-[#181612] border border-[#eceae3] dark:border-[#38352e] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {[
                  { id: '', label: 'All Roles' },
                  { id: 'admin', label: 'Admin' },
                  { id: 'hr', label: 'HR' },
                  { id: 'manager', label: 'Manager' },
                  { id: 'employee', label: 'Employee' }
                ].map((role) => (
                  <div key={role.id} onClick={() => { setFilterRole(role.id); setIsDropdownOpen(false); }} className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-[#201515] dark:text-white hover:bg-[#00a76b]/5 hover:text-[#00a76b] cursor-pointer transition-colors border-b border-[#f8f8f8] dark:border-slate-800 last:border-none">
                    {role.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative min-w-[150px]">
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="w-full h-12 px-6 bg-white border border-[#ff4f00] rounded-xl text-[12px] font-black uppercase tracking-widest text-[#ff4f00] outline-none flex items-center justify-between gap-4 cursor-pointer transition-all hover:bg-[#ff4f00]/5 shadow-sm"
            >
              {filterStatus === '' ? 'All Statuses' : filterStatus.toUpperCase()}
              <ChevronDown size={16} className={`transition-transform ${isStatusDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            {isStatusDropdownOpen && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-[#eceae3] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {[
                  { id: '', label: 'All Statuses' },
                  { id: 'active', label: 'Active' },
                  { id: 'inactive', label: 'Inactive' }
                ].map((statusOpt) => (
                  <div key={statusOpt.id} onClick={() => { setFilterStatus(statusOpt.id); setIsStatusDropdownOpen(false); }} className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-[#201515] hover:bg-[#ff4f00]/5 hover:text-[#ff4f00] cursor-pointer transition-colors border-b border-[#f8f8f8] last:border-none">
                    {statusOpt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-8 border-l border-[#c5c0b1] h-12 flex items-center">
            <span className="text-[13px] font-bold text-[#939084] uppercase tracking-wider">Nodes: <span className="text-[#201515] font-black ml-2">{filteredEmployees.length}</span></span>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="overflow-x-auto bg-white dark:bg-[#181612] rounded-2xl border border-[#eceae3] dark:border-[#38352e] shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f8f9fa] dark:bg-[#0f0d0a]/50 border-b border-[#eceae3] dark:border-[#38352e] text-left">
              <th className="py-5 px-6 text-[11px] font-bold text-[#939084] dark:text-[#a3a094] uppercase tracking-widest">Employee ID</th>
              <th className="py-5 px-6 text-[11px] font-bold text-[#939084] dark:text-[#a3a094] uppercase tracking-widest">Personnel Entity</th>
              <th className="py-5 px-6 text-[11px] font-bold text-[#939084] dark:text-[#a3a094] uppercase tracking-widest text-center">Status Matrix</th>
              <th className="py-5 px-6 text-[11px] font-bold text-[#939084] dark:text-[#a3a094] uppercase tracking-widest text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eceae3] dark:divide-[#38352e]">
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center py-24">
                  <RefreshCw size={24} className="text-[#00a76b] animate-spin mx-auto mb-4" />
                  <p className="zap-caption-upper text-[#939084] dark:text-[#a3a094]">Syncing Matrix...</p>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-24">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-[#162722] rounded-full flex items-center justify-center mx-auto text-gray-400 dark:text-gray-500 mb-3">
                    <User size={20} />
                  </div>
                  <h3 className="text-sm font-semibold text-[#201515] dark:text-white">No employee nodes found</h3>
                  <p className="text-xs text-[#939084] dark:text-[#a3a094] mt-1">Try adjusting your filters or search terms.</p>
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((emp) => (
                <tr key={emp._id} className="hover:bg-[#fffdf9] dark:hover:bg-[#1c2e26]/30 transition-colors group">
                  <td className="py-6 px-6"><span className="font-black text-[13px] text-[#201515] dark:text-white">{emp.employeeId || 'NODE-UNDEF'}</span></td>
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#eceae3] dark:bg-[#282520] border border-[#c5c0b1] dark:border-[#38352e] rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
                        {emp.profileImage ? <img src={emp.profileImage} alt="User" className="w-full h-full object-cover" /> : <User size={20} className="text-[#939084] dark:text-[#a3a094]" />}
                      </div>
                      <div>
                        <p className="text-[16px] font-black text-[#201515] leading-none mb-1 group-hover:text-[#ff4f00] transition-colors">{emp.fullName || emp.userId?.name || 'Anonymous Node'}</p>
                        <p className="text-[12px] font-bold text-[#939084] uppercase tracking-widest mb-1">{emp.email || emp.userId?.email}</p>
                        <p className="text-[12px] font-bold text-[#ff4f00] leading-none">{emp.designation || emp.position || 'Employee'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div className="flex flex-col items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${emp.role === 'admin' ? 'bg-[#201515] dark:bg-slate-800 text-white' : 'bg-[#00a76b]/10 text-[#00a76b]'}`}>
                        {emp.role?.toUpperCase() || emp.userId?.role?.toUpperCase() || 'NODE'}
                      </span>
                      <div className={`flex items-center gap-1 text-[11px] font-bold ${emp.status === 'active' || emp.userId?.status === 'active' ? 'text-[#24a148]' : 'text-[#00a76b]'}`}>
                        {(emp.status === 'active' || emp.userId?.status === 'active') ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {(emp.status?.toUpperCase() || emp.userId?.status?.toUpperCase() || 'ACTIVE')}
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => navigate(`/admin/employees/view/${emp._id}`)} className="w-10 h-10 flex items-center justify-center text-[#201515] bg-white border border-[#eceae3] rounded-xl hover:border-[#ff4f00] hover:text-[#ff4f00] transition-all shadow-sm"><Eye size={18} /></button>
                      <button onClick={() => navigate(`/admin/employees/edit/${emp._id}`)} className="w-10 h-10 flex items-center justify-center text-[#201515] bg-white border border-[#eceae3] rounded-xl hover:border-[#ff4f00] hover:text-[#ff4f00] transition-all shadow-sm"><Edit3 size={18} /></button>
                      <button
                        onClick={() => handleDelete(emp._id)}
                        className="w-10 h-10 flex items-center justify-center text-[#201515] bg-white border border-[#eceae3] rounded-xl hover:border-red-500 hover:text-red-500 transition-all shadow-sm"
                        title="Remove/Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        className={`w-10 h-10 flex items-center justify-center bg-white border border-[#eceae3] rounded-xl transition-all shadow-sm ${(emp.status === 'active' || emp.userId?.status === 'active') ? 'text-[#ff4f00] hover:bg-[#ff4f00] hover:text-white' : 'text-[#24a148] hover:bg-[#24a148] hover:text-white'}`}
                        title={(emp.status === 'active' || emp.userId?.status === 'active') ? 'Change to Inactive' : 'Change to Active'}
                      >
                        <Power size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-8 py-5 bg-gray-50 border-t border-[#eceae3]">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#939084]">
            Page {currentPage} of {totalPages} ({filteredEmployees.length} total nodes)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-[#eceae3] ${currentPage === 1 ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-white text-[#201515] hover:border-[#ff4f00] hover:text-[#ff4f00] cursor-pointer'}`}
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNo) => (
              <button
                key={pageNo}
                onClick={() => setCurrentPage(pageNo)}
                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all border ${currentPage === pageNo ? 'bg-[#ff4f00] text-white border-[#ff4f00]' : 'bg-white text-[#201515] border-[#eceae3] hover:border-[#ff4f00] hover:text-[#ff4f00] cursor-pointer'}`}
              >
                {pageNo}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-[#eceae3] ${currentPage === totalPages ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-white text-[#201515] hover:border-[#ff4f00] hover:text-[#ff4f00] cursor-pointer'}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
