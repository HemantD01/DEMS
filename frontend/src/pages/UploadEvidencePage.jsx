import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { formatFileSize } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function UploadEvidencePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState({
    caseId: searchParams.get('caseId') || '',
    title: '',
    description: '',
    tags: '',
  });

  useEffect(() => {
    api.get('/cases?limit=100').then(res => setCases(res.data.cases)).catch(() => {});
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer?.files?.[0] || e.target.files?.[0];
    if (dropped) {
      setFile(dropped);
      if (!form.title) setForm(f => ({ ...f, title: dropped.name.replace(/\.[^.]+$/, '') }));
    }
  }, [form.title]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file'); return; }
    if (!form.caseId) { toast.error('Please select a case'); return; }
    if (!form.title) { toast.error('Please provide a title'); return; }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', form.caseId);
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('tags', form.tags);

    try {
      const res = await api.post('/evidence/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      toast.success('Evidence uploaded and hashed successfully');
      navigate(`/evidence/${res.data.evidence.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
      setUploading(false);
      setProgress(0);
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return '🖼';
    if (type === 'application/pdf') return '📄';
    if (type?.startsWith('text/')) return '📝';
    if (type?.startsWith('video/')) return '🎬';
    if (type?.startsWith('audio/')) return '🎵';
    if (type?.includes('zip')) return '📦';
    return '📁';
  };

  return (
    <div className="animate-slide-up max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Upload Evidence</h1>
          <p className="text-sm text-slate-500 mt-0.5">Files are SHA-256 hashed upon upload for integrity verification</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* File Drop Zone */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Evidence File *</label>
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              dragging ? 'border-primary-500 bg-primary-500/10' :
              file ? 'border-emerald-500/50 bg-emerald-500/5' :
              'border-slate-600/50 hover:border-slate-500/70 bg-slate-800/30'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={handleDrop}
              disabled={uploading}
            />
            {file ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-left">
                  <span className="text-3xl">{getFileIcon(file.type)}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(file.size)} · {file.type || 'Unknown type'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >✕</button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">↑</div>
                <p className="text-sm text-slate-300 font-medium">Drop file here or click to browse</p>
                <p className="text-xs text-slate-600 mt-1">Max 50MB · Images, PDF, Documents, Archives, Media</p>
              </div>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Case *</label>
          <select
            className="input-field"
            value={form.caseId}
            onChange={e => setForm({ ...form, caseId: e.target.value })}
            required
          >
            <option value="">Select a case…</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.case_number} — {c.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Evidence Title *</label>
          <input
            className="input-field"
            placeholder="Descriptive title for this evidence"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
          <textarea
            className="input-field"
            rows={3}
            placeholder="What is this evidence? Where was it obtained? Relevant context…"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Tags <span className="text-slate-600">(comma separated)</span></label>
          <input
            className="input-field"
            placeholder="e.g. network-log, server, suspicious-activity"
            value={form.tags}
            onChange={e => setForm({ ...form, tags: e.target.value })}
          />
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3">
          <span className="text-blue-400 text-sm flex-shrink-0 mt-0.5">ℹ</span>
          <div className="text-xs text-blue-400/80 space-y-1">
            <p>Upon upload, a <strong className="text-blue-400">SHA-256 hash</strong> is automatically generated and stored.</p>
            <p>All access is tracked in the <strong className="text-blue-400">chain of custody</strong> log.</p>
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Uploading & hashing…</span>
              <span className="text-xs font-mono text-primary-400">{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button type="submit" disabled={uploading || !file} className="btn-primary flex-1 justify-center">
            {uploading ? `Uploading ${progress}%…` : '↑ Upload & Hash Evidence'}
          </button>
        </div>
      </form>
    </div>
  );
}
