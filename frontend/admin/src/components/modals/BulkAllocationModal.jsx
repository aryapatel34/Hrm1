import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X, Upload, FileText } from 'lucide-react';

const BulkAllocationModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    try {
      setLoading(true);
      // Simulate bulk allocation upload
      setTimeout(() => {
        toast.success('Bulk allocation processed successfully');
        onClose();
        setLoading(false);
      }, 1500);
    } catch (err) {
      toast.error('Failed to process bulk allocation');
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm p-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <X size={20} />
        </button>
        
        <div className="flex-1 flex flex-col justify-between h-full pt-6">
          <div className="overflow-y-auto pr-1 flex-1 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Bulk Leave Allocation</h2>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
              <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                <FileText size={16} /> Instructions
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Upload a CSV file containing Employee ID, Leave Type, Action (add/deduct), and Days.
              </p>
              <button type="button" className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-2 hover:underline">
                Download Sample Template
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0f172a] hover:bg-gray-100 dark:hover:bg-[#1e293b] transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept=".csv, .xlsx"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <Upload size={32} className="text-gray-400 mb-3" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 text-center">
                {file ? file.name : 'Click or drag file to upload'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Supports CSV, XLSX</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading || !file} className="px-4 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Uploading...' : 'Upload & Allocate'}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default BulkAllocationModal;
