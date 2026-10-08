import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatDate, getStatusBadgeClass, formatFileSize } from '../utils/helpers';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/cases/${id}`)
      .then(res => {
        setData(res.data);
        setForm({
          title: res.data.case.title,
          description: res.data.case.description || '',
          status: res.data.case.status,
          priority: res.data.case.priority,
        });
      })
      .catch(() => { toast.error('Case not found'); navigate('/cases'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/cases/${id}`, form);
      setData(prev => ({ ...prev, case: res.data.case }));
      toast.success('Case updated');
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { case: caseData, evidence } = data;

  return (
    <div className="animate-slide-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-5">
        <Link to="/cases" className="hover:text-slate-300">Cases</Link>
        <span>/</span>
        <span className="text-slate-400">{caseData.case_number}</span>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-slate-100">{caseData.title}</h1>
            <span className={`badge ${getStatusBadgeClass(caseData.status)}`}>{caseData.status}</span>
            <span className={`badge ${getStatusBadgeClass(caseData.priority)}`}>{caseData.priority}</span>
          </div>
          <p className="text-sm text-slate-500 font-mono">{caseData.case_number}</p>
        </div>
        <div className="flex gap-2">
          {(isAdmin) && (
            <button onClick={() => setEditing(true)} className="btn-secondary">✎ Edit</button>
          )}
          <Link to={`/evidence/upload?caseId=${id}`} className="btn-primary">↑ Add Evidence</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Case Info */}
        <div className="card p-5 lg:col-span-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Case Details</p>
          {caseData.description ? (
            <p className="text-sm text-slate-300 leading-relaxed mb-4">{caseData.description}</p>
          ) : (
            <p className="text-sm text-slate-600 italic mb-4">No description provided</p>
          )}
          <div className="grid grid-cols-2 gap-4 text-xs">
            {[
              { label: 'Case Number', value: caseData.case_number, mono: true },
              { label: 'Created By', value: caseData.created_by_name },
              { label: 'Assigned To', value: caseData.assigned_to_name || 'Unassigned' },
              { label: 'Created', value: formatDate(caseData.created_at) },
              { label: 'Last Updated', value: formatDate(caseData.updated_at) },
              { label: 'Closed', value: caseData.closed_at ? formatDate(caseData.closed_at) : '—' },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <p className="text-slate-600 mb-0.5">{label}</p>
                <p className={`text-slate-300 ${mono ? 'font-mono' : ''}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-4">
          <div className="stat-card">
            <span className="text-2xl">🗂</span>
            <p className="text-2xl font-bold text-slate-100">{evidence.length}</p>
            <p className="text-xs text-slate-500">Evidence Items</p>
          </div>
          <div className="stat-card">
            <span className="text-2xl">
              {evidence.some(e => e.status === 'tampered') ? '⚠' : '✓'}
            </span>
            <p className={`text-sm font-semibold ${evidence.some(e => e.status === 'tampered') ? 'text-red-400' : 'text-emerald-400'}`}>
              {evidence.some(e => e.status === 'tampered') ? 'Tampering Detected' : 'All Verified'}
            </p>
            <p className="text-xs text-slate-500">Integrity Status</p>
          </div>
        </div>
      </div>

      {/* Evidence List */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <p className="section-title text-sm">Evidence ({evidence.length})</p>
        </div>
        {evidence.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 text-sm">No evidence uploaded yet</p>
            <Link to={`/evidence/upload?caseId=${id}`} className="btn-primary mt-3 inline-flex">
              ↑ Upload First Evidence
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/30">
                {['Evidence #', 'Title', 'Type', 'Size', 'Status', 'Uploaded By', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidence.map((ev) => (
                <tr key={ev.id} className="table-row">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{ev.evidence_number}</td>
                  <td className="px-4 py-3">
                    <Link to={`/evidence/${ev.id}`} className="text-slate-200 hover:text-white font-medium">
                      {ev.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge badge-neutral">{ev.file_type}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatFileSize(ev.file_size)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${getStatusBadgeClass(ev.status)}`}>{ev.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{ev.uploaded_by_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(ev.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/evidence/${ev.id}`} className="text-primary-400 hover:text-primary-300 text-xs">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="card p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-100">Edit Case</h2>
              <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Title</label>
                <input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Status</label>
                  <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {['open', 'active', 'closed', 'archived'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Priority</label>
                  <select className="input-field" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
