const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT cs.*, c.firm_name as client_name FROM cases cs LEFT JOIN clients c ON cs.client_id = c.id';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE cs.case_name ILIKE $1 OR cs.case_number ILIKE $1 OR cs.court ILIKE $1 OR cs.status ILIKE $1 OR c.name ILIKE $1';
    }
    query += ' ORDER BY cs.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List cases error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT cs.*, c.firm_name as client_name FROM cases cs LEFT JOIN clients c ON cs.client_id = c.id WHERE cs.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Case not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get case error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { case_name, case_number, client_id, court, judge, status, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO cases (case_name, case_number, client_id, court, judge, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [case_name, case_number, client_id, court, judge, status || 'active', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create case error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { case_name, case_number, client_id, court, judge, status, notes } = req.body;
    const result = await pool.query(
      'UPDATE cases SET case_name=$1, case_number=$2, client_id=$3, court=$4, judge=$5, status=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [case_name, case_number, client_id, court, judge, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Case not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update case error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM cases WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Case not found' });
    res.json({ message: 'Case deleted', case: result.rows[0] });
  } catch (err) {
    console.error('Delete case error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
