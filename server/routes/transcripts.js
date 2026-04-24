const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT t.*, j.case_name as job_case_name, r.name as reporter_name, s.name as scopist_name, p.name as proofreader_name
      FROM transcripts t
      LEFT JOIN jobs j ON t.job_id = j.id
      LEFT JOIN reporters r ON t.reporter_id = r.id
      LEFT JOIN scopists s ON t.scopist_id = s.id
      LEFT JOIN proofreaders p ON t.proofreader_id = p.id`;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE t.title ILIKE $1 OR t.status ILIKE $1 OR j.case_name ILIKE $1 OR r.name ILIKE $1';
    }
    query += ' ORDER BY t.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
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

router.post('/', async (req, res) => {
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
});

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
