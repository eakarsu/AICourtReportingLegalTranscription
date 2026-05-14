const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return null;
}

// Ensure the deadlines table exists
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transcript_deadlines (
      id SERIAL PRIMARY KEY,
      transcript_id INTEGER REFERENCES transcripts(id) ON DELETE CASCADE,
      job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      due_date TIMESTAMPTZ NOT NULL,
      delivery_type VARCHAR(50) DEFAULT 'standard',
      priority VARCHAR(20) DEFAULT 'normal',
      status VARCHAR(30) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// Run table creation on module load
ensureTable().catch(err => console.error('Deadlines table creation error:', err));

// POST /api/deadlines — Create a deadline
router.post(
  '/',
  [
    body('title').notEmpty().withMessage('title is required'),
    body('due_date').notEmpty().withMessage('due_date is required').isISO8601().withMessage('due_date must be a valid ISO 8601 date'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'critical']).withMessage('priority must be low, normal, high, or critical'),
    body('delivery_type').optional().isIn(['standard', 'expedited', 'rush', 'daily', 'immediate']).withMessage('Invalid delivery_type'),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'overdue', 'cancelled']).withMessage('Invalid status')
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;

    try {
      const {
        transcript_id,
        job_id,
        client_id,
        title,
        description,
        due_date,
        delivery_type = 'standard',
        priority = 'normal',
        status = 'pending',
        notes
      } = req.body;

      const result = await pool.query(
        `INSERT INTO transcript_deadlines
         (transcript_id, job_id, client_id, title, description, due_date, delivery_type, priority, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [transcript_id, job_id, client_id, title, description, due_date, delivery_type, priority, status, notes]
      );

      res.status(201).json({ success: true, deadline: result.rows[0] });
    } catch (err) {
      console.error('Create deadline error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/deadlines/upcoming — Next 7 days with priority flags
router.get('/upcoming', async (req, res) => {
  try {
    const { days = 7, priority } = req.query;
    const dayCount = Math.min(90, Math.max(1, parseInt(days) || 7));

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + dayCount);

    let query = `
      SELECT d.*,
             t.title as transcript_title, t.status as transcript_status,
             j.case_name, j.case_number,
             c.firm_name as client_name
      FROM transcript_deadlines d
      LEFT JOIN transcripts t ON d.transcript_id = t.id
      LEFT JOIN jobs j ON d.job_id = j.id
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.due_date >= $1 AND d.due_date <= $2 AND d.status NOT IN ('completed', 'cancelled')
    `;
    const params = [now.toISOString(), cutoff.toISOString()];

    if (priority) {
      params.push(priority);
      query += ` AND d.priority = $${params.length}`;
    }

    query += ` ORDER BY
      CASE d.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
      END,
      d.due_date ASC`;

    const result = await pool.query(query, params);

    // Overdue check (update status for past-due items)
    const overdueResult = await pool.query(
      `UPDATE transcript_deadlines
       SET status = 'overdue', updated_at = NOW()
       WHERE due_date < NOW() AND status = 'pending'
       RETURNING id`,
      []
    );

    // Separate by urgency
    const now2 = new Date();
    const tomorrow = new Date(now2);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in3Days = new Date(now2);
    in3Days.setDate(in3Days.getDate() + 3);

    const categorized = {
      today: [],
      tomorrow: [],
      within_3_days: [],
      this_week: [],
      later: []
    };

    result.rows.forEach(dl => {
      const due = new Date(dl.due_date);
      const daysUntilDue = Math.ceil((due - now2) / (1000 * 60 * 60 * 24));
      dl.days_until_due = daysUntilDue;
      dl.is_urgent = dl.priority === 'critical' || dl.priority === 'high' || daysUntilDue <= 1;

      if (daysUntilDue <= 0) categorized.today.push(dl);
      else if (daysUntilDue <= 1) categorized.tomorrow.push(dl);
      else if (daysUntilDue <= 3) categorized.within_3_days.push(dl);
      else if (daysUntilDue <= 7) categorized.this_week.push(dl);
      else categorized.later.push(dl);
    });

    res.json({
      success: true,
      upcoming_days: dayCount,
      total: result.rows.length,
      newly_marked_overdue: overdueResult.rowCount,
      deadlines: result.rows,
      by_urgency: categorized
    });
  } catch (err) {
    console.error('Upcoming deadlines error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deadlines — List all deadlines
router.get('/', async (req, res) => {
  try {
    const { status, priority, page: pageStr, limit: limitStr } = req.query;
    const page = Math.max(1, parseInt(pageStr) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (status) {
      params.push(status);
      conditions.push(`d.status = $${paramIdx}`);
      paramIdx++;
    }

    if (priority) {
      params.push(priority);
      conditions.push(`d.priority = $${paramIdx}`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `FROM transcript_deadlines d
      LEFT JOIN transcripts t ON d.transcript_id = t.id
      LEFT JOIN jobs j ON d.job_id = j.id
      LEFT JOIN clients c ON d.client_id = c.id
      ${whereClause}`;

    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT d.*, t.title as transcript_title, j.case_name, j.case_number, c.firm_name as client_name
       ${baseQuery}
       ORDER BY d.due_date ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deadlines/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, t.title as transcript_title, j.case_name, j.case_number, c.firm_name as client_name
       FROM transcript_deadlines d
       LEFT JOIN transcripts t ON d.transcript_id = t.id
       LEFT JOIN jobs j ON d.job_id = j.id
       LEFT JOIN clients c ON d.client_id = c.id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Deadline not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/deadlines/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, description, due_date, delivery_type, priority, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE transcript_deadlines
       SET title=$1, description=$2, due_date=$3, delivery_type=$4, priority=$5, status=$6, notes=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [title, description, due_date, delivery_type, priority, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Deadline not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/deadlines/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM transcript_deadlines WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Deadline not found' });
    res.json({ message: 'Deadline deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
