const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT p.*, i.invoice_number, c.firm_name as client_name FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id LEFT JOIN clients c ON p.client_id = c.id';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE p.payment_method ILIKE $1 OR p.reference_number ILIKE $1 OR i.invoice_number ILIKE $1 OR c.name ILIKE $1';
    }
    query += ' ORDER BY p.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List payments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.*, i.invoice_number, c.firm_name as client_name FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { invoice_id, client_id, amount, payment_date, payment_method, reference_number, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO payments (invoice_id, client_id, amount, payment_date, payment_method, reference_number, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [invoice_id, client_id, amount, payment_date, payment_method, reference_number, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { invoice_id, client_id, amount, payment_date, payment_method, reference_number, notes } = req.body;
    const result = await pool.query(
      'UPDATE payments SET invoice_id=$1, client_id=$2, amount=$3, payment_date=$4, payment_method=$5, reference_number=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [invoice_id, client_id, amount, payment_date, payment_method, reference_number, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM payments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted', payment: result.rows[0] });
  } catch (err) {
    console.error('Delete payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
