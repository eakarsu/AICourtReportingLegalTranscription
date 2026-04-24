const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM courts';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE name ILIKE $1 OR address ILIKE $1 OR city ILIKE $1 OR state ILIKE $1 OR jurisdiction ILIKE $1';
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List courts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM courts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Court not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get court error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, address, city, state, zip, phone, jurisdiction, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO courts (name, address, city, state, zip, phone, jurisdiction, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, address, city, state, zip, phone, jurisdiction, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create court error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, address, city, state, zip, phone, jurisdiction, notes } = req.body;
    const result = await pool.query(
      'UPDATE courts SET name=$1, address=$2, city=$3, state=$4, zip=$5, phone=$6, jurisdiction=$7, notes=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
      [name, address, city, state, zip, phone, jurisdiction, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Court not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update court error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM courts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Court not found' });
    res.json({ message: 'Court deleted', court: result.rows[0] });
  } catch (err) {
    console.error('Delete court error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
