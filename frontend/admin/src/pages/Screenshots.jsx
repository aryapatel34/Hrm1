import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Camera, Search, Calendar, User, 
  Filter, RefreshCw, Download, ExternalLink,
  ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon,
  Trash2, Eye, X, Folder, Users, Shield, History, ArrowLeft
} from 'lucide-react';
import { API_BASE_URL, getImageUrl } from '@shared/services/api';

const getLocalISODate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Screenshots = () => {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [searchEmployeeName, setSearchEmployeeName] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [selectedImage, setSelectedImage] = useState(null);
  const [navigationPath, setNavigationPath] = useState([]); // ['role', 'name']
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  const generateCalendarDays = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthTotalDays - i));
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    return days;
  };
  
  const token = sessionStorage.getItem('token');
  const role = sessionStorage.getItem('role');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/screenshot/all', {
        params: { role, userId: sessionStorage.getItem('userId') },
        headers: { Authorization: `Bearer ${token}` }
      });
      setScreenshots(res.data);
    } catch (err) {
      console.error('Fetch Screenshots Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 📡 REAL-TIME SYNC ENGINE
    const socket = io(window.location.origin, {
       transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
       console.log('📡 Connected to Live Surveillance Stream');
       // Join appropriate notification room
       socket.emit('join_notifications', { userId: sessionStorage.getItem('userId'), role });
    });

    socket.on('new_screenshot', (data) => {
       console.log('📸 New Live Trace Captured:', data);
       // Add to the top of the list instantly
       setScreenshots(prev => [data, ...prev]);
    });

    return () => {
       socket.off('new_screenshot');
       socket.disconnect();
    };
  }, [role]);

  // 📁 HIERARCHICAL GROUPING LOGIC
  const getRoles = () => {
    if (role === 'admin') return ['admin', 'hr', 'manager', 'employee'];
    if (role === 'hr') return ['manager', 'employee'];
    return []; // Managers jump straight to names
  };

  const getFilteredData = () => {
    let data = screenshots;
    if (navigationPath.length > 0) {
      data = data.filter(s => s.role === navigationPath[0]);
    }
    if (navigationPath.length > 1) {
      data = data.filter(s => s.employeeName === navigationPath[1]);
    }
    
    // Apply search filters on top of navigation
    return data.filter(s => {
      const matchesUser = s.employeeName?.toLowerCase().includes(filterUser.toLowerCase());
      const matchesDate = filterDate ? s.timestamp.startsWith(filterDate) : true;
      return matchesUser && matchesDate;
    });
  };

  const filtered = getFilteredData();

  // Helper to count entries in a folder
  const countInFolder = (type, value) => {
    if (type === 'role') return screenshots.filter(s => s.role === value).length;
    if (type === 'name') return screenshots.filter(s => s.role === navigationPath[0] && s.employeeName === value).length;
    return 0;
  };

  // Helper for single download (bypasses cross-origin issue)
  const handleSingleDownload = async (e, url, filename) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Cloudinary specific forced download (bypasses CORS fetch issues in production)
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      const downloadUrl = url.replace('/upload/', '/upload/fl_attachment/');
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Failed to download image:', err);
      window.open(url, '_blank');
    }
  };

  // 📦 BULK DOWNLOAD ENGINE (Generates a single ZIP file)
  const handleDownloadAll = async () => {
    if (filtered.length === 0) return;
    if (!window.confirm(`Download all ${filtered.length} screenshots as a single ZIP archive?`)) return;

    setLoading(true);
    try {
      // Load JSZip dynamically from CDN if not already loaded
      if (!window.JSZip) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const zip = new window.JSZip();
      
      // Fetch all images as blobs and add them to the zip
      const downloadPromises = filtered.map(async (s) => {
        try {
          const imageUrl = getImageUrl(s.imageUrl);
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          
          // Generate a clean filename: BhavikKukadiya-2026-07-23-16-59.png
          const timestampDate = new Date(s.timestamp);
          const dateStr = getLocalISODate(timestampDate);
          const timeStr = timestampDate.toTimeString().split(' ')[0].replace(/:/g, '-');
          const filename = `${s.employeeName}-${dateStr}-${timeStr}.png`;
          
          zip.file(filename, blob);
        } catch (err) {
          console.error(`Failed to download image: ${s.imageUrl}`, err);
        }
      });

      await Promise.all(downloadPromises);

      // Generate the zip and trigger download
      const content = await zip.generateAsync({ type: 'blob' });
      const dateStr = filterDate || getLocalISODate();
      const zipFilename = `Screenshots-${navigationPath[1] || 'All'}-${dateStr}.zip`;
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = zipFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to generate ZIP archive: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const setQuickDate = (type) => {
    const now = new Date();
    if (type === 'today') setFilterDate(getLocalISODate(now));
    if (type === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      setFilterDate(getLocalISODate(yesterday));
    }
    if (type === 'all') setFilterDate('');
  };

  const renderBreadcrumbs = () => (
    <div className="flex items-center gap-3 mb-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#939084]">
       <button onClick={() => setNavigationPath([])} className={`hover:text-[#00a76b] transition-colors ${navigationPath.length === 0 ? 'text-[#201515]' : ''}`}>
          Registry Root
       </button>
       {navigationPath.map((path, idx) => (
         <React.Fragment key={idx}>
            <ChevronRight size={14} className="opacity-40" />
            <button 
              onClick={() => setNavigationPath(navigationPath.slice(0, idx + 1))}
              className={`hover:text-[#00a76b] transition-colors ${idx === navigationPath.length - 1 ? 'text-[#201515]' : ''}`}
            >
               {path}
            </button>
         </React.Fragment>
       ))}
    </div>
  );

  return (
    <div className="animate-fade-in pb-24">
      {/* HEADER SECTION */}
      <div className="mb-4 border-b border-[#c5c0b1] pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 -mt-2">
        <div>
          <h1 className="zap-display-hero">Screenshot</h1>
        </div>
      </div>

      {/* BREADCRUMBS & FILTERS LINE */}
      <div className="flex items-center justify-between gap-4 mb-4 animate-fade-in w-full">
         {/* Left Side: Breadcrumbs */}
         <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#939084]">
            <button onClick={() => setNavigationPath([])} className={`hover:text-[#00a76b] transition-colors ${navigationPath.length === 0 ? 'text-[#201515]' : ''}`}>
               All Folders
            </button>
            {navigationPath.map((path, idx) => (
              <React.Fragment key={idx}>
                 <ChevronRight size={14} className="opacity-40" />
                 <button 
                   onClick={() => setNavigationPath(navigationPath.slice(0, idx + 1))}
                   className={`hover:text-[#00a76b] transition-colors ${idx === navigationPath.length - 1 ? 'text-[#201515]' : ''}`}
                 >
                    {path.charAt(0).toUpperCase() + path.slice(1)}
                 </button>
              </React.Fragment>
            ))}
         </div>

         {/* Right Side: Page Controls */}
         <div className="flex flex-wrap items-center justify-end gap-4">
            {/* Filters (Only visible when viewing final images) */}
            {navigationPath.length === (role === 'manager' ? 1 : 2) && (
              <>
                 {/* Custom Theme Date Picker */}
                 <div className="relative">
                    <button 
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#c5c0b1] hover:border-[#00a76b] text-sm font-bold text-[#201515] focus:outline-none transition-all shadow-sm relative pl-11 w-48"
                    >
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" size={16} />
                      <span>{filterDate ? new Date(filterDate).toLocaleDateString('en-GB') : 'dd-mm-yyyy'}</span>
                      <span className="text-[10px] text-[#939084] font-black">▼</span>
                    </button>

                    {showDatePicker && (
                      <div className="absolute right-0 mt-2 z-50 bg-[#fffdf9] border border-[#c5c0b1] rounded-2xl shadow-2xl p-4 w-72 animate-fade-in font-sans font-normal text-left">
                        {/* Calendar Header */}
                        <div className="flex justify-between items-center mb-3">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const d = new Date(currentCalendarMonth);
                              d.setMonth(d.getMonth() - 1);
                              setCurrentCalendarMonth(d);
                            }}
                            className="p-1.5 hover:bg-[#eceae3] rounded-lg transition-colors text-[#201515]"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#201515]">
                            {currentCalendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const d = new Date(currentCalendarMonth);
                              d.setMonth(d.getMonth() + 1);
                              setCurrentCalendarMonth(d);
                            }}
                            className="p-1.5 hover:bg-[#eceae3] rounded-lg transition-colors text-[#201515]"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>

                        {/* Days of Week */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <span key={d} className="text-[9px] font-black uppercase tracking-widest text-[#939084] py-1">{d}</span>
                          ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {generateCalendarDays(currentCalendarMonth).map((day, idx) => {
                            const isCurrentMonth = day.getMonth() === currentCalendarMonth.getMonth();
                            const isSelected = filterDate && new Date(filterDate).toDateString() === day.toDateString();
                            const isToday = new Date().toDateString() === day.toDateString();
                            const isDisabled = day > new Date();
                            return (
                              <button
                                key={idx}
                                disabled={isDisabled}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFilterDate(getLocalISODate(day));
                                  setShowDatePicker(false);
                                }}
                                className={`text-[10px] font-bold py-1.5 rounded-lg transition-all ${
                                  isSelected 
                                    ? 'bg-[#00a76b] text-white shadow-md' 
                                    : isToday
                                      ? 'bg-[#eceae3] text-[#00a76b] border border-[#00a76b]/30'
                                      : isCurrentMonth 
                                        ? 'text-[#201515] hover:bg-[#eceae3]' 
                                        : 'text-[#939084] opacity-30 hover:bg-[#eceae3]'
                                } ${isDisabled ? 'opacity-20 cursor-not-allowed' : ''}`}
                              >
                                {day.getDate()}
                              </button>
                            );
                          })}
                        </div>

                        {/* Footer actions */}
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#eceae3] text-[9px] font-black uppercase tracking-widest">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterDate('');
                              setShowDatePicker(false);
                            }}
                            className="text-[#ff4f00] hover:underline"
                          >
                            Clear
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterDate(getLocalISODate());
                              setShowDatePicker(false);
                            }}
                            className="text-[#00a76b] hover:underline"
                          >
                            Today
                          </button>
                        </div>
                      </div>
                    )}
                 </div>

                 {/* Total Images Count Card */}
                 <div className="flex items-center px-4 py-2.5 bg-white border border-[#c5c0b1] rounded-xl text-sm font-bold text-[#201515] shadow-sm">
                    {filtered.length} Captures
                 </div>

                 {/* Download All Button */}
                 <button 
                   onClick={handleDownloadAll}
                   className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00a76b] hover:bg-[#201515] text-white text-sm font-bold transition-all shadow-sm"
                 >
                   <Download size={15} /> Download All
                 </button>
              </>
            )}

            {/* View Mode Toggle (Placed at the end) */}
            <div className="flex bg-[#eceae3] p-1 rounded-xl h-10 items-center">
               <button 
                 onClick={() => setViewMode('grid')}
                 className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#00a76b]' : 'text-[#939084] hover:text-[#201515]'}`}
               >
                  <LayoutGrid size={16} />
               </button>
               <button 
                 onClick={() => setViewMode('list')}
                 className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#00a76b]' : 'text-[#939084] hover:text-[#201515]'}`}
               >
                  <ListIcon size={16} />
               </button>
            </div>

            {/* Refresh Button (Placed at the very end) */}
            <button 
              onClick={fetchData} 
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-[#c5c0b1] hover:border-[#00a76b] text-[#201515] transition-all shadow-sm focus:outline-none"
            >
               <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
         </div>
      </div>

      {/* 📅 QUICK DATE FILTERS */}
      {navigationPath.length === (role === 'manager' ? 1 : 2) && (
        <div className="flex gap-3 mb-8 animate-fade-in">
           <button 
             onClick={() => setQuickDate('today')}
             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterDate === getToday() ? 'bg-[#00a76b] text-white shadow-lg' : 'bg-[#eceae3] text-[#939084] hover:text-[#201515]'}`}
           >
              Today
           </button>
           <button 
             onClick={() => setQuickDate('yesterday')}
             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'bg-[#00a76b] text-white shadow-lg' : 'bg-[#eceae3] text-[#939084] hover:text-[#201515]'}`}
           >
              Yesterday
           </button>
           <button 
             onClick={() => setQuickDate('all')}
             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!filterDate ? 'bg-[#201515] text-white shadow-lg' : 'bg-transparent text-[#939084] hover:text-[#201515] border border-[#eceae3]'}`}
           >
              View All
           </button>
        </div>
      )}

      {/* CONTENT ENGINE */}
      {loading ? (
        <div className="py-32 text-center opacity-40">
           <RefreshCw size={48} className="mx-auto mb-6 animate-spin text-[#00a76b]" />
           <p className="text-[14px] font-black uppercase tracking-[0.2em]">Loading Registry...</p>
        </div>
      ) : (
        <>
          {/* LEVEL 0: ROLE FOLDERS (Admin/HR Only) */}
          {navigationPath.length === 0 && role !== 'manager' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
               {getRoles().map(r => (
                 <div 
                   key={r} 
                   onClick={() => setNavigationPath([r])}
                   className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-lg dark:hover:shadow-emerald-950/20 hover:scale-[1.02] transition-all cursor-pointer flex flex-col items-center text-center group"
                 >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-[#00a76b] flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                       <Folder size={32} />
                    </div>
                    <h3 className="text-[16px] font-black uppercase tracking-widest text-slate-800 dark:text-white mb-2">{r} Folders</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-widest italic">{countInFolder('role', r)} Total Captures</p>
                 </div>
               ))}
            </div>
          )}

          {/* LEVEL 1: EMPLOYEE NAME FOLDERS */}
          {((navigationPath.length === 1 && role !== 'manager') || (navigationPath.length === 0 && role === 'manager')) && (
            <div className="space-y-8">
              {/* Employee search bar */}
              <div className="relative max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" size={18} />
                 <input 
                   type="text" 
                   placeholder="Search employee folder..." 
                   value={searchEmployeeName}
                   onChange={(e) => setSearchEmployeeName(e.target.value)}
                   className="w-full h-14 pl-12 pr-4 bg-white border border-[#c5c0b1] rounded-2xl text-[14px] font-bold text-[#201515] focus:outline-none focus:border-[#00a76b] shadow-sm italic"
                 />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                 {[...new Set(screenshots
                    .filter(s => role === 'manager' ? true : s.role === navigationPath[0])
                    .map(s => s.employeeName))]
                    .filter(name => name?.toLowerCase().includes(searchEmployeeName.toLowerCase()))
                    .map(name => (
                      <div 
                        key={name} 
                        onClick={() => setNavigationPath(role === 'manager' ? ['employee', name] : [navigationPath[0], name])}
                        className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-lg dark:hover:shadow-emerald-950/20 hover:scale-[1.02] transition-all cursor-pointer flex items-center gap-6 group"
                      >
                         <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-[#1a2d29] text-white flex items-center justify-center font-black italic text-lg shadow-sm">
                            {name?.[0]}
                         </div>
                         <div className="flex-1">
                            <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-800 dark:text-white mb-1">{name}</h3>
                            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-widest italic">
                               <History size={12} className="text-[#00a76b]" />
                               {countInFolder('name', name) || screenshots.filter(s => s.employeeName === name).length} captures
                            </div>
                         </div>
                      </div>
                    ))}
              </div>
            </div>
          )}

          {/* LEVEL 2: ACTUAL SCREENSHOTS (Visible only when a person is selected) */}
          {navigationPath.length === 2 && (
            <>
              {filtered.length === 0 ? (
                <div className="py-32 text-center opacity-40">
                   <Camera size={48} className="mx-auto mb-6 text-[#939084]" />
                   <p className="text-[14px] font-black uppercase tracking-[0.2em]">No screenshots found for {navigationPath[1]}</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="space-y-12 animate-fade-in">
                   {Object.entries(
                     filtered.reduce((groups, s) => {
                       const d = new Date(s.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                       if (!groups[d]) groups[d] = [];
                       groups[d].push(s);
                       return groups;
                     }, {})
                   ).map(([date, group]) => (
                     <div key={date} className="space-y-6">
                        <div className="flex items-center gap-4">
                           <h2 className="text-[18px] font-black text-[#201515] italic">{date}</h2>
                           <div className="h-px flex-1 bg-[#eceae3]" />
                           <span className="text-[9px] font-bold text-[#939084] uppercase tracking-widest">{group.length} Captures</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                           {group.map((s) => (
                             <div key={s._id} className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-0 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-lg dark:hover:shadow-emerald-950/20 hover:scale-[1.01] transition-all cursor-pointer group">
                                <div 
                                  className="relative aspect-video bg-[#201515] overflow-hidden"
                                  onClick={() => setSelectedImage(getImageUrl(s.imageUrl))}
                                >
                                   <img 
                                     src={getImageUrl(s.imageUrl)} 
                                     alt="Capture" 
                                     className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" 
                                   />
                                </div>
                                <div className="p-6">
                                   <div className="flex justify-between items-start mb-4">
                                      <div>
                                         <p className="text-[14px] font-black text-slate-800 dark:text-white uppercase italic">{s.employeeName}</p>
                                         <p className="text-[10px] font-bold text-[#00a76b] uppercase tracking-widest mt-1">{s.role}</p>
                                      </div>
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => setSelectedImage(getImageUrl(s.imageUrl))}
                                          className="w-8 h-8 rounded-lg bg-[#eceae3] dark:bg-[#1a2d29] flex items-center justify-center text-slate-800 dark:text-white hover:bg-[#00a76b] hover:text-white transition-all"
                                        >
                                          <Eye size={14} />
                                        </button>
                                        <button 
                                          onClick={(e) => handleSingleDownload(e, getImageUrl(s.imageUrl), `Screenshot-${s.employeeName}-${new Date(s.timestamp).toLocaleDateString()}.png`)}
                                          className="w-8 h-8 rounded-lg bg-[#eceae3] dark:bg-[#1a2d29] flex items-center justify-center text-slate-800 dark:text-white hover:bg-[#00a76b] hover:text-white transition-all"
                                        >
                                          <Download size={14} />
                                        </button>
                                      </div>
                                   </div>
                                   <div className="pt-4 border-t border-[#eceae3] dark:border-[#13221e] flex justify-between items-center text-[10px] font-black text-slate-500 dark:text-[#829e92] uppercase tracking-widest italic">
                                      <span>{new Date(s.timestamp).toLocaleDateString()}</span>
                                      <span>{new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                   ))}
                </div>
      ) : (
        <div className="bg-white dark:bg-[#181612] rounded-2xl border border-gray-200 dark:border-[#38352e] shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                 <thead>
                    <tr className="bg-gray-50 dark:bg-[#1e1c18] border-b border-gray-200 dark:border-[#38352e]">
                       <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Employee Name</th>
                       <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Capture Date</th>
                       <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Screenshot</th>
                       <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-[#a3a094] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-[#38352e]">
                    {filtered.map((s) => (
                       <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-[#282520] transition-colors group">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#201515] text-white flex items-center justify-center font-black italic">
                                   {s.employeeName?.[0]}
                                </div>
                                <div>
                                   <p className="text-[13px] font-black text-[#201515] uppercase italic">{s.employeeName}</p>
                                   <p className="text-[9px] font-bold text-[#00a76b] uppercase tracking-widest">{s.role}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <p className="text-[12px] font-black text-[#201515] italic">{new Date(s.timestamp).toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4">
                             <div className="w-24 h-14 rounded-lg bg-[#201515] overflow-hidden border border-[#c5c0b1] cursor-pointer" onClick={() => setSelectedImage(getImageUrl(s.imageUrl))}>
                                <img src={getImageUrl(s.imageUrl)} alt="" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => setSelectedImage(getImageUrl(s.imageUrl))}
                                  className="p-2 text-[#939084] hover:text-[#00a76b] transition-colors"
                                >
                                  <Eye size={18} />
                                </button>
                                <button 
                                  onClick={(e) => handleSingleDownload(e, getImageUrl(s.imageUrl), `Screenshot-${s.employeeName}.png`)}
                                  className="p-2 text-[#939084] hover:text-[#00a76b] transition-colors"
                                >
                                  <Download size={18} />
                                </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}
            </>
          )}
        </>
      )}

      {/* 🖼️ PREMIUM PREVIEW MODAL */}
      {selectedImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-12 animate-fade-in">
           {/* Glass Background */}
           <div 
             className="absolute inset-0 bg-[#201515]/20 backdrop-blur-sm cursor-zoom-out"
             onClick={() => setSelectedImage(null)}
           ></div>
           
           {/* Image Container */}
           <div className="relative max-w-full max-h-full flex flex-col items-center animate-scale-up">
              <div className="bg-white p-2 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10">
                 <img 
                   src={selectedImage} 
                   alt="Full Preview" 
                   className="max-w-full max-h-[70vh] rounded-xl object-contain"
                 />
              </div>

              {/* ACTION BAR AT BOTTOM */}
              <div className="mt-8 flex gap-6">
                 <button 
                   onClick={(e) => handleSingleDownload(e, selectedImage, "FluidHR-Capture.png")}
                   className="flex items-center gap-3 px-8 py-3 rounded-full bg-white/10 hover:bg-[#00a76b] text-white transition-all border border-white/20 shadow-2xl group"
                   title="Download High Res"
                 >
                    <Download size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Download Node</span>
                 </button>
                 <button 
                   onClick={() => setSelectedImage(null)}
                   className="flex items-center gap-3 px-8 py-3 rounded-full bg-white/10 hover:bg-red-500 text-white transition-all border border-white/20 shadow-2xl group"
                   title="Close Preview"
                 >
                    <X size={20} className="group-hover:rotate-90 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Exit Trace</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Screenshots;
