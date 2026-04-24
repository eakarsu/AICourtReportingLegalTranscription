const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT cert.*, r.name as reporter_name FROM certifications cert LEFT JOIN reporters r ON cert.reporter_id = r.id';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE cert.certification_type ILIKE $1 OR cert.certification_number ILIKE $1 OR cert.issuing_authority ILIKE $1 OR r.name ILIKE $1';
    }
    query += ' ORDER BY cert.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List certifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT cert.*, r.name as reporter_name FROM certifications cert LEFT JOIN reporters r ON cert.reporter_id = r.id WHERE cert.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Certification not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get certification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { reporter_id, certification_type, certification_number, issuing_authority, issue_date, expiry_date, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO certifications (reporter_id, certification_type, certification_number, issuing_authority, issue_date, expiry_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [reporter_id, certification_type, certification_number, issuing_authority, issue_date, expiry_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create certification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { reporter_id, certification_type, certification_number, issuing_authority, issue_date, expiry_date, notes } = req.body;
    const result = await pool.query(
      'UPDATE certifications SET reporter_id=$1, certification_type=$2, certification_number=$3, issuing_authority=$4, issue_date=$5, expiry_date=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [reporter_id, certification_type, certification_number, issuing_authority, issue_date, expiry_date, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Certification not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update certification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM certifications WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Certification not found' });
    res.json({ message: 'Certification deleted', certification: result.rows[0] });
  } catch (err) {
    console.error('Delete certification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
