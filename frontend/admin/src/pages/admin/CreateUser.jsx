import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  UserPlus,
  User,
  Mail,
  Lock,
  Shield,
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  Info,
  Fingerprint,
  RefreshCw,
  Plus,
  ChevronDown,
  Camera,
  MapPin,
  Phone
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import CustomDatePicker from '../../components/CustomDatePicker';

const CreateUser = () => {
  const navigate = useNavigate();
  const today = new Date();
  const maxDobDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    personalEmail: '',
    phone: '',
    password: '',
    role: 'employee',
    designation: '',
    gender: 'Male',
    address: '',
    dob: '',
    joinDate: new Date().toISOString().split('T')[0],
    reportingManager: ''
  });
  const [managers, setManagers] = useState([]);
  const [nextId, setNextId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '', employeeId: '', status: '' });
  const [errors, setErrors] = useState({});

  // Image State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Document State
  const [adharFile, setAdharFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);
  const [panFile, setPanFile] = useState(null);

  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchNextId = async () => {
      try {
        const res = await axios.get(`/api/personnel/next-id/${formData.role}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNextId(res.data.nextId);
      } catch (err) { console.warn('ID Sync Delayed'); }
    };

    const fetchManagers = async () => {
      try {
        const res = await axios.get('/api/personnel/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setManagers(Array.isArray(res.data) ? res.data : []);
      } catch (err) { console.warn('Personnel Sync Delayed'); }
    };

    if (token) {
      fetchNextId();
      fetchManagers();
    }
  }, [formData.role, token]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    let newErrors = { ...errors, [name]: '' };

    if (name === 'firstName' || name === 'lastName' || name === 'middleName') {
      // Remove spaces and non-alphabetic characters
      if (value && !/^[A-Za-z]*$/.test(value)) {
        const fieldDisplayName = name === 'firstName' ? 'First Name' : name === 'lastName' ? 'Last Name' : 'Middle Name';
        newErrors[name] = `${fieldDisplayName} allows only alphabetic characters (no spaces).`;
        value = value.replace(/[^A-Za-z]/g, '');
      }
    }

    if (name === 'phone') {
      if (value && !/^[0-9]*$/.test(value)) {
        newErrors.phone = 'Only numbers (0-9) are allowed.';
        value = value.replace(/[^0-9]/g, '');
      }
      if (value.length > 10) {
        value = value.slice(0, 10);
      }
    }

    if (name === 'email' || name === 'personalEmail') {
      if (/\s/.test(value)) {
        newErrors[name] = 'Spaces are not allowed in email address.';
        value = value.replace(/\s/g, '');
      } else if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[name] = 'Please enter a valid email format (e.g., user@example.com).';
      }
    }

    if (name === 'password' && value) {
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
      if (!passwordRegex.test(value)) {
        newErrors.password = 'Password must be minimum 8 characters, 1 special symbol, minimum 1 capital letter, and minimum 1 number.';
      }
    }

    setErrors(newErrors);
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setErrors(prev => ({ ...prev, profilePicture: '' }));
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, profilePicture: 'Only JPG and PNG images are allowed.' }));
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDocumentChange = (e, setter, documentName) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error(`Invalid format for ${documentName}. Please upload a JPG or PNG image.`, {
        style: { background: '#ff4f00', color: '#fff', fontWeight: 'bold' }
      });
      e.target.value = '';
      return;
    }

    setter(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Custom Validation
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = 'First Name is required.';
    if (!formData.lastName) newErrors.lastName = 'Last Name is required.';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email) {
      newErrors.email = 'Email Address is required.';
    } else if (!emailRegex.test(formData.email) || /@(gmal|gaml|gmil|gmial|gmaill)\.com$/i.test(formData.email)) {
      newErrors.email = 'Please enter a valid email format with correct spelling.';
    }

    if (!formData.personalEmail) {
      newErrors.personalEmail = 'Personal Email Address is required.';
    } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(formData.personalEmail.trim())) {
      newErrors.personalEmail = 'Personal Email must be a valid @gmail.com address (e.g. name@gmail.com).';
    }
    if (!formData.phone) {
      newErrors.phone = 'Phone Number is required.';
    } else if (formData.phone.length !== 10) {
      newErrors.phone = 'Phone Number must be exactly 10 digits.';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else {
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        newErrors.password = 'Password must be minimum 8 characters, 1 special symbol, minimum 1 capital letter, and minimum 1 number.';
      }
    }
    if (!formData.role) newErrors.role = 'System Role is required.';
    if (!formData.gender) newErrors.gender = 'Gender is required.';
    if (!formData.joinDate) newErrors.joinDate = 'Join Date is required.';

    if (!formData.dob) {
      newErrors.dob = 'Date of Birth is required.';
    } else {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      if (age < 18) {
        newErrors.dob = 'Employee must be at least 18 years old.';
      }
    }

    if (!['hr', 'manager', 'admin'].includes(formData.role) && !formData.reportingManager) {
      newErrors.reportingManager = 'Reporting Manager is required.';
    }
    if (!formData.address) newErrors.address = 'Physical Address is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '', employeeId: '', status: '' });

    try {
      const payload = {
        name: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim(),
        email: formData.email,
        personalEmail: formData.personalEmail,
        password: formData.password,
        role: formData.role,
        designation: formData.designation,
        phone: formData.phone,
        gender: formData.gender,
        address: formData.address,
        dob: formData.dob,
        joinDate: formData.joinDate,
        reportingManager: formData.role === 'employee' ? formData.reportingManager : null
      };

      // 1. Create User Core
      const response = await axios.post('/api/users/create', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { user } = response.data;
      const profileId = user.profileId; // 🎯 SYNC: Use the actual Profile ID, not User ID

      const toBase64 = file => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      // 2. Upload Photo if selected (Sequential Linkage)
      if (selectedFile && profileId) {
        try {
          const base64 = await toBase64(selectedFile);
          await axios.post(`/api/employees/${profileId}/profile-image`, { image: base64 }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (imgErr) {
          console.warn('Photo upload failed but user was created:', imgErr);
        }
      }

      // 3. Upload Documents if selected
      if (adharFile && profileId) {
        try {
          const base64 = await toBase64(adharFile);
          await axios.post(`/api/employees/${profileId}/adhar-card`, { document: base64 }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) { console.warn('Adhar upload failed:', err); }
      }

      if (bankFile && profileId) {
        try {
          const base64 = await toBase64(bankFile);
          await axios.post(`/api/employees/${profileId}/bank-details`, { document: base64 }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) { console.warn('Bank detail upload failed:', err); }
      }

      if (panFile && profileId) {
        try {
          const base64 = await toBase64(panFile);
          await axios.post(`/api/employees/${profileId}/pan-card`, { document: base64 }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) { console.warn('PAN Card upload failed:', err); }
      }

      setMessage({
        type: 'success',
        text: 'Employee profile created successfully.',
        employeeId: user?.employeeId,
        status: user?.status
      });

      toast.success('Employee Created Successfully', {
        style: {
          background: '#00a76b',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: '4px',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#00a76b',
        }
      });

      // Cleanup
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        personalEmail: '',
        password: '',
        role: formData.role,
        designation: '',
        gender: 'Male',
        phone: '',
        address: '',
        dob: '',
        joinDate: new Date().toISOString().split('T')[0],
        reportingManager: ''
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setAdharFile(null);
      setBankFile(null);
      setPanFile(null);

    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to create employee.';
      if (errMsg.toLowerCase().includes('personal email')) {
        setErrors(prev => ({ ...prev, personalEmail: errMsg }));
      } else if (errMsg.toLowerCase().includes('email')) {
        setErrors(prev => ({ ...prev, email: errMsg }));
      } else {
        setMessage({
          type: 'error',
          text: errMsg
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in pb-32">
      {/* TOAST NOTIFICATION */}
      {message.text && (
        <div className={`fixed top-24 right-8 bg-[#fffefb] border border-[#c5c0b1] shadow-xl p-8 rounded-[8px] flex items-center gap-6 animate-fade-in z-[100] min-w-[400px]`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${message.type === 'success' ? 'bg-[#24a148] text-white' : 'bg-[#00a76b] text-white'}`}>
            {message.type === 'success' ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
          </div>
          <div className="flex-1">
            <h4 className="zap-caption-upper !text-[#939084] mb-2">{message.type === 'success' ? 'Success' : 'Error'}</h4>
            <p className="text-[16px] font-bold text-[#201515] leading-tight mb-4">{message.text}</p>

            {message.employeeId && (
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-[#eceae3] text-[#201515] rounded-2xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <Fingerprint size={14} /> {message.employeeId}
                </div>
                <div className="px-3 py-1.5 bg-[#24a148] text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest">
                  {message.status || 'ACTIVE'}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setMessage({ type: '', text: '', employeeId: '', status: '' })} className="self-start text-[#939084] hover:text-[#201515]">
            <X size={20} />
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-12 border-b border-[#eceae3] pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Create Employee</h1>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* FORM SIDE */}
        <div className="zap-card !bg-white dark:!bg-[#13221e] border border-[#eceae3] dark:border-[#1a2d29] p-12">
          {/* AVATAR UPLOAD SECTION */}
          <div className="flex flex-col items-center mb-12 border-b border-[#eceae3] pb-12">
            <div className="relative group">
              <div className="w-32 h-32 rounded-2xl bg-[#eceae3] border-2 border-dashed border-[#c5c0b1] flex items-center justify-center overflow-hidden transition-all group-hover:border-[#00a76b]">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover shadow-2xl" />
                ) : (
                  <User size={48} className={`${errors.profilePicture ? 'text-red-400' : 'text-[#939084]'} opacity-30`} />
                )}
              </div>
              <label htmlFor="user-photo" className="absolute -bottom-3 -right-3 w-10 h-10 bg-[#00a76b] text-white rounded-xl flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 active:scale-95 transition-all">
                <Camera size={18} />
                <input
                  id="user-photo"
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            <p className="zap-caption-upper !text-[#939084] mt-6">Profile Picture <span className="text-xs normal-case opacity-70">(JPG/PNG)</span></p>
            {errors.profilePicture && <p className="text-red-500 text-sm mt-2 text-center">{errors.profilePicture}</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-10" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* First Name */}
              <div className="space-y-4">
                <label className="zap-caption-upper text-[#201515]">First Name <span className="text-[#ff4f00] ml-1">*</span></label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" />
                  <input
                    required name="firstName" value={formData.firstName} onChange={handleChange}
                    className="w-full h-14 pl-12 pr-4 bg-white border border-[#c5c0b1] rounded-2xl text-[15px] font-medium text-[#201515] focus:outline-none focus:border-[#00a76b] transition-all"
                    placeholder="Enter first name..."
                    maxLength="20"
                  />
                </div>
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>

              {/* Middle Name */}
              <div className="space-y-4">
                <label className="zap-caption-upper text-[#201515]">Middle Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" />
                  <input
                    name="middleName" value={formData.middleName} onChange={handleChange}
                    className={`w-full h-14 pl-12 pr-4 bg-white border ${errors.middleName ? 'border-red-500' : 'border-[#c5c0b1]'} rounded-2xl text-[15px] font-medium text-[#201515] focus:outline-none focus:border-[#ff4f00] transition-all`}
                    placeholder="Enter middle name (optional)..."
                    maxLength="20"
                  />
                </div>
                {errors.middleName && <p className="text-red-500 text-sm mt-1">{errors.middleName}</p>}
              </div>

              {/* Last Name */}
              <div className="space-y-4">
                <label className="zap-caption-upper text-[#201515]">Last Name <span className="text-[#ff4f00] ml-1">*</span></label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" />
                  <input
                    required name="lastName" value={formData.lastName} onChange={handleChange}
                    className="w-full h-14 pl-12 pr-4 bg-white border border-[#c5c0b1] rounded-2xl text-[15px] font-medium text-[#201515] focus:outline-none focus:border-[#00a76b] transition-all"
                    placeholder="Enter last name..."
                    maxLength="20"
                  />
                </div>
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>

              {/* Email Address */}
              <div className="space-y-4">
                <label className="zap-caption-upper text-[#201515]">Office Email Address <span className="text-[#ff4f00] ml-1">*</span></label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" />
                  <input
                    required name="email" value={formData.email} onChange={handleChange}
                    className={`w-full h-14 pl-12 pr-4 bg-white border ${errors.email ? 'border-red-500' : 'border-[#c5c0b1]'} rounded-2xl text-[15px] font-medium text-[#201515] focus:outline-none focus:border-[#ff4f00] transition-all`}
                    placeholder="email@example.com"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Personal Email Address */}
              <div className="space-y-4">
                <label className="zap-caption-upper text-[#201515]">Personal Email Address <span className="text-[#ff4f00] ml-1">*</span></label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" />
                  <input
                    required name="personalEmail" value={formData.personalEmail} onChange={handleChange}
                    className={`w-full h-14 pl-12 pr-4 bg-white border ${errors.personalEmail ? 'border-red-500' : 'border-[#c5c0b1]'} rounded-2xl text-[15px] font-medium text-[#201515] focus:outline-none focus:border-[#ff4f00] transition-all`}
                    placeholder="personal@gmail.com"
                  />
                </div>
                {errors.personalEmail && <p className="text-red-500 text-sm mt-1">{errors.personalEmail}</p>}
              </div>

              {/* Phone Number */}
              <div className="space-y-4">
                <label className="zap-caption-upper text-[#201515]">Phone Number <span className="text-[#ff4f00] ml-1">*</span></label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" />
                  <input
                    required name="phone" value={formData.phone} onChange={handleChange}
                    className={`w-full h-14 pl-12 pr-4 bg-white border ${errors.phone ? 'border-red-500' : 'border-[#c5c0b1]'} rounded-2xl text-[15px] font-medium text-[#201515] focus:outline-none focus:border-[#ff4f00] transition-all`}
                    placeholder="Enter 10-digit phone number..."
                    maxLength="10"
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              {/* Password */}
              <div className="space-y-4">
                <label className="zap-caption-upper text-[#201515]">Password <span className="text-[#ff4f00] ml-1">*</span></label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" />
                  <input
                    required name="password" value={formData.password} onChange={handleChange} maxLength="20"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full h-14 pl-12 pr-12 bg-white border border-[#c5c0b1] rounded-2xl text-[15px] font-medium text-[#201515] focus:outline-none focus:border-[#00a76b] transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#939084] hover:text-[#00a76b] transition-all bg-transparent border-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              {/* System Role */}
              <div className="space-y-4">
                <label className="zap-caption-upper text-[#201515]">System Role <span className="text-[#ff4f00] ml-1">*</span></label>
                <div className="relative">
                  <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" />
                  <select
                    required name="role" value={formData.role} onChange={handleChange}
                    className="w-full h-14 pl-12 pr-12 bg-white border border-[#c5c0b1] rounded-2xl text-[15px] font-bold text-[#201515] focus:outline-none focus:border-[#00a76b] appearance-none cursor-pointer"
                  >
                    <option value="hr">HR</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                    <option value="admin">System Admin</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#939084] pointer-events-none" />
                </div>
                {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
              </div>

              {/* Designation */}
              <div className="space-y-4">
                <label className="zap-caption-upper text-[#201515]">Designation</label>
                <div className="relative">
                  <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" />
                  <input
                    name="designation" value={formData.designation} onChange={handleChange}
                    className={`w-full h-14 pl-12 pr-4 bg-white border border-[#c5c0b1] rounded-2xl text-[15px] font-medium text-[#201515] focus:outline-none focus:border-[#ff4f00] transition-all`}
                    placeholder="Enter designation (e.g. Software Engineer)..."
                    maxLength="50"
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-4">
                <label className="zap-caption-upper text-[#201515]">Gender <span className="text-[#ff4f00] ml-1">*</span></label>
                <div className="relative">
                  <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" />
                  <select
                    required name="gender" value={formData.gender} onChange={handleChange}
                    className="w-full h-14 pl-12 pr-12 bg-white border border-[#c5c0b1] rounded-2xl text-[15px] font-bold text-[#201515] focus:outline-none focus:border-[#00a76b] appearance-none cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#939084] pointer-events-none" />
                </div>
                {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
              </div>

              {/* Join Date */}
              <div className="space-y-4">
                <label className="zap-caption-upper text-[#201515]">Join Date <span className="text-[#ff4f00] ml-1">*</span></label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" />
                  <input
                    required type="date" name="joinDate" value={formData.joinDate} onChange={handleChange}
                    className="w-full h-14 pl-12 pr-4 bg-white border border-[#c5c0b1] rounded-2xl text-[15px] font-bold text-[#201515] focus:outline-none focus:border-[#00a76b]"
                  />
                </div>
                {errors.joinDate && <p className="text-red-500 text-sm mt-1">{errors.joinDate}</p>}
              </div>

              {/* Birth Date */}
              <div className="space-y-4">
                <label className="zap-caption-upper text-[#201515]">Date of Birth <span className="text-[#ff4f00] ml-1">*</span></label>
                <div className="relative">
                  <CustomDatePicker
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    placeholder="Select Date"
                    maxDate={new Date().toISOString().split('T')[0]}
                    className={`w-full h-14 bg-white border ${errors.dob ? 'border-red-500' : 'border-[#c5c0b1]'} rounded-2xl text-[15px] font-bold text-[#201515] transition-all hover:border-[#ff4f00]`}
                  />
                </div>
                {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob}</p>}
              </div>

              {/* Reporting Manager */}
              {!['hr', 'manager', 'admin'].includes(formData.role) && (
                <div className="space-y-4">
                  <label className="zap-caption-upper text-[#201515]">Reporting Manager <span className="text-[#ff4f00] ml-1">*</span></label>
                  <div className="relative">
                    <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084]" />
                    <select
                      required name="reportingManager" value={formData.reportingManager} onChange={handleChange}
                      className="w-full h-14 pl-12 pr-12 bg-white border border-[#c5c0b1] rounded-2xl text-[15px] font-bold text-[#201515] focus:outline-none focus:border-[#00a76b] appearance-none cursor-pointer"
                    >
                      <option value="">Select Reporting Manager</option>
                      {managers
                        .filter(m => ['manager', 'admin'].includes(m.role?.toLowerCase()))
                        .map(m => (
                          <option key={m._id} value={m._id}>{m.name || m.fullName} ({m.role?.toUpperCase()})</option>
                        ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#939084] pointer-events-none" />
                  </div>
                  {errors.reportingManager && <p className="text-red-500 text-sm mt-1">{errors.reportingManager}</p>}
                </div>
              )}

              {/* Address */}
              <div className="space-y-4 col-span-full">
                <label className="zap-caption-upper text-[#201515]">Physical Address <span className="text-[#ff4f00] ml-1">*</span></label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-4 text-[#939084]" />
                  <textarea
                    name="address" value={formData.address} onChange={handleChange}
                    className="w-full h-32 pl-12 pr-4 pt-4 bg-white border border-[#c5c0b1] rounded-2xl text-[15px] font-medium text-[#201515] focus:outline-none focus:border-[#00a76b] transition-all resize-none"
                    placeholder="Enter physical location address..."
                  />
                  <div className="absolute bottom-3 right-4 text-[11px] font-bold text-[#939084]">
                    {formData.address?.length || 0}/250
                  </div>
                </div>
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </div>
            </div>

            {/* DOCUMENT VAULT SECTION */}
            <div className="pt-10 border-t border-[#eceae3] space-y-8">
              <h3 className="zap-caption-upper !text-[#201515]">Identity Verification Vault</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Adharcard */}
                <div className={`p-5 rounded-[8px] border-2 border-dashed transition-all flex flex-col justify-between h-full ${adharFile ? 'bg-[#24a148]/5 border-[#24a148]' : 'bg-white border-[#c5c0b1] hover:border-[#00a76b]'}`}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border border-[#eceae3] transition-all shrink-0 ${adharFile ? 'bg-white cursor-pointer hover:scale-105 active:scale-95 shadow-sm' : 'bg-[#eceae3] text-[#939084]'}`}
                        onClick={() => adharFile && window.open(URL.createObjectURL(adharFile), '_blank')}
                      >
                        {adharFile ? (
                          <img src={URL.createObjectURL(adharFile)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Info size={24} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-[#201515] mb-0.5">Adharcard</p>
                      </div>
                    </div>
                    {adharFile && <span className="text-[10px] font-black text-[#24a148] uppercase tracking-widest bg-[#24a148]/10 px-2 py-1 rounded-2xl">Ready</span>}
                  </div>
                  <label className="zap-btn !h-12 !text-[12px] !bg-[#201515] hover:!bg-[#00a76b] !text-white w-full cursor-pointer flex items-center justify-center transition-colors">
                    {adharFile ? 'Change Document' : 'Upload Document'}
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => handleDocumentChange(e, setAdharFile, 'Adharcard')} />
                  </label>
                </div>

                {/* Bank Details */}
                <div className={`p-5 rounded-[8px] border-2 border-dashed transition-all flex flex-col justify-between h-full ${bankFile ? 'bg-[#24a148]/5 border-[#24a148]' : 'bg-white border-[#c5c0b1] hover:border-[#00a76b]'}`}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border border-[#eceae3] transition-all shrink-0 ${bankFile ? 'bg-white cursor-pointer hover:scale-105 active:scale-95 shadow-sm' : 'bg-[#eceae3] text-[#939084]'}`}
                        onClick={() => bankFile && window.open(URL.createObjectURL(bankFile), '_blank')}
                      >
                        {bankFile ? (
                          <img src={URL.createObjectURL(bankFile)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[24px]">credit_card</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-[#201515] mb-0.5">Bank Details</p>
                      </div>
                    </div>
                    {bankFile && <span className="text-[10px] font-black text-[#24a148] uppercase tracking-widest bg-[#24a148]/10 px-2 py-1 rounded-2xl">Ready</span>}
                  </div>
                  <label className="zap-btn !h-12 !text-[12px] !bg-[#201515] hover:!bg-[#00a76b] !text-white w-full cursor-pointer flex items-center justify-center transition-colors">
                    {bankFile ? 'Change Document' : 'Upload Document'}
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => handleDocumentChange(e, setBankFile, 'Bank Details')} />
                  </label>
                </div>

                {/* PAN Card */}
                <div className={`p-5 rounded-[8px] border-2 border-dashed transition-all flex flex-col justify-between h-full ${panFile ? 'bg-[#24a148]/5 border-[#24a148]' : 'bg-white border-[#c5c0b1] hover:border-[#00a76b]'}`}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border border-[#eceae3] transition-all shrink-0 ${panFile ? 'bg-white cursor-pointer hover:scale-105 active:scale-95 shadow-sm' : 'bg-[#eceae3] text-[#939084]'}`}
                        onClick={() => panFile && window.open(URL.createObjectURL(panFile), '_blank')}
                      >
                        {panFile ? (
                          <img src={URL.createObjectURL(panFile)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[24px]">badge</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-[#201515] mb-0.5">Pan Card</p>
                      </div>
                    </div>
                    {panFile && <span className="text-[10px] font-black text-[#24a148] uppercase tracking-widest bg-[#24a148]/10 px-2 py-1 rounded-2xl">Ready</span>}
                  </div>
                  <label className="zap-btn !h-12 !text-[12px] !bg-[#201515] hover:!bg-[#00a76b] !text-white w-full cursor-pointer flex items-center justify-center transition-colors">
                    {panFile ? 'Change Document' : 'Upload Document'}
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => handleDocumentChange(e, setPanFile, 'PAN Card')} />
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-10 border-t border-[#c5c0b1] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3 text-[#939084] text-[13px] font-medium">
                <Info size={16} className="text-[#00a76b]" />
                User records will be distributed across organizational clusters.
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button
                  type="submit" disabled={loading}
                  className="zap-btn !bg-[#00a76b] !text-white h-14 px-12 min-w-[200px] whitespace-nowrap shadow-lg hover:brightness-110 transition-all font-bold rounded-lg"
                >
                  {loading ? <RefreshCw className="animate-spin mr-3" size={18} /> : <Plus size={18} className="mr-3 text-white" />}
                  {loading ? 'Saving...' : 'Save Employee'}
                </button>
                <button type="button" onClick={() => navigate(-1)} className="zap-btn zap-btn-light h-14 px-10">Cancel</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;
