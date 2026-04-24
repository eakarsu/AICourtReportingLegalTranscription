const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all rush fees
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT rf.*, j.case_name as job_name
                 FROM rush_fees rf
                 LEFT JOIN jobs j ON rf.job_id = j.id`;
    const params = [];
    if (search) {
      query += ' WHERE rf.fee_type ILIKE $1 OR rf.status ILIKE $1 OR rf.requested_by ILIKE $1 OR j.case_name ILIKE $1';
      params.push(`%${search}%`);
    }
    query += ' ORDER BY rf.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single rush fee
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rf.*, j.case_name as job_name
       FROM rush_fees rf
       LEFT JOIN jobs j ON rf.job_id = j.id
       WHERE rf.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rush fee not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create rush fee
router.post('/', async (req, res) => {
  try {
    const { job_id, transcript_id, fee_type, multiplier, base_amount, fee_amount, requested_by, approved_by, status } = req.body;
    const result = await pool.query(
      `INSERT INTO rush_fees (job_id, transcript_id, fee_type, multiplier, base_amount, fee_amount, requested_by, approved_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [job_id, transcript_id, fee_type, multiplier, base_amount, fee_amount, requested_by, approved_by, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update rush fee
router.put('/:id', async (req, res) => {
  try {
    const { job_id, transcript_id, fee_type, multiplier, base_amount, fee_amount, requested_by, approved_by, status } = req.body;
    const result = await pool.query(
      `UPDATE rush_fees SET job_id=$1, transcript_id=$2, fee_type=$3, multiplier=$4, base_amount=$5, fee_amount=$6, requested_by=$7, approved_by=$8, status=$9
       WHERE id=$10 RETURNING *`,
      [job_id, transcript_id, fee_type, multiplier, base_amount, fee_amount, requested_by, approved_by, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rush fee not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE rush fee
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM rush_fees WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rush fee not found' });
    res.json({ message: 'Rush fee deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
