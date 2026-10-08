const express = require('express');
const { query } = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');

const router = express.Router();

// GET /api/cases
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (req.user.role !== 'admin') {
      conditions.push(`(c.created_by = $${paramIdx} OR c.assigned_to = $${paramIdx})`);
      params.push(req.user.id);
      paramIdx++;
    }
    if (status) {
      conditions.push(`c.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }
    if (priority) {
      conditions.push(`c.priority = $${paramIdx}`);
      params.push(priority);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT c.*, 
              u1.full_name AS created_by_name, u1.username AS created_by_username,
              u2.full_name AS assigned_to_name,
              COUNT(DISTINCT e.id) AS evidence_count
       FROM cases c
       LEFT JOIN users u1 ON c.created_by = u1.id
       LEFT JOIN users u2 ON c.assigned_to = u2.id
       LEFT JOIN evidence e ON c.id = e.case_id
       ${whereClause}
       GROUP BY c.id, u1.full_name, u1.username, u2.full_name
       ORDER BY c.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM cases c ${whereClause}`,
      params
    );

    res.json({
      cases: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (err) {
    console.error('Get cases error:', err);
    res.status(500).json({ error: 'Failed to fetch cases.' });
  }
});

// GET /api/cases/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*,
              u1.full_name AS created_by_name, u1.username AS created_by_username,
              u2.full_name AS assigned_to_name
       FROM cases c
       LEFT JOIN users u1 ON c.created_by = u1.id
       LEFT JOIN users u2 ON c.assigned_to = u2.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    const evidenceResult = await query(
      `SELECT e.*, u.full_name AS uploaded_by_name
       FROM evidence e
       LEFT JOIN users u ON e.uploaded_by = u.id
       WHERE e.case_id = $1 ORDER BY e.created_at DESC`,
      [req.params.id]
    );

    await auditLog(req.user.id, 'CASE_VIEWED', 'case', req.params.id, null, req);

    res.json({
      case: result.rows[0],
      evidence: evidenceResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch case.' });
  }
});

// POST /api/cases
router.post('/', authenticate, async (req, res) => {
  const { caseNumber, title, description, priority, assignedTo } = req.body;
  if (!caseNumber || !title) {
    return res.status(400).json({ error: 'Case number and title are required.' });
  }

  try {
    const existing = await query('SELECT id FROM cases WHERE case_number = $1', [caseNumber]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Case number already exists.' });
    }

    const result = await query(
      `INSERT INTO cases (case_number, title, description, priority, created_by, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [caseNumber, title, description, priority || 'medium', req.user.id, assignedTo || null]
    );

    await auditLog(req.user.id, 'CASE_CREATED', 'case', result.rows[0].id, { caseNumber, title }, req);
    res.status(201).json({ case: result.rows[0], message: 'Case created successfully.' });
  } catch (err) {
    console.error('Create case error:', err);
    res.status(500).json({ error: 'Failed to create case.' });
  }
});

// PUT /api/cases/:id
router.put('/:id', authenticate, async (req, res) => {
  const { title, description, status, priority, assignedTo } = req.body;

  try {
    const existing = await query('SELECT * FROM cases WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    if (req.user.role !== 'admin' && existing.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions to update this case.' });
    }

    const result = await query(
      `UPDATE cases
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           assigned_to = COALESCE($5, assigned_to),
           updated_at = NOW(),
           closed_at = CASE WHEN $3 = 'closed' THEN NOW() ELSE closed_at END
       WHERE id = $6
       RETURNING *`,
      [title, description, status, priority, assignedTo, req.params.id]
    );

    await auditLog(req.user.id, 'CASE_UPDATED', 'case', req.params.id, { status, priority }, req);
    res.json({ case: result.rows[0], message: 'Case updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update case.' });
  }
});

module.exports = router;
