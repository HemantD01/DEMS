import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatRelative, getStatusBadgeClass, formatFileSize } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ label, value, icon, color = 'primary', sub }) => {
  const colorMap = {
    primary: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
  return (
    <div className="stat-card gap-3">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xl ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value ?? '—'}</p>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

const ActivityItem = ({ item }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-700/30 last:border-0">
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${
      item.status === 'failure' ? 'bg-red-500/15 text-red-400' :
      item.status === 'warning' ? 'bg-amber-500/15 text-amber-400' :
      'bg-primary-500/15 text-primary-400'
    }`}>
      {item.status === 'failure' ? '✗' : item.status === 'warning' ? '⚠' : '✓'}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm text-slate-200 truncate">
        <span className="font-medium">{item.user_name || 'System'}</span>
        {' · '}
        <span className="text-slate-400">{item.action?.replace(/_/g, ' ').toLowerCase()}</span>
      </p>
      <p className="text-xs text-slate-600 mt-0.5">{formatRelative(item.created_at)}</p>
    </div>
    <span className={`badge flex-shrink-0 ${getStatusBadgeClass(item.status)}`}>
      {item.status}
    </span>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-slate-100">
            Welcome back, <span className="text-gradient">{user?.fullName?.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link to="/evidence/upload" className="btn-primary">
          ↑ Upload Evidence
        </Link>
      </div>

      {/* Integrity Alert */}
      {parseInt(stats?.integrity?.tampered) > 0 && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <span className="text-red-400 text-xl">⚠</span>
          <div>
            <p className="text-red-400 font-semibold text-sm">Integrity Alert</p>
            <p className="text-red-400/70 text-xs mt-0.5">
              {stats.integrity.tampered} evidence item(s) flagged as tampered. Immediate review required.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Cases" value={stats?.cases?.total} icon="◫" color="primary" />
        <StatCard label="Active Cases" value={stats?.cases?.active} icon="⚡" color="amber" />
        <StatCard label="Evidence Items" value={stats?.evidence?.total} icon="🗂" color="blue"
          sub={formatFileSize(stats?.evidence?.total_size)} />
        <StatCard
          label="Integrity Status"
          value={parseInt(stats?.integrity?.tampered) > 0 ? `${stats.integrity.tampered} Flagged` : 'All Clear'}
          icon={parseInt(stats?.integrity?.tampered) > 0 ? '⚠' : '✓'}
          color={parseInt(stats?.integrity?.tampered) > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Cases Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Case Status</p>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Open', value: stats?.cases?.open, color: 'bg-blue-400' },
              { label: 'Active', value: stats?.cases?.active, color: 'bg-amber-400' },
              { label: 'Closed', value: stats?.cases?.closed, color: 'bg-slate-500' },
            ].map(({ label, value, color }) => {
              const total = parseInt(stats?.cases?.total) || 1;
              const pct = Math.round((parseInt(value) / total) * 100);
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-slate-300 font-medium">{value || 0}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/cases" className="block mt-4 text-xs text-primary-400 hover:text-primary-300">
            View all cases →
          </Link>
        </div>

        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Evidence Summary</p>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Intact', value: stats?.integrity?.intact, color: 'bg-emerald-400' },
              { label: 'Tampered', value: stats?.integrity?.tampered, color: 'bg-red-400' },
            ].map(({ label, value, color }) => {
              const total = parseInt(stats?.evidence?.total) || 1;
              const pct = Math.round((parseInt(value) / total) * 100);
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-slate-300 font-medium">{value || 0}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/evidence" className="block mt-4 text-xs text-primary-400 hover:text-primary-300">
            View all evidence →
          </Link>
        </div>

        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Quick Actions</p>
          <div className="flex flex-col gap-2">
            <Link to="/cases" className="btn-secondary justify-start text-xs py-2">◫ Manage Cases</Link>
            <Link to="/evidence/upload" className="btn-secondary justify-start text-xs py-2">↑ Upload Evidence</Link>
            <Link to="/evidence" className="btn-secondary justify-start text-xs py-2">🗂 Browse Evidence</Link>
            {isAdmin && <Link to="/audit-logs" className="btn-secondary justify-start text-xs py-2">📋 Audit Logs</Link>}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="section-title text-sm">Recent Activity</p>
          {isAdmin && (
            <Link to="/audit-logs" className="text-xs text-primary-400 hover:text-primary-300">View all →</Link>
          )}
        </div>
        {stats?.recentActivity?.length > 0 ? (
          <div>
            {stats.recentActivity.map((item, i) => <ActivityItem key={i} item={item} />)}
          </div>
        ) : (
          <p className="text-slate-600 text-sm text-center py-6">No recent activity</p>
        )}
      </div>
    </div>
  );
}
