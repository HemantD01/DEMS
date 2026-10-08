import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatDate, formatRelative } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'investigator', fullName: '', badgeNumber: '', department: '' });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.users);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success('User created');
      setShowCreate(false);
      setForm({ username: '', email: '', password: '', role: 'investigator', fullName: '', badgeNumber: '', department: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally { setSaving(false); }
  };

  const handleToggle = async (userId, currentActive) => {
    try {
      await api.put(`/users/${userId}/toggle`);
      toast.success(currentActive ? 'User disabled' : 'User enabled');
      fetchUsers();
    } catch { toast.error('Failed to update user'); }
  };

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} users registered</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Add User</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              {['User', 'Role', 'Badge', 'Department', 'Last Login', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-600">Loading…</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="table-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      user.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                    }`}>
                      {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{user.full_name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${user.role === 'admin' ? 'badge-purple' : 'badge-info'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{user.badge_number || '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{user.department || '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {user.last_login ? formatRelative(user.last_login) : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${user.is_active ? 'badge-active' : 'badge-danger'}`}>
                    {user.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(user.id, user.is_active)}
                    className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                      user.is_active
                        ? 'text-red-400 border-red-500/20 hover:bg-red-500/10'
                        : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                    }`}
                  >
                    {user.is_active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="card p-6 w-full max-w-md animate-slide-up max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-100">Add New User</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Full Name *</label>
                  <input className="input-field" value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Username *</label>
                  <input className="input-field" value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email *</label>
                <input type="email" className="input-field" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Password *</label>
                <input type="password" className="input-field" placeholder="Min 8 characters" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Role *</label>
                  <select className="input-field" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="investigator">Investigator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Badge #</label>
                  <input className="input-field" placeholder="e.g. INV-099" value={form.badgeNumber}
                    onChange={e => setForm({ ...form, badgeNumber: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Department</label>
                <input className="input-field" placeholder="e.g. Cybercrime Unit" value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
