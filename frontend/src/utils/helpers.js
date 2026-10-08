import { formatDistanceToNow, format } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
};

export const formatRelative = (date) => {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

export const truncateHash = (hash, chars = 16) => {
  if (!hash) return '—';
  return `${hash.slice(0, chars)}...${hash.slice(-8)}`;
};

export const getStatusBadgeClass = (status) => {
  const map = {
    active: 'badge-active',
    open: 'badge-info',
    closed: 'badge-neutral',
    archived: 'badge-neutral',
    under_review: 'badge-warning',
    tampered: 'badge-danger',
    critical: 'badge-danger',
    high: 'badge-warning',
    medium: 'badge-info',
    low: 'badge-active',
    success: 'badge-active',
    failure: 'badge-danger',
    warning: 'badge-warning',
  };
  return map[status] || 'badge-neutral';
};

export const getActionIcon = (action) => {
  const map = {
    upload: '↑',
    view: '👁',
    download: '↓',
    verify: '✓',
    update: '✎',
    archive: '◫',
    tamper_detected: '⚠',
    LOGIN_SUCCESS: '→',
    LOGIN_FAILED: '✗',
    LOGOUT: '←',
    EVIDENCE_UPLOADED: '↑',
    EVIDENCE_VIEWED: '👁',
    EVIDENCE_VERIFIED: '✓',
    EVIDENCE_TAMPER_DETECTED: '⚠',
    CASE_CREATED: '+',
    CASE_UPDATED: '✎',
    USER_CREATED: '+',
    PASSWORD_CHANGED: '🔑',
  };
  return map[action] || '•';
};

export const getRoleBadge = (role) => {
  return role === 'admin' ? 'badge-purple' : 'badge-info';
};
