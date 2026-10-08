import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatDate, getStatusBadgeClass } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ action: '', status: '' });

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 50 };
      if (filters.action) params.action = filters.action;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/dashboard/audit-logs', { params });
      setLogs(res.data.logs);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(page); }, [page, filters]);

  const getActionColor = (action) => {
    if (action?.includes('FAILED') || action?.includes('TAMPER')) return 'text-red-400';
    if (action?.includes('DELETE') || action?.includes('DISABLED')) return 'text-amber-400';
    if (action?.includes('LOGIN') || action?.includes('CREATED')) return 'text-emerald-400';
    return 'text-slate-400';
  };

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} total events</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-500">Live</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          className="input-field w-48 text-xs"
          placeholder="Filter by action…"
          value={filters.action}
          onChange={e => { setFilters({ ...filters, action: e.target.value }); setPage(1); }}
        />
        <select
          className="input-field w-auto text-xs"
          value={filters.status}
          onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="warning">Warning</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/50">
              {['Timestamp', 'User', 'Role', 'Action', 'Resource', 'Status', 'IP Address'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-600">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-600">No logs found</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="table-row">
                <td className="px-4 py-2.5 text-slate-500 font-mono whitespace-nowrap">
                  {formatDate(log.created_at)}
                </td>
                <td className="px-4 py-2.5 text-slate-300">{log.user_name || '—'}</td>
                <td className="px-4 py-2.5">
                  {log.role && (
                    <span className={`badge ${log.role === 'admin' ? 'badge-purple' : 'badge-info'}`}>{log.role}</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`font-medium ${getActionColor(log.action)}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-500">{log.resource_type || '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`badge ${getStatusBadgeClass(log.status)}`}>{log.status}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-600 font-mono">{log.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-700/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
              >← Prev</button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
