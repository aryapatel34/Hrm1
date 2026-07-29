import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  Plus, Search, Calendar, Clock, CheckSquare, Trash2, UserPlus, Flag,
  MessageSquare, X, ChevronRight, ChevronDown, Circle,
  Users, CheckCircle2, MoreHorizontal, Grid, Columns,
  Eye, EyeOff, ArrowRight, Send, AtSign, Smile, Mic, Paperclip,
  UserCheck, ShieldCheck, ChevronLeft, Download, FileText, AlertCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import TaskDetailView from '../../components/TaskDetailView';
import TaskCreate from '../TaskCreate';

const POPULAR_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', 
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🫣', '🤭', '🥱', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', 
  '🫨', '😏', '😒', '🙄', '😬', '🤥', '🫵', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', 
  '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '😮', '😯', 
  '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', 
  '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🤝', '👏', '🙌', '👐', '🤲',
  '❤️', '🩷', '🧡', '💛', '💚', '💙', '🩵', '💜', '🖤', '🩶', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', 
  '💓', '💗', '💖', '💘', '💝', '💟', '💬', '💭', '🗯️', '📣', '📢', '🔔', '🔕', '💯', '💢', '💥', '💫', '🕳️',
  '🎉', '🎊', '🎈', '🎂', '🎁', '🎇', '🎆', '🔥', '✨', '🌟', '⭐', '🌈', '⚡', '☀️', '☁️', '🌧️', '❄️', 
  '👀', '🧠', '💼', '💻', '🖥️', '📱', '📞', '📠', '💾', '💿', '📅', '🗑️', '📌', '📍', '📎', '✏️', '📝', '💡', 
  '🚀', '🎯', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🎮', '🧩', '🎲', '🎰',
  '✅', '❌', '➕', '➖', '❓', '❔', '❕', '❗', '⚠️', '🚫', '⛔', '⭕', '🏁', '🚩'
];

// Date formatter
const getYYYYMMDD = (dateInput) => {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) { return ''; }
};

// Evidence URL normalizer
const getEvidenceUrl = (file) => {
  if (!file) return '';
  if (file instanceof File) return URL.createObjectURL(file);
  const rawUrl = file.fileUrl || file.url || file.path || '';
  if (!rawUrl) return '';
  if (rawUrl.startsWith('http') || rawUrl.startsWith('/')) {
    return rawUrl.replace(/\\/g, '/');
  }
  return `/${rawUrl.replace(/\\/g, '/')}`;
};

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDefaultStatus, setCreateModalDefaultStatus] = useState('Ongoing');

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [showClosedOnly, setShowClosedOnly] = useState(false);

  // Grouping Collapse States
  const [collapsedGroups, setCollapsedGroups] = useState({
    'Ongoing': false,
    'Pending': false,
    'Review': false,
    'Need to Improve': false,
    'Completed': false
  });

  // Group Pagination States
  const [groupPages, setGroupPages] = useState({
    'Ongoing': 1,
    'Pending': 1,
    'Review': 1,
    'Need to Improve': 1,
    'Completed': 1
  });

  // Inline Dropdown Toggle States
  const [activeAssigneePickerTaskId, setActiveAssigneePickerTaskId] = useState(null);
  const [activePriorityPickerTaskId, setActivePriorityPickerTaskId] = useState(null);
  const [activeStatusPickerTaskId, setActiveStatusPickerTaskId] = useState(null);
  const [activeCommentsPickerTaskId, setActiveCommentsPickerTaskId] = useState(null);
  const [inlineCommentText, setInlineCommentText] = useState('');

  // Inline Comment Features States
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const inlineFileInputRef = useRef(null);

  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    mediaRecorderRef.current = mediaRecorder;
  }, [mediaRecorder]);

  // Toolbar custom dropdown open states
  const [assigneeDropOpen, setAssigneeDropOpen] = useState(false);
  const [priorityDropOpen, setPriorityDropOpen] = useState(false);
  const assigneeDropRef = useRef(null);
  const priorityDropRef = useRef(null);

  // Column header context menu
  const [colHeaderMenu, setColHeaderMenu] = useState(null); // { col, x, y }
  const colMenuRef = useRef(null);

  // Group header context menu
  const [groupHeaderMenu, setGroupHeaderMenu] = useState(null); // { statusVal, x, y }
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Inline Creation State
  const [inlineCreateTitle, setInlineCreateTitle] = useState('');
  const [inlineActiveGroup, setInlineActiveGroup] = useState(null);

  const dropdownRef = useRef(null);

  const token = sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  // Registry States
  const userRole = sessionStorage.getItem('role')?.toLowerCase() || 'employee';
  const isHigherRole = userRole === 'admin' || userRole === 'hr' || userRole === 'manager';
  
  const today = getYYYYMMDD(new Date());
  const [registryDate, setRegistryDate] = useState(today);
  const [registryTasks, setRegistryTasks] = useState([]);
  const [isRegistrySyncing, setIsRegistrySyncing] = useState(false);
  const [registryCurrentPage, setRegistryCurrentPage] = useState(1);
  const [registryRoleFilter, setRegistryRoleFilter] = useState(userRole === 'employee' ? 'Employee' : 'All');
  const [showRegistryRoleDropdown, setShowRegistryRoleDropdown] = useState(false);
  const [registryStatusNote, setRegistryStatusNote] = useState({ taskId: null, nextStatus: null, note: '' });
  const [registryPreviewGallery, setRegistryPreviewGallery] = useState({ items: [], index: 0 });
  
  const registryFilterRef = useRef(null);

  const fetchRegistryTasks = useCallback(async (date = registryDate) => {
    try {
      setIsRegistrySyncing(true);
      const res = await axios.get(`/api/tasks?date=${date}`, { headers });
      if (res.data.success) {
        setRegistryTasks(res.data.data);
        setRegistryCurrentPage(1);
      }
    } catch (err) {
      console.error('Registry task fetch failed', err);
    } finally {
      setIsRegistrySyncing(false);
    }
  }, [registryDate]);

  useEffect(() => {
    fetchRegistryTasks(registryDate);
    const interval = setInterval(() => fetchRegistryTasks(registryDate), 30000);
    return () => clearInterval(interval);
  }, [registryDate, fetchRegistryTasks]);

  const handleRegistryStatusClick = (taskId, nextStatus) => {
    if (nextStatus === 'Completed' || nextStatus === 'Review' || nextStatus === 'Need to Improve') {
      updateRegistryTaskStatus(taskId, nextStatus, 'Mission Milestone Reached');
    } else {
      setRegistryStatusNote({ taskId, nextStatus, note: '' });
    }
  };

  const updateRegistryTaskStatus = async (id, newStatus, note, newComment = null) => {
    try {
      const payload = { status: newStatus, progressNote: note };
      if (newComment) payload.newComment = newComment;
      await axios.put(`/api/tasks/${id}`, payload, { headers });
      toast.success('Updated successfully');
      setRegistryStatusNote({ taskId: null, nextStatus: null, note: '' });
      fetchRegistryTasks(registryDate);
      fetchData(true); // Also refresh the main board!
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const openRegistryGallery = (attachments, startIndex = 0) => {
    if (!attachments || attachments.length === 0) return;
    const galleryItems = attachments.map(file => {
      const url = getEvidenceUrl(file);
      const fileType = file.fileType || file.type || '';
      const fileName = file.fileName || file.name || 'Evidence';
      const isImage = (fileType.startsWith('image/')) || (fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i));
      return { url, name: fileName, isImage };
    });
    setRegistryPreviewGallery({ items: galleryItems, index: startIndex });
  };

  const filteredRegistryTasks = registryTasks.filter(task => {
    if (userRole === 'hr' && task.employeeRole?.toLowerCase() === 'hr') return false;
    if (registryRoleFilter === 'All') return true;
    return task.employeeRole?.toLowerCase() === registryRoleFilter.toLowerCase();
  });

  const registryItemsPerPage = 6;
  const totalRegistryPages = Math.ceil(filteredRegistryTasks.length / registryItemsPerPage);
  const paginatedRegistryTasks = filteredRegistryTasks.slice((registryCurrentPage - 1) * registryItemsPerPage, registryCurrentPage * registryItemsPerPage);

  const registryRoleOptions = [
    { label: 'All Roles', value: 'All' },
    ...(userRole === 'admin' ? [
      { label: 'HR', value: 'HR' },
      { label: 'Manager', value: 'Manager' }
    ] : []),
    ...(userRole === 'hr' ? [
      { label: 'Manager', value: 'Manager' }
    ] : []),
    { label: 'Employee', value: 'Employee' }
  ];

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [tasksRes, personnelRes] = await Promise.all([
        axios.get('/api/tasks', { headers }).catch(() => ({ data: { data: [] } })),
        axios.get('/api/personnel/all', { headers }).catch(() => ({ data: [] }))
      ]);
      const rawTasks = tasksRes.data?.data || [];
      setTasks(rawTasks);
      setPersonnelList(Array.isArray(personnelRes.data) ? personnelRes.data : []);
    } catch (err) {
      console.error('Failed to sync tasks:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveAssigneePickerTaskId(null);
        setActivePriorityPickerTaskId(null);
        setActiveStatusPickerTaskId(null);
      }
      if (!e.target.closest('[data-comments-popover]') && !e.target.closest('[data-comments-trigger]')) {
        setActiveCommentsPickerTaskId(null);
        setShowMentionPicker(false);
        setShowEmojiPicker(false);
        if (isRecordingRef.current && mediaRecorderRef.current) {
          try {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          } catch (err) {}
          setIsRecording(false);
        }
      }
      if (!e.target.closest('[data-emoji-picker]') && !e.target.closest('[data-emoji-trigger]')) {
        setShowEmojiPicker(false);
      }
      if (!e.target.closest('[data-mention-picker]') && !e.target.closest('[data-mention-trigger]')) {
        setShowMentionPicker(false);
      }
      if (assigneeDropRef.current && !assigneeDropRef.current.contains(e.target)) {
        setAssigneeDropOpen(false);
      }
      if (priorityDropRef.current && !priorityDropRef.current.contains(e.target)) {
        setPriorityDropOpen(false);
      }
      if (registryFilterRef.current && !registryFilterRef.current.contains(e.target)) {
        setShowRegistryRoleDropdown(false);
      }
      // close col menu if click is outside the popup
      if (!e.target.closest('[data-col-menu]')) {
        setColHeaderMenu(null);
      }
      // close group menu if click is outside the popup
      if (!e.target.closest('[data-group-menu]')) {
        setGroupHeaderMenu(null);
      }
    };
    const handleScroll = () => {
      setColHeaderMenu(null);
      setGroupHeaderMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const openColMenu = (e, col) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setColHeaderMenu({ col, x: rect.left, y: rect.bottom });
  };

  const toggleGroup = (group) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleInlineCreate = async (e, groupStatus) => {
    e.preventDefault();
    if (!inlineCreateTitle.trim()) return;
    try {
      const response = await axios.post('/api/tasks', {
        title: inlineCreateTitle.trim(),
        description: 'Daily operational assignment.',
        status: groupStatus,
        priority: 'Medium',
        date: new Date().toISOString().split('T')[0]
      }, { headers });
      if (response.data?.success) {
        setInlineCreateTitle('');
        setInlineActiveGroup(null);
        toast.success('Task created!');
        fetchData(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleUpdateProperty = async (taskId, fields) => {
    try {
      const response = await axios.put(`/api/tasks/${taskId}`, fields, { headers });
      if (response.data?.success) {
        fetchData(true);
        toast.success('Task updated');
      }
    } catch (err) {
      toast.error('Failed to update task');
    } finally {
      setActiveAssigneePickerTaskId(null);
      setActivePriorityPickerTaskId(null);
      setActiveStatusPickerTaskId(null);
    }
  };

  const handleAddInlineComment = async (taskId, currentComments) => {
    if (!inlineCommentText.trim()) {
      toast.error('Please enter a comment before sending');
      return;
    }
    const newComment = {
      text: inlineCommentText.trim(),
      userName: currentUser?.fullName || currentUser?.name || 'System Admin',
      userRole: currentUser?.role || 'admin',
      createdAt: new Date().toISOString()
    };
    const updatedComments = [...(currentComments || []), newComment];
    try {
      const response = await axios.put(`/api/tasks/${taskId}`, { comments: updatedComments }, { headers });
      if (response.data?.success) {
        setInlineCommentText('');
        toast.success('Comment added!');
        fetchData(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleInlineFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !activeCommentsPickerTaskId) return;

    const formData = new FormData();
    files.forEach(file => {
      formData.append('attachments', file);
    });

    const uploadToastId = toast.loading('Uploading attachment(s)...');
    try {
      const response = await axios.put(`/api/tasks/${activeCommentsPickerTaskId}`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.data?.success) {
        toast.success('Attachment(s) uploaded successfully!', { id: uploadToastId });
        fetchData(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload attachments', { id: uploadToastId });
    } finally {
      if (inlineFileInputRef.current) inlineFileInputRef.current.value = '';
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    } else {
      if (!activeCommentsPickerTaskId) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `VoiceNote-${Date.now()}.webm`, { type: 'audio/webm' });
          
          const formData = new FormData();
          formData.append('attachments', audioFile);
          
          const voiceToastId = toast.loading('Uploading voice note...');
          try {
            const response = await axios.put(`/api/tasks/${activeCommentsPickerTaskId}`, formData, {
              headers: {
                ...headers,
                'Content-Type': 'multipart/form-data'
              }
            });
            if (response.data?.success) {
              toast.success('Voice note uploaded!', { id: voiceToastId });
              fetchData(true);
            }
          } catch (err) {
            toast.error('Failed to upload voice note', { id: voiceToastId });
          }
        };
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
        toast.success('Recording started... Click mic again to stop.');
      } catch (err) {
        toast.error('Microphone access denied or not supported');
      }
    }
  };

  const getEvidenceUrl = (file) => {
    if (!file) return '';
    const rawUrl = file.fileUrl || file.url || file.path || '';
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http') || rawUrl.startsWith('/')) {
      return rawUrl.replace(/\\/g, '/');
    }
    return `/${rawUrl.replace(/\\/g, '/')}`;
  };

  const handleDeleteTask = async (taskId) => {
    setTaskToDelete(taskId);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await axios.delete(`/api/tasks/${taskToDelete}`, { headers });
      toast.success('Task deleted');
      fetchData(true);
    } catch (err) {
      toast.error('Failed to delete task');
    } finally {
      setTaskToDelete(null);
    }
  };

  const collapseAllGroups = () => {
    setCollapsedGroups({
      'Ongoing': true,
      'Pending': true,
      'Review': true,
      'Need to Improve': true,
      'Completed': true
    });
  };

  const expandAllGroups = () => {
    setCollapsedGroups({
      'Ongoing': false,
      'Pending': false,
      'Review': false,
      'Need to Improve': false,
      'Completed': false
    });
  };

  const scrollToGroup = (statusVal) => {
    setCollapsedGroups(prev => ({ ...prev, [statusVal]: false }));
    setTimeout(() => {
      const el = document.getElementById(`status-group-${statusVal}`);
      if (el) {
        const yOffset = -90; // Adjust for fixed headers
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  const triggerQuickAdd = (statusVal) => {
    setCollapsedGroups(prev => ({ ...prev, [statusVal]: false }));
    setInlineActiveGroup(statusVal);
  };

  const handleClearGroupTasks = async (statusVal) => {
    const groupTasks = filteredTasks.filter(t => t.status === statusVal);
    if (groupTasks.length === 0) {
      toast.error('No tasks to delete in this group');
      return;
    }
    const badgeDetails = getStatusBadge(statusVal);
    if (!window.confirm(`Are you sure you want to permanently delete all ${groupTasks.length} tasks in "${badgeDetails.label}"?`)) {
      return;
    }
    try {
      await Promise.all(groupTasks.map(t => axios.delete(`/api/tasks/${t._id}`, { headers })));
      toast.success(`Deleted all tasks in ${badgeDetails.label}`);
      fetchData(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete some tasks');
    }
  };

  const handleMoveGroupTasks = async (statusVal, targetStatus) => {
    const groupTasks = filteredTasks.filter(t => t.status === statusVal);
    if (groupTasks.length === 0) {
      toast.error('No tasks to move in this group');
      return;
    }
    const sourceBadge = getStatusBadge(statusVal);
    const targetBadge = getStatusBadge(targetStatus);
    if (!window.confirm(`Move all ${groupTasks.length} tasks from "${sourceBadge.label}" to "${targetBadge.label}"?`)) {
      return;
    }
    try {
      await Promise.all(groupTasks.map(t => axios.put(`/api/tasks/${t._id}`, { status: targetStatus }, { headers })));
      toast.success(`Moved tasks to ${targetBadge.label}`);
      fetchData(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to move some tasks');
    }
  };

  // Status badge — themed to FluidHR palette
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Ongoing':       return { label: 'TO DO',        style: 'bg-[#eceae3] text-[#201515] border border-[#c5c0b1]' };
      case 'Pending':       return { label: 'IN PROGRESS',  style: 'bg-blue-50 text-blue-700 border border-blue-200' };
      case 'Review':        return { label: 'UNDER REVIEW', style: 'bg-purple-50 text-purple-700 border border-purple-200' };
      case 'Need to Improve': return { label: 'REWORK',     style: 'bg-red-50 text-red-700 border border-red-200' };
      case 'Completed':     return { label: 'COMPLETED',    style: 'bg-green-50 text-[#24a148] border border-green-200' };
      default:              return { label: status,         style: 'bg-[#eceae3] text-[#939084] border border-[#c5c0b1]' };
    }
  };

  // Group header accent color
  const getGroupAccent = (status) => {
    switch (status) {
      case 'Ongoing':         return 'border-l-[#201515]';
      case 'Pending':         return 'border-l-blue-500';
      case 'Review':          return 'border-l-purple-500';
      case 'Need to Improve': return 'border-l-red-500';
      case 'Completed':       return 'border-l-[#24a148]';
      default:                return 'border-l-[#c5c0b1]';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'High':   return <Flag size={13} className="text-red-500 fill-current" />;
      case 'Medium': return <Flag size={13} className="text-amber-500 fill-current" />;
      case 'Low':    return <Flag size={13} className="text-[#939084] fill-current" />;
      default:       return <Flag size={13} className="text-[#c5c0b1]" />;
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (t.employeeName || '').toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesAssignee = filterAssignee === 'All' || t.userId === filterAssignee;
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    const matchesClosed = showClosedOnly ? t.status === 'Completed' : true;
    return matchesSearch && matchesAssignee && matchesPriority && matchesClosed;
  });

  const statuses = ['Ongoing', 'Pending', 'Review', 'Need to Improve', 'Completed'];

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 border-4 border-t-[#00a76b] border-[#eceae3] rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#939084]">Loading Tasks...</p>
    </div>
  );

  return (
    <div className="animate-fade-in pb-32">

      {/* ─── PAGE HEADER ─── */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-end border-b border-[#c5c0b1] pb-8">
        <div>
          <p className="zap-caption-upper text-[#00a76b] mb-3">Daily Operations</p>
          <h1 className="zap-display-hero">Task <span className="text-[#00a76b]">Board.</span></h1>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={() => {
              setCreateModalDefaultStatus('Ongoing');
              setIsCreateModalOpen(true);
            }}
            className="zap-btn zap-btn-orange h-12 px-6 flex items-center gap-2"
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      {/* ─── TOOLBAR ─── */}
      <div className="zap-card p-0 mb-6 overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">

          {/* Left search control */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#939084]" size={13} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-[#c5c0b1] bg-[#fffdf9] hover:border-[#201515] focus:border-[#00a76b] text-[11px] text-[#201515] placeholder:text-[#939084] pl-8 pr-4 py-1.5 rounded-[6px] outline-none transition-all w-44"
            />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowClosedOnly(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border text-[11px] font-bold uppercase tracking-wider transition-colors ${
                showClosedOnly
                  ? 'bg-[#00a76b] text-white border-[#00a76b]'
                  : 'hover:bg-[#eceae3] border-[#c5c0b1] text-[#939084]'
              }`}
            >
              <CheckCircle2 size={12} />
              <span>Closed</span>
            </button>

            {/* ── Assignee Custom Dropdown ── */}
            <div className="relative" ref={assigneeDropRef}>
              <button
                onClick={() => { setAssigneeDropOpen(o => !o); setPriorityDropOpen(false); }}
                className={`flex items-center gap-2 border rounded-[6px] py-1.5 pl-3 pr-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer select-none ${
                  assigneeDropOpen
                    ? 'border-[#201515] bg-[#eceae3] text-[#201515]'
                    : 'border-[#c5c0b1] bg-[#fffdf9] text-[#939084] hover:border-[#201515]'
                }`}
              >
                {filterAssignee === 'All' ? (
                  <Users size={12} className="shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-[#201515] flex items-center justify-center text-[8px] text-white font-black uppercase shrink-0">
                    {(personnelList.find(p => p._id === filterAssignee)?.fullName ||
                      personnelList.find(p => p._id === filterAssignee)?.name || 'A').substring(0, 1)}
                  </div>
                )}
                <span className="truncate max-w-[90px]">
                  {filterAssignee === 'All'
                    ? 'All Assignees'
                    : (personnelList.find(p => p._id === filterAssignee)?.fullName ||
                       personnelList.find(p => p._id === filterAssignee)?.name || 'Unknown')}
                </span>
                <ChevronDown size={11} className={`shrink-0 transition-transform duration-200 ${assigneeDropOpen ? 'rotate-180' : ''}`} />
              </button>

              {assigneeDropOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[#c5c0b1] rounded-[10px] shadow-xl z-[60] overflow-hidden"
                     style={{ boxShadow: '0 8px 32px rgba(32,21,21,0.13)' }}>
                  {/* Header */}
                  <div className="px-3 py-2 border-b border-[#eceae3] bg-[#fffdf9]">
                    <p className="text-[9px] font-semibold not-italic uppercase tracking-[0.2em] text-[#939084]">Filter by Assignee</p>
                  </div>
                  <div className="p-1.5 max-h-52 overflow-y-auto">
                    {/* All option */}
                    <button
                      onClick={() => { setFilterAssignee('All'); setAssigneeDropOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] transition-colors text-left ${
                        filterAssignee === 'All'
                          ? 'bg-[#201515] text-white'
                          : 'hover:bg-[#eceae3] text-[#201515]'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        filterAssignee === 'All' ? 'bg-white/20' : 'bg-[#eceae3]'
                      }`}>
                        <Users size={11} className={filterAssignee === 'All' ? 'text-white' : 'text-[#939084]'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold not-italic uppercase tracking-wider truncate">All Assignees</p>
                        <p className={`text-[9px] font-medium not-italic ${ filterAssignee === 'All' ? 'text-white/60' : 'text-[#939084]'}`}>
                          {filteredTasks.length} tasks
                        </p>
                      </div>
                      {filterAssignee === 'All' && (
                        <div className="w-4 h-4 rounded-full bg-[#00a76b] flex items-center justify-center shrink-0">
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </button>

                    {/* Divider */}
                    {personnelList.length > 0 && <div className="my-1 border-t border-[#eceae3]" />}

                    {/* Personnel options */}
                    {personnelList.map(p => {
                      const name = p.fullName || p.name || 'Unknown';
                      const isSelected = filterAssignee === p._id;
                      const roleColors = {
                        HR: 'bg-rose-100 text-rose-600',
                        Manager: 'bg-amber-100 text-amber-600',
                      };
                      const roleStyle = roleColors[p.role] || 'bg-blue-100 text-blue-600';
                      return (
                        <button
                          key={p._id}
                          onClick={() => { setFilterAssignee(p._id); setAssigneeDropOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] transition-colors text-left ${
                            isSelected ? 'bg-[#201515] text-white' : 'hover:bg-[#eceae3] text-[#201515]'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0 ${
                            isSelected ? 'bg-[#00a76b] text-white' : 'bg-[#201515] text-white'
                          }`}>
                            {name.substring(0, 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold not-italic uppercase tracking-wider truncate">{name}</p>
                            {p.role && (
                              <span className={`text-[8px] font-semibold not-italic uppercase px-1.5 py-0.5 rounded-[3px] ${
                                isSelected ? 'bg-white/20 text-white' : roleStyle
                              }`}>{p.role}</span>
                            )}
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-[#00a76b] flex items-center justify-center shrink-0">
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {personnelList.length === 0 && (
                      <div className="px-3 py-4 text-center text-[10px] text-[#939084] font-bold">No personnel found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Priority Custom Dropdown ── */}
            <div className="relative" ref={priorityDropRef}>
              <button
                onClick={() => { setPriorityDropOpen(o => !o); setAssigneeDropOpen(false); }}
                className={`flex items-center gap-2 border rounded-[6px] py-1.5 pl-3 pr-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer select-none ${
                  priorityDropOpen
                    ? 'border-[#201515] bg-[#eceae3] text-[#201515]'
                    : 'border-[#c5c0b1] bg-[#fffdf9] text-[#939084] hover:border-[#201515]'
                }`}
              >
                {filterPriority === 'All' ? (
                  <Flag size={12} className="shrink-0" />
                ) : filterPriority === 'High' ? (
                  <Flag size={12} className="text-red-500 fill-current shrink-0" />
                ) : filterPriority === 'Medium' ? (
                  <Flag size={12} className="text-amber-500 fill-current shrink-0" />
                ) : (
                  <Flag size={12} className="text-[#939084] fill-current shrink-0" />
                )}
                <span>{filterPriority === 'All' ? 'All Priorities' : filterPriority}</span>
                <ChevronDown size={11} className={`shrink-0 transition-transform duration-200 ${priorityDropOpen ? 'rotate-180' : ''}`} />
              </button>

              {priorityDropOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-[#c5c0b1] rounded-[10px] shadow-xl z-[60] overflow-hidden"
                     style={{ boxShadow: '0 8px 32px rgba(32,21,21,0.13)' }}>
                  {/* Header */}
                  <div className="px-3 py-2 border-b border-[#eceae3] bg-[#fffdf9]">
                    <p className="text-[9px] font-semibold not-italic uppercase tracking-[0.2em] text-[#939084]">Filter by Priority</p>
                  </div>
                  <div className="p-1.5">
                    {[
                      { value: 'All',    label: 'All Priorities', icon: <Flag size={13} className="text-[#c5c0b1]" />,                          dot: 'bg-[#c5c0b1]',    desc: 'Show all tasks' },
                      { value: 'High',   label: 'High',           icon: <Flag size={13} className="text-red-500 fill-current" />,              dot: 'bg-red-500',      desc: 'Urgent & critical' },
                      { value: 'Medium', label: 'Medium',         icon: <Flag size={13} className="text-amber-500 fill-current" />,            dot: 'bg-amber-500',    desc: 'Normal priority' },
                      { value: 'Low',    label: 'Low',            icon: <Flag size={13} className="text-[#939084] fill-current" />,            dot: 'bg-[#939084]',    desc: 'Low urgency' },
                    ].map(opt => {
                      const isSelected = filterPriority === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => { setFilterPriority(opt.value); setPriorityDropOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] transition-colors text-left ${
                            isSelected ? 'bg-[#201515] text-white' : 'hover:bg-[#eceae3] text-[#201515]'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/15' : 'bg-[#eceae3]'
                          }`}>
                            {opt.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold not-italic uppercase tracking-wider">{opt.label}</p>
                            <p className={`text-[9px] font-medium not-italic ${ isSelected ? 'text-white/60' : 'text-[#939084]'}`}>{opt.desc}</p>
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-[#00a76b] flex items-center justify-center shrink-0">
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ─── QUICK STATUS NAVIGATION ─── */}
      <div className="flex flex-wrap gap-3 mb-8">
        {statuses.map(statusVal => {
          const badgeDetails = getStatusBadge(statusVal);
          const count = filteredTasks.filter(t => t.status === statusVal).length;
          
          return (
            <button
              key={statusVal}
              onClick={() => scrollToGroup(statusVal)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-[8px] text-[11px] font-black uppercase tracking-wider shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer ${badgeDetails.style}`}
            >
              <span>{badgeDetails.label}</span>
              <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/70 border border-current text-[10px] font-bold">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── GROUPS ─── */}
      <div className="space-y-4" ref={dropdownRef}>
        {statuses.map(statusVal => {
          const groupTasks = filteredTasks
            .filter(t => t.status === statusVal)
            .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
          const itemsPerPage = 10;
          const totalPages = Math.ceil(groupTasks.length / itemsPerPage);
          const currentPage = Math.max(1, Math.min(groupPages[statusVal] || 1, totalPages || 1));
          const paginatedGroupTasks = groupTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
          const isCollapsed = collapsedGroups[statusVal];
          const badgeDetails = getStatusBadge(statusVal);
          const accentClass = getGroupAccent(statusVal);

          return (
            <div key={statusVal} id={`status-group-${statusVal}`} className={`zap-card p-0 overflow-visible border-l-4 ${accentClass}`}>

              {/* Group Header */}
              <div
                onClick={() => toggleGroup(statusVal)}
                className={`flex items-center justify-between px-6 py-4 cursor-pointer bg-[#fffdf9] hover:bg-[#eceae3]/40 select-none transition-colors ${isCollapsed ? 'rounded-[4px]' : 'border-b border-[#c5c0b1] rounded-t-[4px]'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[#939084] hover:text-[#201515] transition-colors">
                    {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest ${badgeDetails.style}`}>
                    {badgeDetails.label}
                  </span>
                  <span className="text-[12px] font-black text-[#939084] tabular-nums">
                    {groupTasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, [statusVal]: false }));
                      setInlineActiveGroup(statusVal);
                    }}
                    className="p-1.5 hover:bg-[#eceae3] rounded-[4px] text-[#939084] hover:text-[#00a76b] transition-colors"
                    title="Quick Add Task"
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setGroupHeaderMenu({
                        statusVal,
                        x: rect.right,
                        y: rect.bottom,
                        buttonTop: rect.top,
                        buttonBottom: rect.bottom
                      });
                    }}
                    className="p-1.5 hover:bg-[#eceae3] rounded-[4px] text-[#939084] hover:text-[#201515] transition-colors"
                  >
                    <MoreHorizontal size={13} />
                  </button>
                </div>
              </div>

              {/* Group Table */}
              {!isCollapsed && (
                <>
                  <div className="w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#c5c0b1] bg-[#fffdf9] text-[10px] uppercase font-black tracking-widest text-[#939084]">
                        <th className="pl-10 pr-6 py-3 w-[33%]">Name</th>
                        {['Assignee','Created','Due Date','Priority','Status'].map(col => (
                          <th key={col} className="px-6 py-3 w-[10%]">
                            <button
                              onClick={(e) => openColMenu(e, col)}
                              className={`flex items-center gap-1 group/col hover:text-[#201515] transition-colors ${
                                colHeaderMenu?.col === col ? 'text-[#00a76b]' : ''
                              }`}
                            >
                              <span>{col}</span>
                              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" className="opacity-0 group-hover/col:opacity-100 transition-opacity shrink-0">
                                <path d="M4.5 6L1.5 3h6L4.5 6z" fill="currentColor"/>
                              </svg>
                            </button>
                          </th>
                        ))}
                        <th className="px-6 py-3 w-[5%] text-right">Comments</th>
                        <th className="pr-4 pl-2 py-3 w-[3%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c5c0b1]/60">
                      {paginatedGroupTasks.map(task => {
                        const assignedUser = personnelList.find(p => p._id === task.userId);
                        const displayStatus = getStatusBadge(task.status);

                        const isAssigneeOpen = activeAssigneePickerTaskId === task._id;
                        const isPriorityOpen = activePriorityPickerTaskId === task._id;
                        const isStatusOpen = activeStatusPickerTaskId === task._id;
                        const isCommentsOpen = activeCommentsPickerTaskId === task._id;

                        return (
                          <tr
                            key={task._id}
                            onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                            className="hover:bg-[#fffdf9] transition-colors group cursor-pointer"
                          >
                            {/* Task Name */}
                            <td className="pl-5 pr-6 py-4 flex items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateProperty(task._id, { status: 'Completed' });
                                }}
                                className="text-[#c5c0b1] hover:text-[#24a148] transition-colors shrink-0"
                              >
                                <Circle size={15} />
                              </button>
                              <span className="font-bold text-[13px] text-[#201515] group-hover:text-[#00a76b] transition-colors uppercase truncate max-w-xs">
                                {task.title}
                              </span>
                            </td>

                            {/* Assignee */}
                            <td className="px-6 py-4 relative" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setActiveAssigneePickerTaskId(isAssigneeOpen ? null : task._id)}
                                className="flex items-center gap-2 hover:bg-[#eceae3] py-1 px-2 rounded-[4px] transition-colors text-xs text-[#939084] hover:text-[#201515]"
                              >
                                {assignedUser ? (
                                  <div className="w-6 h-6 rounded-full bg-[#201515] flex items-center justify-center text-[10px] text-white font-black uppercase">
                                    {assignedUser.fullName?.substring(0, 1) || assignedUser.name?.substring(0, 1)}
                                  </div>
                                ) : (
                                  <UserPlus size={13} className="text-[#c5c0b1]" />
                                )}
                                <span className="truncate max-w-[90px] text-[11px] font-semibold not-italic uppercase">
                                  {task.employeeName || 'Assign'}
                                </span>
                              </button>

                              {isAssigneeOpen && (
                                <div className="absolute left-4 top-full mt-1 w-48 bg-white border border-[#c5c0b1] rounded-[8px] p-1.5 shadow-xl z-50 max-h-40 overflow-y-auto">
                                  {personnelList.map(p => (
                                    <button
                                      key={p._id}
                                      onClick={() => handleUpdateProperty(task._id, {
                                        userId: p._id,
                                        employeeName: p.fullName || p.name,
                                        employeeRole: p.role
                                      })}
                                      className="w-full text-left px-2.5 py-1.5 text-[11px] font-semibold not-italic uppercase rounded-[4px] hover:bg-[#eceae3] text-[#201515] transition-colors truncate"
                                    >
                                      {p.fullName || p.name}
                                    </button>
                                  ))}
                                  {personnelList.length === 0 && (
                                    <div className="text-[10px] text-[#939084] text-center py-2">No personnel found</div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Created Date */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-[11px] text-[#939084] font-bold">
                                <Clock size={12} className="shrink-0 text-[#c5c0b1]" />
                                <span>
                                  {task.createdAt
                                    ? new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    : task.date
                                    ? new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    : '—'}
                                </span>
                              </div>
                            </td>

                            {/* Due Date */}
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                              <div className="relative flex items-center gap-1.5 text-[11px] text-[#939084] font-bold hover:text-[#00a76b] py-1 px-2 rounded-[4px] hover:bg-[#eceae3] max-w-fit transition-colors cursor-pointer">
                                <Calendar size={12} className="shrink-0" />
                                <span>
                                  {task.date || task.dueDate
                                    ? new Date(task.date || task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    : 'Set Date'}
                                </span>
                                <input
                                  type="date"
                                  value={task.date || task.dueDate || ''}
                                  onChange={(e) => handleUpdateProperty(task._id, { date: e.target.value, dueDate: e.target.value })}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                              </div>
                            </td>

                            {/* Priority */}
                            <td className="px-6 py-4 relative" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setActivePriorityPickerTaskId(isPriorityOpen ? null : task._id)}
                                className="hover:bg-[#eceae3] p-1.5 rounded-[4px] transition-colors flex items-center gap-1.5"
                              >
                                {getPriorityIcon(task.priority)}
                                <span className="text-[11px] text-[#939084] font-semibold not-italic uppercase">{task.priority || 'Medium'}</span>
                              </button>
                              {isPriorityOpen && (
                                <div className="absolute left-4 top-full mt-1 w-28 bg-white border border-[#c5c0b1] rounded-[8px] p-1 shadow-xl z-50">
                                  {['High', 'Medium', 'Low'].map(prio => (
                                    <button
                                      key={prio}
                                      onClick={() => handleUpdateProperty(task._id, { priority: prio })}
                                      className="w-full text-left px-2.5 py-1.5 text-[11px] font-semibold not-italic uppercase rounded-[4px] hover:bg-[#eceae3] text-[#201515] transition-colors flex items-center gap-2"
                                    >
                                      {getPriorityIcon(prio)}
                                      <span>{prio}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4 relative" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setActiveStatusPickerTaskId(isStatusOpen ? null : task._id)}
                                className={`px-2.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity ${displayStatus.style}`}
                              >
                                {displayStatus.label}
                              </button>
                              {isStatusOpen && (
                                <div className="absolute left-4 top-full mt-1 w-36 bg-white border border-[#c5c0b1] rounded-[8px] p-1 shadow-xl z-50">
                                  {statuses.map(st => {
                                    const badge = getStatusBadge(st);
                                    return (
                                      <button
                                        key={st}
                                        onClick={() => handleUpdateProperty(task._id, { status: st })}
                                        className="w-full text-left px-2.5 py-1.5 text-[10px] font-semibold not-italic rounded-[4px] hover:bg-[#eceae3] text-[#201515] transition-colors flex items-center gap-2"
                                      >
                                        <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-semibold not-italic uppercase tracking-widest ${badge.style}`}>
                                          {badge.label}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </td>

                            {/* Comments */}
                            <td className="px-6 py-4 text-right relative" onClick={e => e.stopPropagation()}>
                              <div className="inline-flex items-center justify-end w-full">
                                <button
                                  data-comments-trigger="true"
                                  onClick={() => {
                                    if (isCommentsOpen) {
                                      setActiveCommentsPickerTaskId(null);
                                    } else {
                                      setActiveCommentsPickerTaskId(task._id);
                                      setInlineCommentText('');
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 hover:bg-[#eceae3] py-1 px-2 rounded-[4px] transition-colors cursor-pointer border border-[#c5c0b1]/30"
                                >
                                  <MessageSquare size={13} className={task.comments?.length > 0 ? "text-[#00a76b]" : "text-[#c5c0b1]"} />
                                  {task.comments?.length > 0 ? (
                                    <span className="text-[10px] text-[#201515] font-black">{task.comments.length}</span>
                                  ) : (
                                    <span className="text-[10px] text-[#c5c0b1] font-black">0</span>
                                  )}
                                </button>
                              </div>

                              {isCommentsOpen && (
                                <div
                                  data-comments-popover="true"
                                  className="absolute right-6 top-full mt-1.5 w-80 bg-[#fffdf9] border border-[#c5c0b1] rounded-[8px] shadow-xl z-50 flex flex-col overflow-hidden text-left"
                                >
                                  {/* Popover Header */}
                                  <div className="px-3.5 py-2.5 border-b border-[#c5c0b1]/50 bg-[#eceae3]/30 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#201515]">Comments ({task.comments?.length || 0})</span>
                                    <button 
                                      onClick={() => setActiveCommentsPickerTaskId(null)}
                                      className="text-[#939084] hover:text-[#201515] transition-colors"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>

                                  {/* Comments List */}
                                  <div className="flex-1 max-h-[180px] overflow-y-auto divide-y divide-[#eceae3]">
                                    {task.comments && task.comments.length > 0 ? (
                                      task.comments.map((c, idx) => {
                                        const initials = c.userName 
                                          ? c.userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                                          : 'US';
                                        const formattedTime = new Date(c.createdAt).toLocaleString([], { 
                                          month: 'short', 
                                          day: 'numeric', 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        });

                                        return (
                                          <div key={idx} className="p-3 flex gap-2.5 items-start bg-[#fffdf9] hover:bg-[#eceae3]/10 transition-colors">
                                            <div className="w-6 h-6 rounded-full bg-[#201515] flex items-center justify-center text-[8px] text-[#fffdf9] font-black shrink-0 uppercase">
                                              {initials}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-baseline justify-between gap-1.5">
                                                <span className="text-[10px] font-black text-[#201515] uppercase tracking-wide truncate max-w-[120px]" title={c.userName}>
                                                  {c.userName || 'User'}
                                                </span>
                                                <span className="text-[7.5px] font-bold text-[#939084] shrink-0">
                                                  {formattedTime}
                                                </span>
                                              </div>
                                              <p className="text-[10px] font-medium text-[#201515] mt-1 break-words whitespace-pre-wrap leading-normal">
                                                {c.text}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="py-8 text-center text-[10px] font-bold text-[#939084] uppercase tracking-wide italic">
                                        No comments yet
                                      </div>
                                    )}
                                  </div>

                                  {/* Task Attachments Row */}
                                  {task.attachments && task.attachments.length > 0 && (
                                    <div className="px-3.5 py-2.5 border-t border-[#c5c0b1]/30 bg-[#eceae3]/10">
                                      <span className="text-[8px] font-black uppercase tracking-wider text-[#939084] block mb-1">Attachments ({task.attachments.length})</span>
                                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                                        {task.attachments.map((file, idx) => {
                                          const isImg = (file.fileName || '').match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || (file.fileType || '').startsWith('image/');
                                          const url = getEvidenceUrl(file);
                                          
                                          return (
                                            <div key={file._id || idx} className="group relative border border-[#c5c0b1] rounded-[4px] bg-[#fffdf9] overflow-hidden flex flex-col w-10 h-10 shrink-0">
                                              {isImg ? (
                                                <div className="flex-1 overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                                  <img src={url} alt={file.fileName} className="w-full h-full object-cover" />
                                                </div>
                                              ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center p-0.5 cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                                  <Paperclip size={10} className="text-[#939084]" />
                                                  <span className="text-[6.5px] font-bold text-[#201515] text-center truncate w-full px-0.5">{file.fileName || 'File'}</span>
                                                </div>
                                              )}
                                              <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  type="button"
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!window.confirm(`Remove "${file.fileName || 'this file'}"?`)) return;
                                                    const updatedAttachments = task.attachments.filter(a => a._id !== file._id);
                                                    try {
                                                      const res = await axios.put(`/api/tasks/${task._id}`, { attachments: updatedAttachments }, { headers });
                                                      if (res.data?.success) {
                                                        toast.success('Removed');
                                                        fetchData(true);
                                                      }
                                                    } catch (err) {
                                                      toast.error('Failed to remove');
                                                    }
                                                  }}
                                                  className="p-0.5 bg-red-500 hover:bg-red-600 text-white border-none rounded-[2px]"
                                                >
                                                  <Trash2 size={7} />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Comment Input Area */}
                                  <div className="border-t border-[#c5c0b1] bg-[#fffdf9] flex flex-col relative">
                                    {/* Mention Suggestions Popover */}
                                    {showMentionPicker && (
                                      <div 
                                        data-mention-picker="true"
                                        className="absolute left-3.5 bottom-full mb-1 w-64 max-h-36 overflow-y-auto bg-[#fffdf9] border border-[#c5c0b1] rounded-[6px] shadow-xl z-50 p-1 divide-y divide-[#eceae3] text-left"
                                      >
                                        <div className="px-2 py-1 text-[8px] font-semibold not-italic uppercase text-[#939084] tracking-wider flex justify-between items-center bg-[#eceae3]/20">
                                          <span>Mention Employee</span>
                                          <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); setShowMentionPicker(false); }}
                                            className="text-[#939084] hover:text-[#201515]"
                                          >
                                            <X size={10} />
                                          </button>
                                        </div>
                                        {personnelList.map(p => (
                                          <button
                                            key={p._id}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setInlineCommentText(prev => prev + `@${p.fullName || p.name} `);
                                              setShowMentionPicker(false);
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 hover:bg-[#eceae3] text-[10px] font-semibold not-italic text-[#201515] transition-colors uppercase truncate block border-none bg-transparent cursor-pointer"
                                          >
                                            {p.fullName || p.name}
                                          </button>
                                        ))}
                                      </div>
                                    )}

                                    {/* Emoji Picker Popover */}
                                    {showEmojiPicker && (
                                      <div 
                                        data-emoji-picker="true"
                                        className="absolute left-3.5 bottom-full mb-1 w-52 bg-[#fffdf9] border border-[#c5c0b1] rounded-[6px] shadow-xl z-50 p-2 flex flex-col text-left"
                                      >
                                        <div className="text-[8px] font-black uppercase text-[#939084] tracking-wider mb-1.5 flex justify-between items-center bg-[#eceae3]/20 px-1 py-0.5 rounded">
                                          <span>Select Emoji</span>
                                          <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(false); }}
                                            className="text-[#939084] hover:text-[#201515]"
                                          >
                                            <X size={10} />
                                          </button>
                                        </div>
                                        <div className="grid grid-cols-6 gap-1 max-h-36 overflow-y-auto pr-1">
                                          {POPULAR_EMOJIS.map(emoji => (
                                            <button
                                              key={emoji}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setInlineCommentText(prev => prev + emoji);
                                                setShowEmojiPicker(false);
                                              }}
                                              className="w-7 h-7 flex items-center justify-center hover:bg-[#eceae3] rounded text-sm transition-all border-none bg-transparent cursor-pointer"
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <textarea
                                      value={inlineCommentText}
                                      onChange={(e) => setInlineCommentText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleAddInlineComment(task._id, task.comments);
                                        }
                                      }}
                                      placeholder="Comment or type '/' for commands..."
                                      className="w-full bg-transparent text-[11px] text-[#201515] placeholder:text-[#c5c0b1] outline-none border-none p-2.5 resize-none h-14 font-medium leading-relaxed"
                                    />
                                    
                                    {/* Action Bar */}
                                    <div className="flex items-center justify-between px-2.5 pb-2 bg-[#fffdf9]">
                                      <div className="flex items-center gap-1.5">
                                        <button 
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); inlineFileInputRef.current?.click(); }}
                                          className="p-0.5 hover:bg-[#eceae3] rounded text-[#939084] hover:text-[#201515] transition-all cursor-pointer border-none bg-transparent"
                                        >
                                          <Plus size={11} />
                                        </button>
                                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[#eceae3]/50 hover:bg-[#eceae3] rounded text-[8px] font-black uppercase tracking-wider text-[#939084] hover:text-[#201515] transition-colors cursor-pointer">
                                          <span>Comment</span>
                                          <ChevronDown size={8} />
                                        </div>
                                        <button 
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); inlineFileInputRef.current?.click(); }}
                                          className="p-0.5 hover:bg-[#eceae3] rounded text-[#939084] hover:text-[#201515] transition-all cursor-pointer border-none bg-transparent"
                                        >
                                          <Paperclip size={11} />
                                        </button>
                                        <button 
                                          type="button"
                                          data-mention-trigger="true"
                                          onClick={(e) => { e.stopPropagation(); setShowMentionPicker(!showMentionPicker); setShowEmojiPicker(false); }}
                                          className="p-0.5 hover:bg-[#eceae3] rounded text-[#939084] hover:text-[#201515] transition-all cursor-pointer border-none bg-transparent"
                                        >
                                          <AtSign size={11} />
                                        </button>
                                        <button 
                                          type="button"
                                          data-emoji-trigger="true"
                                          onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setShowMentionPicker(false); }}
                                          className="p-0.5 hover:bg-[#eceae3] rounded text-[#939084] hover:text-[#201515] transition-all cursor-pointer border-none bg-transparent"
                                        >
                                          <Smile size={11} />
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleVoiceRecord(); }}
                                          className={`p-0.5 hover:bg-[#eceae3] rounded transition-all cursor-pointer border-none bg-transparent ${isRecording ? 'text-red-500 animate-pulse bg-red-100/50' : 'text-[#939084] hover:text-[#201515]'}`}
                                        >
                                          <Mic size={11} />
                                        </button>
                                      </div>
                                      
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          handleAddInlineComment(task._id, task.comments);
                                        }}
                                        className="p-1.5 bg-[#00a76b] hover:bg-[#e04500] text-white rounded-[4px] transition-colors cursor-pointer shadow-sm flex items-center justify-center border-none"
                                        title="Send comment"
                                      >
                                        <Send size={11} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Delete */}
                            <td className="pr-4 pl-2 py-4 text-right" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleDeleteTask(task._id)}
                                className="text-[#c5c0b1] hover:text-[#00a76b] transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete task"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Inline create row */}
                      {inlineActiveGroup === statusVal ? (
                        <tr className="border-t border-[#c5c0b1]/40">
                          <td colSpan="8" className="pl-10 pr-6 py-3">
                            <form onSubmit={(e) => handleInlineCreate(e, statusVal)} className="flex items-center gap-3">
                              <Circle size={15} className="text-[#00a76b] animate-pulse shrink-0" />
                              <input
                                type="text"
                                placeholder="Write task title & press Enter..."
                                value={inlineCreateTitle}
                                onChange={(e) => setInlineCreateTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setInlineActiveGroup(null);
                                    setInlineCreateTitle('');
                                  }
                                }}
                                className="bg-transparent text-[13px] text-[#201515] font-bold italic outline-none border-none focus:ring-0 p-0 w-full placeholder:text-[#c5c0b1] uppercase"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => { setInlineActiveGroup(null); setInlineCreateTitle(''); }}
                                className="text-[#939084] hover:text-[#00a76b] transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </form>
                          </td>
                        </tr>
                      ) : (
                        <tr className="border-t border-[#c5c0b1]/20">
                          <td colSpan="8" className="pl-10 pr-6 py-3">
                            <button
                              onClick={() => setInlineActiveGroup(statusVal)}
                              className="text-[11px] font-black uppercase tracking-wider text-[#939084] hover:text-[#00a76b] transition-colors flex items-center gap-1.5"
                            >
                              <Plus size={13} />
                              <span>Add Task</span>
                            </button>
                          </td>
                        </tr>
                      )}

                    </tbody>
                  </table>
                </div>
                {/* Pagination Footer */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-[#c5c0b1]/60 bg-[#fffdf9] rounded-b-[4px]">
                    <div className="text-[11px] text-[#939084] font-bold uppercase tracking-wider">
                      Showing {Math.min(groupTasks.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(groupTasks.length, currentPage * itemsPerPage)} of {groupTasks.length} tasks
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setGroupPages(prev => ({ ...prev, [statusVal]: Math.max(1, currentPage - 1) }))}
                        disabled={currentPage === 1}
                        className="flex items-center justify-center p-1.5 rounded-[4px] border border-[#c5c0b1] bg-[#fffdf9] text-[#939084] hover:text-[#201515] hover:bg-[#eceae3] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={14} />
                      </button>

                      {Array.from({ length: totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        const isPageActive = currentPage === pageNum;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setGroupPages(prev => ({ ...prev, [statusVal]: pageNum }))}
                            className={`w-7 h-7 rounded-[4px] text-[11px] font-black border transition-all cursor-pointer ${
                              isPageActive
                                ? 'bg-[#00a76b] border-[#00a76b] text-white shadow-sm shadow-[#00a76b]/20'
                                : 'bg-[#fffdf9] border-[#c5c0b1] text-[#939084] hover:text-[#201515] hover:bg-[#eceae3]'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setGroupPages(prev => ({ ...prev, [statusVal]: Math.min(totalPages, currentPage + 1) }))}
                        disabled={currentPage === totalPages}
                        className="flex items-center justify-center p-1.5 rounded-[4px] border border-[#c5c0b1] bg-[#fffdf9] text-[#939084] hover:text-[#201515] hover:bg-[#eceae3] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            </div>
          );
        })}
      </div>

      {/* ── Column Header Context Menu — rendered once, outside the loop ── */}
      {colHeaderMenu && (
        <div
          data-col-menu
          className="w-52 rounded-[12px] overflow-hidden"
          style={{
            position: 'fixed',
            top: colHeaderMenu.y + 4,
            left: colHeaderMenu.x,
            zIndex: 99999,
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.4)'
          }}
        >
          {/* Column name header */}
          <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center gap-2">
            <div className="w-5 h-5 rounded-[4px] bg-white/10 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="1" y="1" width="3" height="8" rx="1" fill="rgba(255,255,255,0.5)"/>
                <rect x="6" y="1" width="3" height="5" rx="1" fill="rgba(255,255,255,0.3)"/>
              </svg>
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-white/70">{colHeaderMenu.col}</span>
          </div>

          {/* Menu items group 1 */}
          <div className="p-1.5">
            {[
              { icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 4h9M4 7h5M6 10h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>, label: 'Sort' },
              { icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 4h9M2 7h9M2 10h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>, label: 'Sort entire column' },
              { icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="1.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="7.5" y="1.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1.5" y="7.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>, label: 'Group' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => setColHeaderMenu(null)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-white/70 hover:bg-white/10 hover:text-white transition-colors text-left"
              >
                <span className="shrink-0 text-white/40">{item.icon}</span>
                <span className="text-[11px] font-bold">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-1.5 border-t border-white/10" />

          {/* Menu items group 2 */}
          <div className="p-1.5">
            {[
              { icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M10 6.5H3M3 6.5L5.5 4M3 6.5L5.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="1.5" y1="1.5" x2="1.5" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>, label: 'Move to start' },
              { icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5H10M10 6.5L7.5 4M10 6.5L7.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="11.5" y1="1.5" x2="11.5" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>, label: 'Move to end' },
              { icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 11V7.5M2 7.5L4 9.5M2 7.5L4 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.5 2h3a1 1 0 011 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8.5" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3"/></svg>, label: 'Automate' },
              { icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5C1.5 6.5 4 2 6.5 2s5 4.5 5 4.5-2.5 4.5-5 4.5S1.5 6.5 1.5 6.5z" stroke="currentColor" strokeWidth="1.3"/><line x1="2" y1="2" x2="11" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>, label: 'Hide column' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => setColHeaderMenu(null)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-white/70 hover:bg-white/10 hover:text-white transition-colors text-left"
              >
                <span className="shrink-0 text-white/40">{item.icon}</span>
                <span className="text-[11px] font-bold">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Assign with AI CTA */}
          <div className="p-1.5 pt-0">
            <button
              onClick={() => setColHeaderMenu(null)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[8px] transition-all text-white text-[11px] font-black uppercase tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
                boxShadow: '0 4px 12px rgba(124,58,237,0.4)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1L7.5 4.5H11L8.5 6.5L9.5 10L6.5 8L3.5 10L4.5 6.5L2 4.5H5.5L6.5 1Z" fill="white" opacity="0.9"/>
              </svg>
              <span>Assign with AI</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Group Header Context Menu ── */}
      {groupHeaderMenu && (() => {
        const statusVal = groupHeaderMenu.statusVal;
        const groupTasks = filteredTasks.filter(t => t.status === statusVal);
        const badgeDetails = getStatusBadge(statusVal);
        const isCollapsed = collapsedGroups[statusVal];

        return (
          <div
            data-group-menu
            className="w-56 rounded-[12px] overflow-hidden"
            style={(() => {
              const menuHeight = groupTasks.length > 0 ? 330 : 165;
              const spaceBelow = window.innerHeight - groupHeaderMenu.y;
              const shouldShowAbove = spaceBelow < menuHeight;
              const topPos = shouldShowAbove
                ? Math.max(10, (groupHeaderMenu.buttonTop || groupHeaderMenu.y) - menuHeight - 4)
                : groupHeaderMenu.y + 4;

              return {
                position: 'fixed',
                top: topPos,
                left: Math.max(10, groupHeaderMenu.x - 224),
                zIndex: 99999,
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.4)'
              };
            })()}
          >
            {/* Header info */}
            <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest ${badgeDetails.style}`}>
                {badgeDetails.label}
              </span>
              <span className="text-[11px] font-black text-white/50">{groupTasks.length} tasks</span>
            </div>

            {/* General Actions */}
            <div className="p-1.5 space-y-0.5">
              <button
                onClick={() => {
                  triggerQuickAdd(statusVal);
                  setGroupHeaderMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-white/70 hover:bg-white/10 hover:text-white transition-colors text-left"
              >
                <Plus size={13} className="shrink-0 text-white/40" />
                <span className="text-[11px] font-bold">Quick Add Task</span>
              </button>

              <button
                onClick={() => {
                  toggleGroup(statusVal);
                  setGroupHeaderMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-white/70 hover:bg-white/10 hover:text-white transition-colors text-left"
              >
                {isCollapsed ? (
                  <>
                    <ChevronDown size={13} className="shrink-0 text-white/40" />
                    <span className="text-[11px] font-bold">Expand Group</span>
                  </>
                ) : (
                  <>
                    <ChevronRight size={13} className="shrink-0 text-white/40" />
                    <span className="text-[11px] font-bold">Collapse Group</span>
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="mx-1.5 border-t border-white/10" />

            {/* Board-wide Actions */}
            <div className="p-1.5 space-y-0.5">
              <button
                onClick={() => {
                  expandAllGroups();
                  setGroupHeaderMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-white/70 hover:bg-white/10 hover:text-white transition-colors text-left"
              >
                <Eye size={13} className="shrink-0 text-white/40" />
                <span className="text-[11px] font-bold">Expand All Groups</span>
              </button>

              <button
                onClick={() => {
                  collapseAllGroups();
                  setGroupHeaderMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-white/70 hover:bg-white/10 hover:text-white transition-colors text-left"
              >
                <EyeOff size={13} className="shrink-0 text-white/40" />
                <span className="text-[11px] font-bold">Collapse All Groups</span>
              </button>
            </div>

            {/* Divider */}
            {groupTasks.length > 0 && (
              <>
                <div className="mx-1.5 border-t border-white/10" />

                {/* Bulk Actions */}
                <div className="p-1.5 space-y-0.5">
                  <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/40">
                    Move all tasks to:
                  </div>
                  {statuses
                    .filter(s => s !== statusVal)
                    .map(s => {
                      const tgtBadge = getStatusBadge(s);
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            handleMoveGroupTasks(statusVal, s);
                            setGroupHeaderMenu(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[6px] text-white/60 hover:bg-white/10 hover:text-white transition-colors text-left"
                        >
                          <ArrowRight size={11} className="shrink-0 text-white/30" />
                          <span className="text-[11px] font-bold">{tgtBadge.label}</span>
                        </button>
                      );
                    })}

                  <div className="mx-1.5 my-1 border-t border-white/5" />

                  <button
                    onClick={() => {
                      handleClearGroupTasks(statusVal);
                      setGroupHeaderMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-left"
                  >
                    <Trash2 size={13} className="shrink-0" />
                    <span className="text-[11px] font-bold">Clear All Tasks</span>
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Task Detail View */}
      {selectedTask && isDetailOpen && (
        <TaskDetailView
          task={tasks.find(t => t._id === selectedTask._id) || selectedTask}
          onTaskChange={() => fetchData(true)}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedTask(null);
            fetchData(true);
          }}
        />
      )}

      {/* Hidden File Input for Inline Comments Attachments */}

      {/* Mission Registry Section (Higher Roles Only) */}
      {isHigherRole && (
        <div className="mt-10 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="zap-card !bg-[#201515] border-none !px-8 !pt-6 !pb-5 flex flex-col gap-4 shadow-2xl rounded-[5px] min-h-[680px]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-4">
                 <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-3"><ShieldCheck size={16} className="text-[#00a76b]" /> Mission Registry</h4>
                 <span className="bg-[#00a76b] text-white text-[9px] font-black px-2 py-0.5 rounded-[5px] uppercase tracking-tighter">{filteredRegistryTasks.length} Nodes Detected</span>
               </div>
               
               <div className="flex flex-wrap items-center gap-4">
                 {userRole !== 'employee' && (
                    <div className="relative" ref={registryFilterRef}>
                        <div 
                        onClick={() => setShowRegistryRoleDropdown(!showRegistryRoleDropdown)}
                        className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-[5px] px-5 py-1.5 h-12 cursor-pointer hover:border-[#00a76b]/40 transition-all min-w-[180px]"
                        >
                        <Users size={16} className="text-[#00a76b]" />
                        <span className="text-[11px] font-black text-white uppercase tracking-widest flex-1">
                            {registryRoleOptions.find(o => o.value === registryRoleFilter)?.label || 'All Roles'}
                        </span>
                        <ChevronDown size={14} className={`text-white/40 transition-transform duration-300 ${showRegistryRoleDropdown ? 'rotate-180' : ''}`} />
                        </div>
                        
                        {showRegistryRoleDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#201515] border border-white/10 rounded-[5px] shadow-2xl z-[100] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            {registryRoleOptions.map((opt) => (
                                <div 
                                key={opt.value}
                                onClick={() => { setRegistryRoleFilter(opt.value); setShowRegistryRoleDropdown(false); }}
                                className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${registryRoleFilter === opt.value ? 'bg-[#00a76b] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                                >
                                    {opt.label}
                                </div>
                            ))}
                        </div>
                        )}
                    </div>
                 )}

                 <div className="relative group cursor-pointer" onClick={(e) => e.currentTarget.querySelector('input').showPicker()}>
                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00a76b]" size={16} />
                   <input 
                     type="date" 
                     value={registryDate}
                     max={today}
                     onChange={(e) => setRegistryDate(e.target.value)}
                     className="h-12 pl-12 pr-6 bg-white/5 border border-white/10 rounded-[5px] text-[11px] font-black text-white focus:outline-none focus:border-[#00a76b] transition-all cursor-pointer uppercase shadow-lg w-full"
                   />
                 </div>
                 <button onClick={() => fetchRegistryTasks(registryDate)} className={`p-3 bg-white/5 hover:bg-[#00a76b]/10 rounded-[5px] text-white/40 hover:text-[#00a76b] transition-all border border-white/10 hover:border-[#00a76b] cursor-pointer ${isRegistrySyncing ? 'animate-spin text-[#00a76b]' : ''}`}><RefreshCw size={16} /></button>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto overflow-x-hidden h-[600px] absolute-invisible-scroll pt-6 px-2 pb-8">
                {paginatedRegistryTasks.length === 0 ? (
                  <div className="col-span-full py-16 text-center bg-white/5 border border-dashed border-white/10 rounded-[5px] animate-pulse h-full flex flex-col items-center justify-center">
                      <p className="text-[11px] font-black uppercase tracking-widest text-white/40">No {registryRoleFilter !== 'All' ? registryRoleFilter : ''} missions logged for {registryDate}</p>
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-2 italic">Protocol: Initialize new nodes for this date</p>
                  </div>
                ) : paginatedRegistryTasks.map(task => (
                  <div 
                    key={task._id || (task.title + task.description)} 
                    onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                    className="bg-white/5 border border-white/10 p-6 rounded-[5px] flex flex-col gap-6 group hover:border-[#00a76b]/50 transition-all shadow-lg hover:shadow-[#00a76b]/5 h-fit cursor-pointer"
                  >
                      <div className="min-w-0 pr-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                               <div className="w-8 h-8 rounded-full bg-[#00a76b]/10 border border-[#00a76b]/30 flex items-center justify-center text-[#00a76b] text-[10px] font-black uppercase shrink-0">
                                  {task.employeeName?.substring(0, 2) || '??'}
                               </div>
                               <div className="min-w-0">
                                  <p className="text-[10px] font-black text-white truncate leading-none uppercase tracking-tighter">{task.employeeName || 'Unknown Agent'}</p>
                                  <span className={`text-[8px] font-black uppercase tracking-widest mt-1 inline-block ${task.employeeRole === 'HR' ? 'text-rose-400' : task.employeeRole === 'Manager' ? 'text-amber-400' : 'text-blue-400'}`}>
                                     {task.employeeRole || 'Infiltrator'}
                                  </span>
                                </div>
                            </div>

                            <p className="text-[18px] font-black text-white truncate tracking-tight">{task.title}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className={`w-2 h-2 rounded-full ${task.status === 'Completed' ? 'bg-emerald-500' : task.status === 'Review' ? 'bg-[#00a76b]' : task.status === 'Need to Improve' ? 'bg-rose-500 animate-pulse' : task.status === 'Ongoing' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${task.status === 'Need to Improve' ? 'text-rose-400' : 'text-white/40'}`}>
                                {task.status === 'Review' ? 'UNDER REVIEW' : task.status}
                              </span>
                            </div>
                          </div>
                          
                          {task.attachments?.length > 0 && (
                            <div className="flex gap-2">
                              <div 
                                onClick={(e) => { e.stopPropagation(); openRegistryGallery(task.attachments, 0); }}
                                className="w-14 h-14 rounded-[5px] border-2 border-white/10 overflow-hidden bg-white/10 flex items-center justify-center transition-all cursor-pointer hover:scale-110 hover:border-[#00a76b]/50 shadow-2xl relative group"
                              >
                                {((task.attachments[0].fileName || task.attachments[0].path || '').match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) || (task.attachments[0].fileType?.startsWith('image/')) ? (
                                  <img 
                                    src={getEvidenceUrl(task.attachments[0])} 
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100/201515/ff4f00?text=LOST'; }}
                                  />
                                ) : (
                                  <FileText size={18} className="text-white/40 group-hover:text-[#00a76b] transition-colors" />
                                )}
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all flex items-center justify-center">
                                  <span className="text-[10px] font-black text-white">{task.attachments.length > 1 ? `+${task.attachments.length}` : 'VIEW'}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {registryStatusNote.taskId === task._id ? (
                        <div className="bg-white/10 p-4 rounded-[5px] animate-in zoom-in-95 duration-200">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#00a76b] mb-2 block flex items-center gap-2"><MessageSquare size={10} /> Reason for {registryStatusNote.nextStatus} Status</label>
                          <textarea 
                            autoFocus
                            required
                            placeholder="Provide a brief update..." 
                            className="w-full h-20 bg-black/20 border border-white/10 rounded-[5px] p-3 text-[12px] text-white focus:outline-none focus:border-[#00a76b]/50 resize-none mb-3"
                            value={registryStatusNote.note}
                            onChange={e => setRegistryStatusNote({...registryStatusNote, note: e.target.value})}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setRegistryStatusNote({ taskId: null, nextStatus: null, note: '' })} className="flex-1 h-9 rounded-[5px] bg-white/5 text-white/40 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 border-none cursor-pointer">Cancel</button>
                            <button 
                              onClick={() => updateRegistryTaskStatus(task._id, registryStatusNote.nextStatus, registryStatusNote.note)}
                              disabled={!registryStatusNote.note.trim()}
                              className="flex-[2] h-9 rounded-[5px] bg-[#00a76b] text-white text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all border-none cursor-pointer disabled:opacity-50"
                            >
                              Confirm Status Update
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 w-full">
                             {isHigherRole && task.status === 'Review' ? (
                                <>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleRegistryStatusClick(task._id, 'Need to Improve'); }}
                                        className="h-10 px-4 col-span-1 rounded-[5px] bg-rose-500/10 text-rose-500 border border-rose-500/50 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <AlertCircle size={14} /> IMPROVE
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleRegistryStatusClick(task._id, 'Completed'); }}
                                        className="h-10 px-4 col-span-1 rounded-[5px] bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={14} /> COMPLETE
                                    </button>
                                </>
                            ) : (
                                [
                                    { s: 'Pending', c: 'bg-amber-500' },
                                    { s: 'Ongoing', c: 'bg-blue-500' },
                                    { s: 'Review', c: 'bg-[#00a76b]' },
                                    ...(isHigherRole ? [{ s: 'Completed', c: 'bg-emerald-500' }] : [])
                                ].map((btn, idx) => (
                                    <button 
                                        key={btn.s}
                                        onClick={(e) => { e.stopPropagation(); task._id && handleRegistryStatusClick(task._id, btn.s); }}
                                        className={`h-10 px-4 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer flex items-center justify-center gap-1 shadow-lg ${isHigherRole && (btn.s === 'Completed' || btn.s === 'Review') ? 'col-span-2' : !isHigherRole && btn.s === 'Review' ? 'col-span-2' : 'col-span-1'} ${task.status === btn.s ? btn.c + ' text-white ring-2 ring-white/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.status === btn.s ? 'bg-white' : btn.c}`}></div>
                                        <span>{btn.s}</span>
                                    </button>
                                ))
                            )}
                        </div>
                      )}
                  </div>
                ))}
            </div>

            {totalRegistryPages > 1 && (
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/5">
                 <button 
                   onClick={() => setRegistryCurrentPage(prev => Math.max(1, prev - 1))}
                   disabled={registryCurrentPage === 1}
                   className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-[#00a76b] text-white rounded-[5px] border border-white/10 transition-all disabled:opacity-20 disabled:hover:bg-white/5 cursor-pointer"
                 >
                  <ChevronLeft size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Previous</span>
                 </button>
                 
                 <div className="flex items-center gap-2">
                    {Array.from({ length: totalRegistryPages }).map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setRegistryCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-[5px] text-[10px] font-black border transition-all cursor-pointer ${registryCurrentPage === i + 1 ? 'bg-[#00a76b] border-[#00a76b] text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20'}`}
                      >
                         {i + 1}
                      </button>
                    ))}
                 </div>

                 <button 
                   onClick={() => setRegistryCurrentPage(prev => Math.min(totalRegistryPages, prev + 1))}
                   disabled={registryCurrentPage === totalRegistryPages}
                   className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-[#00a76b] text-white rounded-[5px] border border-white/10 transition-all disabled:opacity-20 disabled:hover:bg-white/5 cursor-pointer"
                 >
                  <span className="text-[10px] font-black uppercase tracking-widest">Next</span>
                  <ChevronRight size={16} />
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Gallery for Registry */}
      {registryPreviewGallery.items.length > 0 && (
        <div className="fixed inset-0 z-[9999] bg-[#201515]/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <button onClick={() => setRegistryPreviewGallery({ items: [], index: 0 })} className="absolute top-6 right-6 w-12 h-12 rounded-[5px] bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border-none cursor-pointer z-[10001]">
            <X size={24} />
          </button>
          
          {registryPreviewGallery.items.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); setRegistryPreviewGallery(prev => ({ ...prev, index: (prev.index - 1 + prev.items.length) % prev.items.length })) }}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-[5px] bg-white/10 text-white flex items-center justify-center hover:bg-[#00a76b] transition-all border-none cursor-pointer z-[10001]"
              >
                <ChevronLeft size={32} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setRegistryPreviewGallery(prev => ({ ...prev, index: (prev.index + 1) % prev.items.length })) }}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-[5px] bg-white/10 text-white flex items-center justify-center hover:bg-[#00a76b] transition-all border-none cursor-pointer z-[10001]"
              >
                <ChevronRight size={32} />
              </button>
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-2 bg-white/10 rounded-[5px] text-white text-[12px] font-black uppercase tracking-[0.3em] backdrop-blur-md">
                {registryPreviewGallery.index + 1} / {registryPreviewGallery.items.length}
              </div>
            </>
          )}

          <div className="max-w-full max-h-[85vh] flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
            {registryPreviewGallery.items[registryPreviewGallery.index].isImage ? (
              <img 
                src={registryPreviewGallery.items[registryPreviewGallery.index].url} 
                alt="Full Preview" 
                className="max-w-full max-h-[80vh] object-contain rounded-[5px] shadow-2xl ring-1 ring-white/10"
                onError={(e) => { 
                  e.target.onerror = null; 
                  e.target.src = 'https://placehold.co/600x400/201515/ff4f00?text=IMAGE+LOST+IN+MATRIX';
                }}
              />
            ) : (
              <div className="w-[400px] aspect-video bg-white/5 rounded-[5px] border border-white/10 flex flex-col items-center justify-center p-10 text-center gap-6 backdrop-blur-md">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-[#00a76b]"><FileText size={40} /></div>
                <div>
                  <p className="text-white text-[18px] font-black tracking-tight line-clamp-1">{registryPreviewGallery.items[registryPreviewGallery.index].name}</p>
                  <p className="text-white/40 text-[12px] font-bold uppercase tracking-widest mt-1">Non-Visual Document detected</p>
                </div>
                <a 
                  href={registryPreviewGallery.items[registryPreviewGallery.index].url} 
                  download 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-14 bg-[#00a76b] text-white rounded-[5px] font-black text-[12px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 no-underline hover:scale-105 transition-all"
                >
                  DOWNLOAD FILE <Download size={18} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Note Popup for Registry */}
      {registryStatusNote.taskId && (
        <div className="fixed inset-0 z-[10000] bg-[#201515]/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white rounded-[5px] p-10 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-300">
              <button 
                onClick={() => setRegistryStatusNote({ taskId: null, nextStatus: null, note: '' })} 
                className="absolute top-6 right-6 text-[#939084] hover:text-[#00a76b] border-none bg-transparent cursor-pointer"
              >
                <X size={24} />
              </button>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-[5px] bg-[#00a76b]/10 flex items-center justify-center text-[#00a76b]">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase">Status <span className="text-[#00a76b]">Report.</span></h2>
                  <p className="text-[10px] font-bold text-[#939084] uppercase tracking-[0.2em]">Required for transition to {registryStatusNote.nextStatus}</p>
                </div>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#939084] mb-3 block ml-1">Progress Intelligence</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-5 text-[#939084]/60" size={18} />
                      <textarea 
                        autoFocus
                        placeholder="What is the current status of this objective?"
                        className="w-full h-40 pl-12 pr-5 pt-4 bg-white rounded-[5px] text-[15px] font-medium focus:outline-none border border-[#eceae3] focus:border-[#00a76b]/40 shadow-sm resize-none leading-relaxed" 
                        value={registryStatusNote.note} 
                        onChange={e => setRegistryStatusNote({...registryStatusNote, note: e.target.value})} 
                      />
                    </div>
                 </div>
                 <button 
                   onClick={() => updateRegistryTaskStatus(registryStatusNote.taskId, registryStatusNote.nextStatus, registryStatusNote.note)}
                   disabled={!registryStatusNote.note.trim()}
                   className="w-full h-14 bg-[#201515] hover:bg-[#00a76b] text-white rounded-[5px] font-black text-[12px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                 >
                    SEND UPDATE <Send size={18} />
                 </button>
              </div>
           </div>
        </div>
      )}

      <input
        type="file"
        multiple
        ref={inlineFileInputRef}
        onChange={handleInlineFileChange}
        className="hidden"
      />

      {isCreateModalOpen && (
        <TaskCreate 
          isModal={true} 
          onClose={() => setIsCreateModalOpen(false)} 
          onSuccess={() => fetchData(true)}
          defaultStatus={createModalDefaultStatus}
        />
      )}
      {taskToDelete && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setTaskToDelete(null)}>
          <div className="relative bg-[#fffdf9] dark:bg-[#181612] w-full max-w-sm rounded-[16px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-[#c5c0b1] dark:border-[#38352e]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setTaskToDelete(null)} className="absolute top-4 right-4 text-[#939084] hover:text-[#201515] dark:text-[#a3a094] dark:hover:text-white transition-colors bg-transparent border-none cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#282520]">
              <X size={20} />
            </button>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                <Trash2 size={32} />
              </div>
              <h2 className="text-lg font-bold text-[#201515] dark:text-white mb-2">Delete Task</h2>
              <p className="text-sm text-[#939084] dark:text-[#a3a094]">
                Are you sure you want to permanently delete this task? This action cannot be undone.
              </p>
            </div>
            <div className="p-4 bg-[#eceae3] dark:bg-[#282520] border-t border-[#c5c0b1] dark:border-[#38352e] flex gap-3">
              <button onClick={() => setTaskToDelete(null)} className="flex-1 py-2.5 text-sm font-bold text-[#201515] dark:text-white bg-white dark:bg-[#38352e] border border-[#c5c0b1] dark:border-[#4a4740] hover:bg-gray-50 dark:hover:bg-[#4a4740] rounded-[8px] transition-colors shadow-sm cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmDeleteTask} className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-[8px] shadow-sm transition-colors border-none cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Tasks;
