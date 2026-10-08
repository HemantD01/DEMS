const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { auditLog, addCustodyRecord } = require('../utils/audit');
const { hashFile, verifyFileIntegrity } = require('../utils/hash');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const caseDir = path.join(UPLOAD_DIR, req.body.caseId || 'uncategorized');
    if (!fs.existsSync(caseDir)) fs.mkdirSync(caseDir, { recursive: true });
    cb(null, caseDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/json', 'application/xml', 'text/xml',
    'application/zip', 'application/x-zip-compressed',
    'video/mp4', 'audio/mpeg', 'audio/wav',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 },
});

// GET /api/evidence - list with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { caseId, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (caseId) { conditions.push(`e.case_id = $${idx++}`); params.push(caseId); }
    if (status) { conditions.push(`e.status = $${idx++}`); params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT e.*, u.full_name AS uploaded_by_name, c.case_number, c.title AS case_title
       FROM evidence e
       LEFT JOIN users u ON e.uploaded_by = u.id
       LEFT JOIN cases c ON e.case_id = c.id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const countResult = await query(`SELECT COUNT(*) FROM evidence e ${where}`, params);

    res.json({
      evidence: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (err) {
    console.error('Get evidence error:', err);
    res.status(500).json({ error: 'Failed to fetch evidence.' });
  }
});

// GET /api/evidence/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, u.full_name AS uploaded_by_name, c.case_number, c.title AS case_title
       FROM evidence e
       LEFT JOIN users u ON e.uploaded_by = u.id
       LEFT JOIN cases c ON e.case_id = c.id
       WHERE e.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evidence not found.' });
    }

    const custodyResult = await query(
      `SELECT coc.*, u.full_name AS performed_by_name, u.username, u.role
       FROM chain_of_custody coc
       LEFT JOIN users u ON coc.performed_by = u.id
       WHERE coc.evidence_id = $1
       ORDER BY coc.performed_at ASC`,
      [req.params.id]
    );

    await addCustodyRecord(req.params.id, 'view', req.user.id, req, 'Evidence record viewed');
    await auditLog(req.user.id, 'EVIDENCE_VIEWED', 'evidence', req.params.id, null, req);

    res.json({
      evidence: result.rows[0],
      chainOfCustody: custodyResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evidence.' });
  }
});

// POST /api/evidence/upload
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { caseId, title, description, tags } = req.body;
  if (!caseId || !title) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Case ID and title are required.' });
  }

  try {
    const caseExists = await query('SELECT id FROM cases WHERE id = $1', [caseId]);
    if (caseExists.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Case not found.' });
    }

    const sha256Hash = await hashFile(req.file.path);

    const evidenceCount = await query('SELECT COUNT(*) FROM evidence WHERE case_id = $1', [caseId]);
    const evidenceNumber = `EVD-${Date.now()}-${parseInt(evidenceCount.rows[0].count) + 1}`;

    const relativePath = path.relative(path.join(__dirname, '..'), req.file.path);

    const result = await query(
      `INSERT INTO evidence
         (case_id, evidence_number, title, description, file_name, original_name,
          file_path, file_type, file_size, sha256_hash, mime_type, tags, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        caseId, evidenceNumber, title, description,
        req.file.filename, req.file.originalname,
        relativePath, path.extname(req.file.originalname).slice(1).toUpperCase(),
        req.file.size, sha256Hash, req.file.mimetype, tags || null, req.user.id,
      ]
    );

    await addCustodyRecord(result.rows[0].id, 'upload', req.user.id, req,
      `File uploaded: ${req.file.originalname} (${req.file.size} bytes)`, sha256Hash);
    await auditLog(req.user.id, 'EVIDENCE_UPLOADED', 'evidence', result.rows[0].id,
      { evidenceNumber, fileName: req.file.originalname, hash: sha256Hash }, req);

    res.status(201).json({
      evidence: result.rows[0],
      message: 'Evidence uploaded successfully.',
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload evidence.' });
  }
});

// POST /api/evidence/:id/verify
router.post('/:id/verify', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM evidence WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evidence not found.' });
    }

    const evidence = result.rows[0];
    const filePath = path.join(__dirname, '..', evidence.file_path);
    const verification = await verifyFileIntegrity(filePath, evidence.sha256_hash);

    if (!verification.verified) {
      await query('UPDATE evidence SET status = $1, updated_at = NOW() WHERE id = $2',
        ['tampered', req.params.id]);
      await addCustodyRecord(req.params.id, 'tamper_detected', req.user.id, req,
        `Integrity check FAILED: ${verification.reason}`, verification.currentHash);
      await auditLog(req.user.id, 'EVIDENCE_TAMPER_DETECTED', 'evidence', req.params.id,
        verification, req, 'warning');
    } else {
      await addCustodyRecord(req.params.id, 'verify', req.user.id, req,
        'Integrity verification passed', evidence.sha256_hash);
      await auditLog(req.user.id, 'EVIDENCE_VERIFIED', 'evidence', req.params.id, null, req);
    }

    res.json({ verification, evidenceId: req.params.id });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Failed to verify evidence.' });
  }
});

// GET /api/evidence/:id/download
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM evidence WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evidence not found.' });
    }

    const evidence = result.rows[0];
    const filePath = path.join(__dirname, '..', evidence.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server.' });
    }

    await addCustodyRecord(evidence.id, 'download', req.user.id, req,
      'File downloaded', evidence.sha256_hash);
    await auditLog(req.user.id, 'EVIDENCE_DOWNLOADED', 'evidence', evidence.id, null, req);

    res.setHeader('Content-Disposition', `attachment; filename="${evidence.original_name}"`);
    res.setHeader('Content-Type', evidence.mime_type);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download file.' });
  }
});

// GET /api/evidence/:id/custody
router.get('/:id/custody', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT coc.*, u.full_name AS performed_by_name, u.username, u.role, u.badge_number
       FROM chain_of_custody coc
       LEFT JOIN users u ON coc.performed_by = u.id
       WHERE coc.evidence_id = $1
       ORDER BY coc.performed_at ASC`,
      [req.params.id]
    );
    res.json({ chainOfCustody: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chain of custody.' });
  }
});

module.exports = router;
