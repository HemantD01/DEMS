const express = require('express');
const { query } = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userFilter = isAdmin ? '' : `AND (c.created_by = '${req.user.id}' OR c.assigned_to = '${req.user.id}')`;

    const [casesResult, evidenceResult, recentActivity, integrityStats] = await Promise.all([
      query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') AS active,
          COUNT(*) FILTER (WHERE status = 'open') AS open,
          COUNT(*) FILTER (WHERE status = 'closed') AS closed,
          COUNT(*) AS total
        FROM cases c WHERE 1=1 ${userFilter}
      `),
      query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE e.status = 'tampered') AS tampered,
          COUNT(*) FILTER (WHERE e.status = 'active') AS active,
          SUM(e.file_size) AS total_size
        FROM evidence e
        LEFT JOIN cases c ON e.case_id = c.id
        WHERE 1=1 ${userFilter}
      `),
      query(`
        SELECT al.action, al.created_at, al.resource_type, al.status,
               u.full_name AS user_name, u.role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${isAdmin ? '' : `WHERE al.user_id = '${req.user.id}'`}
        ORDER BY al.created_at DESC
        LIMIT 10
      `),
      query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') AS intact,
          COUNT(*) FILTER (WHERE status = 'tampered') AS tampered
        FROM evidence e
        LEFT JOIN cases c ON e.case_id = c.id
        WHERE 1=1 ${userFilter}
      `),
    ]);

    res.json({
      cases: casesResult.rows[0],
      evidence: evidenceResult.rows[0],
      recentActivity: recentActivity.rows,
      integrity: integrityStats.rows[0],
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
});

// GET /api/dashboard/audit-logs
router.get('/audit-logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action, status } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (userId) { conditions.push(`al.user_id = $${idx++}`); params.push(userId); }
    if (action) { conditions.push(`al.action ILIKE $${idx++}`); params.push(`%${action}%`); }
    if (status) { conditions.push(`al.status = $${idx++}`); params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT al.*, u.full_name AS user_name, u.username, u.role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const countResult = await query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params);

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

module.exports = router;
