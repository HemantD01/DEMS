import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatDate, getStatusBadgeClass } from '../utils/helpers';
import toast from 'react-hot-toast';

const PRIORITIES = ['', 'low', 'medium', 'high', 'critical'];
const STATUSES = ['', 'open', 'active', 'closed', 'archived'];

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ caseNumber: '', title: '', description: '', priority: 'medium' });
  const [saving, setSaving] = useState(false);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      const res = await api.get('/cases', { params });
      setCases(res.data.cases);
    } catch { toast.error('Failed to load cases'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCases(); }, [filters]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/cases', form);
      toast.success('Case created');
      setShowCreate(false);
      setForm({ caseNumber: '', title: '', description: '', priority: 'medium' });
      fetchCases();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create case');
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Cases</h1>
          <p className="text-sm text-slate-500 mt-0.5">{cases.length} case{cases.length !== 1 ? 's' : ''} found</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New Case
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select
          className="input-field w-auto text-xs"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}
        </select>
        <select
          className="input-field w-auto text-xs"
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
        >
          {PRIORITIES.map(p => <option key={p} value={p}>{p || 'All Priority'}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              {['Case #', 'Title', 'Status', 'Priority', 'Evidence', 'Created By', 'Created'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-600">Loading…</td></tr>
            ) : cases.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-600">No cases found</td></tr>
            ) : cases.map((c) => (
              <tr key={c.id} className="table-row">
                <td className="px-4 py-3">
                  <Link to={`/cases/${c.id}`} className="text-primary-400 hover:text-primary-300 font-mono text-xs">
                    {c.case_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/cases/${c.id}`} className="text-slate-200 hover:text-white font-medium">
                    {c.title}
                  </Link>
                  {c.description && (
                    <p className="text-xs text-slate-600 mt-0.5 truncate max-w-xs">{c.description}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${getStatusBadgeClass(c.status)}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${getStatusBadgeClass(c.priority)}`}>{c.priority}</span>
                </td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{c.evidence_count || 0}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{c.created_by_name}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="card p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-100">New Case</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Case Number *</label>
                <input className="input-field" placeholder="e.g. CASE-2024-042" value={form.caseNumber}
                  onChange={e => setForm({ ...form, caseNumber: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Title *</label>
                <input className="input-field" placeholder="Case title" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea className="input-field" rows={3} placeholder="Case description…" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Priority</label>
                <select className="input-field" value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {['low', 'medium', 'high', 'critical'].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Creating…' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
