const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT e.*, j.case_name as job_case_name FROM exhibits e LEFT JOIN jobs j ON e.job_id = j.id';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE e.exhibit_number ILIKE $1 OR e.description ILIKE $1 OR e.exhibit_type ILIKE $1 OR j.case_name ILIKE $1';
    }
    query += ' ORDER BY e.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List exhibits error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT e.*, j.case_name as job_case_name FROM exhibits e LEFT JOIN jobs j ON e.job_id = j.id WHERE e.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exhibit not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get exhibit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { job_id, exhibit_number, description, exhibit_type, file_path, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO exhibits (job_id, exhibit_number, description, exhibit_type, file_path, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [job_id, exhibit_number, description, exhibit_type, file_path, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create exhibit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { job_id, exhibit_number, description, exhibit_type, file_path, notes } = req.body;
    const result = await pool.query(
      'UPDATE exhibits SET job_id=$1, exhibit_number=$2, description=$3, exhibit_type=$4, file_path=$5, notes=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [job_id, exhibit_number, description, exhibit_type, file_path, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exhibit not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update exhibit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM exhibits WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exhibit not found' });
    res.json({ message: 'Exhibit deleted', exhibit: result.rows[0] });
  } catch (err) {
    console.error('Delete exhibit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
