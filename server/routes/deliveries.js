const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT d.*, t.id as transcript_ref, c.firm_name as client_name FROM deliveries d LEFT JOIN transcripts t ON d.transcript_id = t.id LEFT JOIN clients c ON d.client_id = c.id';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE d.delivery_type ILIKE $1 OR d.delivery_status ILIKE $1 OR d.recipient_name ILIKE $1 OR c.firm_name ILIKE $1';
    }
    query += ' ORDER BY d.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List deliveries error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT d.*, t.id as transcript_ref, c.firm_name as client_name FROM deliveries d LEFT JOIN transcripts t ON d.transcript_id = t.id LEFT JOIN clients c ON d.client_id = c.id WHERE d.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get delivery error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { transcript_id, client_id, delivery_method, delivery_date, status, tracking_number, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO deliveries (transcript_id, client_id, delivery_method, delivery_date, status, tracking_number, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [transcript_id, client_id, delivery_method, delivery_date, status || 'pending', tracking_number, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create delivery error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { transcript_id, client_id, delivery_method, delivery_date, status, tracking_number, notes } = req.body;
    const result = await pool.query(
      'UPDATE deliveries SET transcript_id=$1, client_id=$2, delivery_method=$3, delivery_date=$4, status=$5, tracking_number=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [transcript_id, client_id, delivery_method, delivery_date, status, tracking_number, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update delivery error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM deliveries WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery not found' });
    res.json({ message: 'Delivery deleted', delivery: result.rows[0] });
  } catch (err) {
    console.error('Delete delivery error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
