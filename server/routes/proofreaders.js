const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM proofreaders';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR specialty ILIKE $1';
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List proofreaders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM proofreaders WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Proofreader not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get proofreader error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, rate_per_page, specialty, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO proofreaders (name, email, phone, rate_per_page, specialty, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, email, phone, rate_per_page, specialty, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create proofreader error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, rate_per_page, specialty, notes } = req.body;
    const result = await pool.query(
      'UPDATE proofreaders SET name=$1, email=$2, phone=$3, rate_per_page=$4, specialty=$5, notes=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, email, phone, rate_per_page, specialty, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Proofreader not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update proofreader error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM proofreaders WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Proofreader not found' });
    res.json({ message: 'Proofreader deleted', proofreader: result.rows[0] });
  } catch (err) {
    console.error('Delete proofreader error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
