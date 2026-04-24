const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all contacts
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM contacts';
    const params = [];
    if (search) {
      query += ' WHERE name ILIKE $1 OR contact_type ILIKE $1 OR firm ILIKE $1 OR email ILIKE $1 OR specialty ILIKE $1';
      params.push(`%${search}%`);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single contact
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contacts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create contact
router.post('/', async (req, res) => {
  try {
    const { name, contact_type, firm, email, phone, address, bar_number, specialty, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO contacts (name, contact_type, firm, email, phone, address, bar_number, specialty, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, contact_type, firm, email, phone, address, bar_number, specialty, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update contact
router.put('/:id', async (req, res) => {
  try {
    const { name, contact_type, firm, email, phone, address, bar_number, specialty, notes } = req.body;
    const result = await pool.query(
      `UPDATE contacts SET name=$1, contact_type=$2, firm=$3, email=$4, phone=$5, address=$6, bar_number=$7, specialty=$8, notes=$9
       WHERE id=$10 RETURNING *`,
      [name, contact_type, firm, email, phone, address, bar_number, specialty, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE contact
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM contacts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
