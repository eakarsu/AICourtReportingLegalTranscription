const router = require('express').Router();
const pool = require('../db');

// GET / - list all jobs (with pagination)
router.get('/', async (req, res) => {
  try {
    const { search, status, page: pageStr, limit: limitStr } = req.query;
    const page = Math.max(1, parseInt(pageStr) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(j.case_name ILIKE $${paramIdx} OR j.case_number ILIKE $${paramIdx} OR j.location ILIKE $${paramIdx} OR j.status ILIKE $${paramIdx} OR r.name ILIKE $${paramIdx} OR c.firm_name ILIKE $${paramIdx})`);
      paramIdx++;
    }

    if (status) {
      params.push(status);
      conditions.push(`j.status = $${paramIdx}`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `FROM jobs j
      LEFT JOIN reporters r ON j.court_reporter_id = r.id
      LEFT JOIN clients c ON j.client_id = c.id
      ${whereClause}`;

    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT j.*, r.name as reporter_name, c.firm_name as client_name
       ${baseQuery}
       ORDER BY j.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
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
    console.error('List jobs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT j.*, r.name as reporter_name, c.firm_name as client_name FROM jobs j LEFT JOIN reporters r ON j.court_reporter_id = r.id LEFT JOIN clients c ON j.client_id = c.id WHERE j.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /
router.post('/', async (req, res) => {
  try {
    const { case_name, case_number, job_type, date_scheduled, time_scheduled, location, status, court_reporter_id, client_id, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO jobs (case_name, case_number, job_type, date_scheduled, time_scheduled, location, status, court_reporter_id, client_id, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [case_name, case_number, job_type, date_scheduled, time_scheduled, location, status || 'scheduled', court_reporter_id, client_id, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id
router.put('/:id', async (req, res) => {
  try {
    const { case_name, case_number, job_type, date_scheduled, time_scheduled, location, status, court_reporter_id, client_id, notes } = req.body;
    const result = await pool.query(
      'UPDATE jobs SET case_name=$1, case_number=$2, job_type=$3, date_scheduled=$4, time_scheduled=$5, location=$6, status=$7, court_reporter_id=$8, client_id=$9, notes=$10 WHERE id=$11 RETURNING *',
      [case_name, case_number, job_type, date_scheduled, time_scheduled, location, status, court_reporter_id, client_id, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update job error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ message: 'Job deleted', job: result.rows[0] });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
