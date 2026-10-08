const { query } = require('../models/db');

const auditLog = async (userId, action, resourceType, resourceId, details, req, status = 'success') => {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId || null,
        action,
        resourceType || null,
        resourceId || null,
        details ? JSON.stringify(details) : null,
        req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress) : null,
        req ? (req.headers['user-agent'] || 'unknown') : null,
        status,
      ]
    );
  } catch (err) {
    console.error('Audit log error (non-fatal):', err.message);
  }
};

const addCustodyRecord = async (evidenceId, action, userId, req, notes = null, hashAtTime = null) => {
  try {
    await query(
      `INSERT INTO chain_of_custody (evidence_id, action, performed_by, ip_address, user_agent, notes, hash_at_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        evidenceId,
        action,
        userId,
        req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress) : null,
        req ? (req.headers['user-agent'] || 'unknown') : null,
        notes,
        hashAtTime,
      ]
    );
  } catch (err) {
    console.error('Chain of custody error (non-fatal):', err.message);
  }
};

module.exports = { auditLog, addCustodyRecord };
