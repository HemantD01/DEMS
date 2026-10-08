import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatDate, getStatusBadgeClass, formatFileSize, truncateHash } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function EvidencePage() {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', caseId: '' });
  const [cases, setCases] = useState([]);

  useEffect(() => {
    api.get('/cases?limit=100').then(r => setCases(r.data.cases)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.caseId) params.caseId = filters.caseId;
    api.get('/evidence', { params })
      .then(r => setEvidence(r.data.evidence))
      .catch(() => toast.error('Failed to load evidence'))
      .finally(() => setLoading(false));
  }, [filters]);

  const getFileIcon = (type) => {
    const map = { PDF: '📄', JPG: '🖼', JPEG: '🖼', PNG: '🖼', TXT: '📝', CSV: '📊', JSON: '📋', ZIP: '📦', MP4: '🎬', MP3: '🎵' };
    return map[type?.toUpperCase()] || '📁';
  };

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Evidence</h1>
          <p className="text-sm text-slate-500 mt-0.5">{evidence.length} item{evidence.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/evidence/upload" className="btn-primary">↑ Upload Evidence</Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select className="input-field w-auto text-xs" value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Status</option>
          {['active', 'under_review', 'tampered', 'archived'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select className="input-field w-auto text-xs" value={filters.caseId}
          onChange={e => setFilters({ ...filters, caseId: e.target.value })}>
          <option value="">All Cases</option>
          {cases.map(c => <option key={c.id} value={c.id}>{c.case_number}</option>)}
        </select>
      </div>

      {/* Evidence Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : evidence.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">🗂</p>
          <p className="text-slate-400 font-medium">No evidence found</p>
          <p className="text-slate-600 text-sm mt-1">Upload the first piece of evidence</p>
          <Link to="/evidence/upload" className="btn-primary mt-4 inline-flex">↑ Upload Evidence</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['', 'Title', 'Case', 'Hash (SHA-256)', 'Size', 'Status', 'Uploaded', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidence.map((ev) => (
                <tr key={ev.id} className="table-row">
                  <td className="px-4 py-3 text-lg">{getFileIcon(ev.file_type)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/evidence/${ev.id}`} className="text-slate-200 hover:text-white font-medium">
                      {ev.title}
                    </Link>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">{ev.evidence_number}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/cases/${ev.case_id}`} className="text-primary-400 hover:text-primary-300 text-xs font-mono">
                      {ev.case_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="hash-text">{truncateHash(ev.sha256_hash)}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatFileSize(ev.file_size)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${getStatusBadgeClass(ev.status)}`}>{ev.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(ev.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/evidence/${ev.id}`} className="text-primary-400 hover:text-primary-300 text-xs">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
