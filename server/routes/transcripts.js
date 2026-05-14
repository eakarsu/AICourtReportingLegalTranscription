const router = require('express').Router();
const pool = require('../db');
const PDFDocument = require('pdfkit');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return null;
}

// GET /api/transcripts/search — full-text search with filters and pagination
router.get('/search', async (req, res) => {
  try {
    const { q, case_number, date_from, date_to, status, page: pageStr, limit: limitStr } = req.query;
    const page = Math.max(1, parseInt(pageStr) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(t.title ILIKE $${paramIdx} OR t.content ILIKE $${paramIdx} OR j.case_name ILIKE $${paramIdx} OR r.name ILIKE $${paramIdx})`);
      paramIdx++;
    }

    if (case_number) {
      params.push(`%${case_number}%`);
      conditions.push(`j.case_number ILIKE $${paramIdx}`);
      paramIdx++;
    }

    if (date_from) {
      params.push(date_from);
      conditions.push(`t.created_at >= $${paramIdx}`);
      paramIdx++;
    }

    if (date_to) {
      params.push(date_to);
      conditions.push(`t.created_at <= $${paramIdx}`);
      paramIdx++;
    }

    if (status) {
      params.push(status);
      conditions.push(`t.status = $${paramIdx}`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `FROM transcripts t
      LEFT JOIN jobs j ON t.job_id = j.id
      LEFT JOIN reporters r ON t.reporter_id = r.id
      LEFT JOIN scopists s ON t.scopist_id = s.id
      LEFT JOIN proofreaders p ON t.proofreader_id = p.id
      ${whereClause}`;

    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT t.id, t.title, t.status, t.page_count, t.created_at, t.updated_at,
              j.case_name as job_case_name, j.case_number as job_case_number,
              r.name as reporter_name, s.name as scopist_name, p.name as proofreader_name
       ${baseQuery} ORDER BY t.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error('Search transcripts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/transcripts/:id/export/pdf — PDF export with legal transcript formatting
router.get('/:id/export/pdf', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, j.case_name as job_case_name, j.case_number as job_case_number,
              r.name as reporter_name, s.name as scopist_name, p.name as proofreader_name
       FROM transcripts t
       LEFT JOIN jobs j ON t.job_id = j.id
       LEFT JOIN reporters r ON t.reporter_id = r.id
       LEFT JOIN scopists s ON t.scopist_id = s.id
       LEFT JOIN proofreaders p ON t.proofreader_id = p.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Transcript not found' });
    const transcript = result.rows[0];

    const doc = new PDFDocument({
      margin: 72,      // 1 inch margins (72 pts)
      size: 'LETTER',
      info: {
        Title: transcript.title || 'Legal Transcript',
        Author: transcript.reporter_name || 'Court Reporter',
        Subject: transcript.job_case_name || 'Legal Proceeding'
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=transcript-${transcript.id}.pdf`);
    doc.pipe(res);

    // Page header function
    let pageNum = 1;
    let lineNum = 1;

    function addPageHeader() {
      doc.fontSize(10).font('Courier');
      doc.text(`Case: ${transcript.job_case_name || 'N/A'}`, 72, 40, { continued: true });
      doc.text(`Page ${pageNum}`, { align: 'right' });
      if (transcript.job_case_number) {
        doc.text(`Case No: ${transcript.job_case_number}`, 72, 52);
      }
      doc.moveDown(0.5);
      doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke();
      doc.moveDown(0.5);
    }

    doc.on('pageAdded', () => {
      pageNum++;
      lineNum = 1;
      addPageHeader();
    });

    // Cover page
    doc.fontSize(16).font('Courier-Bold').text('TRANSCRIPT OF PROCEEDINGS', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(12).font('Courier');

    const coverDetails = [
      ['Title', transcript.title || 'N/A'],
      ['Case', transcript.job_case_name || 'N/A'],
      ['Case Number', transcript.job_case_number || 'N/A'],
      ['Court Reporter', transcript.reporter_name || 'N/A'],
      ['Scopist', transcript.scopist_name || 'N/A'],
      ['Proofreader', transcript.proofreader_name || 'N/A'],
      ['Status', (transcript.status || 'N/A').toUpperCase()],
      ['Pages', transcript.page_count ? String(transcript.page_count) : 'N/A'],
      ['Date', transcript.created_at ? new Date(transcript.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A']
    ];

    coverDetails.forEach(([label, value]) => {
      doc.font('Courier-Bold').text(`${label}: `, { continued: true });
      doc.font('Courier').text(value);
    });

    doc.moveDown(2);
    doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(1);

    // Transcript content with line numbers
    if (transcript.content) {
      doc.addPage();
      addPageHeader();

      doc.fontSize(12).font('Courier');
      const lines = transcript.content.split('\n');
      const lineNumWidth = 40; // Width for line number column

      lines.forEach((line, idx) => {
        // Check if we need a new page (approximately 25 lines per page)
        if (lineNum > 25) {
          doc.addPage();
          lineNum = 1;
        }

        const lineNumStr = String(lineNum).padStart(3, ' ');
        doc.font('Courier').fillColor('#888888').text(`${lineNumStr} `, {
          continued: true,
          width: lineNumWidth
        });
        doc.fillColor('#000000').text(line || ' ', {
          width: 540 - 72 - lineNumWidth
        });

        lineNum++;
      });
    } else {
      doc.moveDown(1);
      doc.font('Courier').text('[No transcript content available]', { align: 'center' });
    }

    // Footer on last page
    doc.moveDown(2);
    doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).font('Courier').fillColor('#666666').text(
      `Certified Court Transcript — ${transcript.reporter_name || 'Court Reporter'} — Generated ${new Date().toLocaleDateString()}`,
      { align: 'center' }
    );
    if (transcript.notes) {
      doc.moveDown(0.5);
      doc.text(`Notes: ${transcript.notes}`, { align: 'left' });
    }

    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

router.get('/', async (req, res) => {
  try {
    const { search, page: pageStr, limit: limitStr, status } = req.query;
    const page = Math.max(1, parseInt(pageStr) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(t.title ILIKE $${paramIdx} OR t.status ILIKE $${paramIdx} OR j.case_name ILIKE $${paramIdx} OR r.name ILIKE $${paramIdx})`);
      paramIdx++;
    }

    if (status) {
      params.push(status);
      conditions.push(`t.status = $${paramIdx}`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `FROM transcripts t
      LEFT JOIN jobs j ON t.job_id = j.id
      LEFT JOIN reporters r ON t.reporter_id = r.id
      LEFT JOIN scopists s ON t.scopist_id = s.id
      LEFT JOIN proofreaders p ON t.proofreader_id = p.id
      ${whereClause}`;

    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT t.*, j.case_name as job_case_name, r.name as reporter_name, s.name as scopist_name, p.name as proofreader_name
       ${baseQuery} ORDER BY t.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error('List transcripts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, j.case_name as job_case_name, r.name as reporter_name, s.name as scopist_name, p.name as proofreader_name
       FROM transcripts t
       LEFT JOIN jobs j ON t.job_id = j.id
       LEFT JOIN reporters r ON t.reporter_id = r.id
       LEFT JOIN scopists s ON t.scopist_id = s.id
       LEFT JOIN proofreaders p ON t.proofreader_id = p.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transcript not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get transcript error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post(
  '/',
  [
    body('title').notEmpty().withMessage('title is required'),
    body('status').optional().isIn(['draft', 'in_progress', 'completed', 'certified', 'delivered']).withMessage('Invalid status')
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;
    try {
      const { job_id, reporter_id, scopist_id, proofreader_id, title, content, page_count, status, notes } = req.body;
      const result = await pool.query(
        'INSERT INTO transcripts (job_id, reporter_id, scopist_id, proofreader_id, title, content, page_count, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
        [job_id, reporter_id, scopist_id, proofreader_id, title, content, page_count, status || 'draft', notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Create transcript error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.put('/:id', async (req, res) => {
  try {
    const { job_id, reporter_id, scopist_id, proofreader_id, title, content, page_count, status, notes } = req.body;
    const result = await pool.query(
      'UPDATE transcripts SET job_id=$1, reporter_id=$2, scopist_id=$3, proofreader_id=$4, title=$5, content=$6, page_count=$7, status=$8, notes=$9, updated_at=NOW() WHERE id=$10 RETURNING *',
      [job_id, reporter_id, scopist_id, proofreader_id, title, content, page_count, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transcript not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update transcript error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM transcripts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transcript not found' });
    res.json({ message: 'Transcript deleted', transcript: result.rows[0] });
  } catch (err) {
    console.error('Delete transcript error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
