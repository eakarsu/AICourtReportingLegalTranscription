const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM clients';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR firm_name ILIKE $1 OR address ILIKE $1';
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List clients error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, firm_name, address, billing_address, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO clients (name, email, phone, firm_name, address, billing_address, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name, email, phone, firm_name, address, billing_address, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, firm_name, address, billing_address, notes } = req.body;
    const result = await pool.query(
      'UPDATE clients SET name=$1, email=$2, phone=$3, firm_name=$4, address=$5, billing_address=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [name, email, phone, firm_name, address, billing_address, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: 'Client deleted', client: result.rows[0] });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
