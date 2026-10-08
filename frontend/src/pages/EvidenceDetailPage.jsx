import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { formatDate, getStatusBadgeClass, formatFileSize } from '../utils/helpers';
import toast from 'react-hot-toast';

const CustodyAction = ({ action }) => {
  const icons = {
    upload: { icon: '↑', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    view:   { icon: '👁', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    download: { icon: '↓', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    verify: { icon: '✓', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    update: { icon: '✎', color: 'text-primary-400 bg-primary-500/10 border-primary-500/20' },
    archive: { icon: '◫', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
    tamper_detected: { icon: '⚠', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  };
  const { icon, color } = icons[action.action] || { icon: '•', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };

  return (
    <div className="flex gap-3 pb-4 relative">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs flex-shrink-0 ${color}`}>
          {icon}
        </div>
        <div className="w-px flex-1 bg-slate-700/50 mt-1" />
      </div>
      <div className="flex-1 pb-2 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-200 capitalize">
            {action.action.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-slate-500">by</span>
          <span className="text-sm text-slate-300">{action.performed_by_name}</span>
          <span className={`badge text-xs ${action.role === 'admin' ? 'badge-purple' : 'badge-info'}`}>
            {action.role}
          </span>
          {action.badge_number && (
            <span className="text-xs text-slate-600 font-mono">#{action.badge_number}</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{formatDate(action.performed_at)}</p>
        {action.notes && (
          <p className="text-xs text-slate-500 mt-1 italic">{action.notes}</p>
        )}
        {action.ip_address && (
          <p className="text-xs text-slate-700 mt-0.5 font-mono">IP: {action.ip_address}</p>
        )}
      </div>
    </div>
  );
};

export default function EvidenceDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get(`/evidence/${id}`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Evidence not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.post(`/evidence/${id}/verify`);
      setVerifyResult(res.data.verification);
      if (res.data.verification.verified) {
        toast.success('Integrity verified — file is unmodified');
      } else {
        toast.error('Integrity check FAILED — possible tampering detected!');
        setData(prev => ({ ...prev, evidence: { ...prev.evidence, status: 'tampered' } }));
      }
      // Refresh custody log
      const fresh = await api.get(`/evidence/${id}`);
      setData(fresh.data);
    } catch (err) {
      toast.error('Verification failed');
    } finally { setVerifying(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/evidence/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = data.evidence.original_name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
      // Refresh to show download in custody log
      setTimeout(async () => {
        const fresh = await api.get(`/evidence/${id}`);
        setData(fresh.data);
      }, 1000);
    } catch { toast.error('Download failed'); }
    finally { setDownloading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return null;

  const { evidence: ev, chainOfCustody } = data;

  return (
    <div className="animate-slide-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-5">
        <Link to="/evidence" className="hover:text-slate-300">Evidence</Link>
        <span>/</span>
        <span className="text-slate-400 font-mono">{ev.evidence_number}</span>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-xl font-bold text-slate-100">{ev.title}</h1>
            <span className={`badge ${getStatusBadgeClass(ev.status)}`}>{ev.status}</span>
          </div>
          <p className="text-sm text-slate-500 font-mono">{ev.evidence_number}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleVerify} disabled={verifying} className="btn-success">
            {verifying ? '⟳ Verifying…' : '✓ Verify Integrity'}
          </button>
          <button onClick={handleDownload} disabled={downloading} className="btn-secondary">
            {downloading ? 'Downloading…' : '↓ Download'}
          </button>
        </div>
      </div>

      {/* Tamper Warning */}
      {ev.status === 'tampered' && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <span className="text-red-400 text-2xl">⚠</span>
          <div>
            <p className="text-red-400 font-semibold">Evidence Integrity Compromised</p>
            <p className="text-red-400/70 text-sm">This file's hash does not match the original. It may have been tampered with.</p>
          </div>
        </div>
      )}

      {/* Verify Result */}
      {verifyResult && (
        <div className={`mb-6 p-4 rounded-xl border ${
          verifyResult.verified
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <p className={`font-semibold text-sm mb-2 ${verifyResult.verified ? 'text-emerald-400' : 'text-red-400'}`}>
            {verifyResult.verified ? '✓ Integrity Verified' : '⚠ Integrity Check Failed'}
          </p>
          {!verifyResult.verified && (
            <div className="text-xs space-y-1">
              <p className="text-red-400/70">{verifyResult.reason}</p>
              {verifyResult.currentHash && (
                <p className="text-red-400/70">Current:  <span className="font-mono">{verifyResult.currentHash}</span></p>
              )}
              <p className="text-red-400/70">Expected: <span className="font-mono">{verifyResult.expectedHash}</span></p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* File Info */}
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">File Information</p>
          <div className="space-y-3">
            {[
              { label: 'Original Filename', value: ev.original_name, mono: true },
              { label: 'File Type', value: ev.file_type },
              { label: 'MIME Type', value: ev.mime_type, mono: true },
              { label: 'File Size', value: formatFileSize(ev.file_size) },
              { label: 'Uploaded By', value: ev.uploaded_by_name },
              { label: 'Upload Date', value: formatDate(ev.created_at) },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex justify-between text-sm gap-4">
                <span className="text-slate-500 flex-shrink-0">{label}</span>
                <span className={`text-slate-300 text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hash / Integrity */}
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Integrity & Hash</p>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-2">SHA-256 Hash</p>
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/50">
                <p className="hash-text text-emerald-400 break-all leading-relaxed">{ev.sha256_hash}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
              <span className={`text-xl ${ev.status === 'tampered' ? 'text-red-400' : 'text-emerald-400'}`}>
                {ev.status === 'tampered' ? '⚠' : '🔒'}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {ev.status === 'tampered' ? 'Tampered' : 'Integrity Protected'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {ev.status === 'tampered'
                    ? 'File does not match original hash'
                    : 'File hash recorded at upload time'}
                </p>
              </div>
            </div>
            {ev.case_number && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Case</span>
                <Link to={`/cases/${ev.case_id}`} className="text-primary-400 hover:text-primary-300 font-mono text-xs">
                  {ev.case_number}
                </Link>
              </div>
            )}
            {ev.tags && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {ev.tags.split(',').map(t => (
                    <span key={t.trim()} className="badge badge-neutral">{t.trim()}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {ev.description && (
        <div className="card p-5 mb-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Description</p>
          <p className="text-sm text-slate-300 leading-relaxed">{ev.description}</p>
        </div>
      )}

      {/* Chain of Custody */}
      <div className="card p-5">
        <p className="section-title text-sm mb-5">
          Chain of Custody
          <span className="ml-2 badge badge-info">{chainOfCustody.length} events</span>
        </p>
        {chainOfCustody.length === 0 ? (
          <p className="text-slate-600 text-sm">No custody records</p>
        ) : (
          <div>
            {chainOfCustody.map((entry) => (
              <CustodyAction key={entry.id} action={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
