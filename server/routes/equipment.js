const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM equipment';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE name ILIKE $1 OR type ILIKE $1 OR serial_number ILIKE $1 OR status ILIKE $1 OR location ILIKE $1';
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List equipment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get equipment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, serial_number, purchase_date, status, location, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO equipment (name, type, serial_number, purchase_date, status, location, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name, type, serial_number, purchase_date, status || 'available', location, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create equipment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, type, serial_number, purchase_date, status, location, notes } = req.body;
    const result = await pool.query(
      'UPDATE equipment SET name=$1, type=$2, serial_number=$3, purchase_date=$4, status=$5, location=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [name, type, serial_number, purchase_date, status, location, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update equipment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM equipment WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });
    res.json({ message: 'Equipment deleted', equipment: result.rows[0] });
  } catch (err) {
    console.error('Delete equipment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
