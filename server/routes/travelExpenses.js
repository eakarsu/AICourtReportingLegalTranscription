const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all travel expenses
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT te.*, j.case_name as job_name, r.name as reporter_name
                 FROM travel_expenses te
                 LEFT JOIN jobs j ON te.job_id = j.id
                 LEFT JOIN reporters r ON te.reporter_id = r.id`;
    const params = [];
    if (search) {
      query += ' WHERE te.expense_type ILIKE $1 OR te.description ILIKE $1 OR r.name ILIKE $1 OR te.status ILIKE $1';
      params.push(`%${search}%`);
    }
    query += ' ORDER BY te.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single travel expense
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT te.*, j.case_name as job_name, r.name as reporter_name
       FROM travel_expenses te
       LEFT JOIN jobs j ON te.job_id = j.id
       LEFT JOIN reporters r ON te.reporter_id = r.id
       WHERE te.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Travel expense not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create travel expense
router.post('/', async (req, res) => {
  try {
    const { job_id, reporter_id, expense_type, amount, date_incurred, description, receipt_path, status } = req.body;
    const result = await pool.query(
      `INSERT INTO travel_expenses (job_id, reporter_id, expense_type, amount, date_incurred, description, receipt_path, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [job_id, reporter_id, expense_type, amount, date_incurred, description, receipt_path, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update travel expense
router.put('/:id', async (req, res) => {
  try {
    const { job_id, reporter_id, expense_type, amount, date_incurred, description, receipt_path, status } = req.body;
    const result = await pool.query(
      `UPDATE travel_expenses SET job_id=$1, reporter_id=$2, expense_type=$3, amount=$4, date_incurred=$5, description=$6, receipt_path=$7, status=$8
       WHERE id=$9 RETURNING *`,
      [job_id, reporter_id, expense_type, amount, date_incurred, description, receipt_path, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Travel expense not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE travel expense
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM travel_expenses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Travel expense not found' });
    res.json({ message: 'Travel expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
