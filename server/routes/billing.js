const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT b.*, c.firm_name as client_name, j.case_name as job_case_name FROM billing b LEFT JOIN clients c ON b.client_id = c.id LEFT JOIN jobs j ON b.job_id = j.id';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE b.description ILIKE $1 OR b.status ILIKE $1 OR c.name ILIKE $1 OR j.case_name ILIKE $1';
    }
    query += ' ORDER BY b.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List billing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT b.*, c.firm_name as client_name, j.case_name as job_case_name FROM billing b LEFT JOIN clients c ON b.client_id = c.id LEFT JOIN jobs j ON b.job_id = j.id WHERE b.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Billing record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get billing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, job_id, amount, description, status, due_date, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO billing (client_id, job_id, amount, description, status, due_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [client_id, job_id, amount, description, status || 'pending', due_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create billing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { client_id, job_id, amount, description, status, due_date, notes } = req.body;
    const result = await pool.query(
      'UPDATE billing SET client_id=$1, job_id=$2, amount=$3, description=$4, status=$5, due_date=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [client_id, job_id, amount, description, status, due_date, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Billing record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update billing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM billing WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Billing record not found' });
    res.json({ message: 'Billing record deleted', billing: result.rows[0] });
  } catch (err) {
    console.error('Delete billing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
