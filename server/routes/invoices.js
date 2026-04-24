const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT i.*, c.firm_name as client_name FROM invoices i LEFT JOIN clients c ON i.client_id = c.id';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE i.invoice_number ILIKE $1 OR i.status ILIKE $1 OR c.name ILIKE $1';
    }
    query += ' ORDER BY i.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List invoices error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT i.*, c.firm_name as client_name FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE i.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get invoice error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, invoice_number, amount, tax, total, status, due_date, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO invoices (client_id, invoice_number, amount, tax, total, status, due_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [client_id, invoice_number, amount, tax, total, status || 'draft', due_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { client_id, invoice_number, amount, tax, total, status, due_date, notes } = req.body;
    const result = await pool.query(
      'UPDATE invoices SET client_id=$1, invoice_number=$2, amount=$3, tax=$4, total=$5, status=$6, due_date=$7, notes=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
      [client_id, invoice_number, amount, tax, total, status, due_date, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update invoice error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice deleted', invoice: result.rows[0] });
  } catch (err) {
    console.error('Delete invoice error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
