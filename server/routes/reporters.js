const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM reporters';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR certification_type ILIKE $1';
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List reporters error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reporters WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Reporter not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get reporter error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, certification_type, certification_number, rate_per_page, rate_per_hour, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO reporters (name, email, phone, certification_type, certification_number, rate_per_page, rate_per_hour, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, email, phone, certification_type, certification_number, rate_per_page, rate_per_hour, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create reporter error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, certification_type, certification_number, rate_per_page, rate_per_hour, notes } = req.body;
    const result = await pool.query(
      'UPDATE reporters SET name=$1, email=$2, phone=$3, certification_type=$4, certification_number=$5, rate_per_page=$6, rate_per_hour=$7, notes=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
      [name, email, phone, certification_type, certification_number, rate_per_page, rate_per_hour, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Reporter not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update reporter error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM reporters WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Reporter not found' });
    res.json({ message: 'Reporter deleted', reporter: result.rows[0] });
  } catch (err) {
    console.error('Delete reporter error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
