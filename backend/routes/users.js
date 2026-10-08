const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');

const router = express.Router();

// GET /api/users - Admin only
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, email, role, full_name, badge_number, department,
              is_active, created_at, last_login
       FROM users ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// POST /api/users - Admin creates user
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { username, email, password, role, fullName, badgeNumber, department } = req.body;

  if (!username || !email || !password || !role || !fullName) {
    return res.status(400).json({ error: 'Username, email, password, role, and full name are required.' });
  }

  if (!['admin', 'investigator'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or investigator.' });
  }

  try {
    const existing = await query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (username, email, password_hash, role, full_name, badge_number, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, role, full_name, badge_number, department, created_at`,
      [username.toLowerCase().trim(), email.toLowerCase().trim(), passwordHash, role, fullName, badgeNumber, department]
    );

    await auditLog(req.user.id, 'USER_CREATED', 'user', result.rows[0].id, { username, role }, req);
    res.status(201).json({ user: result.rows[0], message: 'User created successfully.' });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/users/:id/toggle - Admin toggles user status
router.put('/:id/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `UPDATE users SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 RETURNING id, username, is_active`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    await auditLog(req.user.id, 'USER_STATUS_TOGGLED', 'user', req.params.id,
      { isActive: result.rows[0].is_active }, req);
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

module.exports = router;
