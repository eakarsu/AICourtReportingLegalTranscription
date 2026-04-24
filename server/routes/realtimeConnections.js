const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT rc.*, j.case_name as job_case_name, r.name as reporter_name FROM realtime_connections rc LEFT JOIN jobs j ON rc.job_id = j.id LEFT JOIN reporters r ON rc.reporter_id = r.id';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE rc.connection_type ILIKE $1 OR rc.status ILIKE $1 OR j.case_name ILIKE $1 OR r.name ILIKE $1';
    }
    query += ' ORDER BY rc.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List realtime connections error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT rc.*, j.case_name as job_case_name, r.name as reporter_name FROM realtime_connections rc LEFT JOIN jobs j ON rc.job_id = j.id LEFT JOIN reporters r ON rc.reporter_id = r.id WHERE rc.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Realtime connection not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get realtime connection error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { job_id, reporter_id, connection_type, connection_url, status, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO realtime_connections (job_id, reporter_id, connection_type, connection_url, status, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [job_id, reporter_id, connection_type, connection_url, status || 'active', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create realtime connection error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { job_id, reporter_id, connection_type, connection_url, status, notes } = req.body;
    const result = await pool.query(
      'UPDATE realtime_connections SET job_id=$1, reporter_id=$2, connection_type=$3, connection_url=$4, status=$5, notes=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [job_id, reporter_id, connection_type, connection_url, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Realtime connection not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update realtime connection error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM realtime_connections WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Realtime connection not found' });
    res.json({ message: 'Realtime connection deleted', connection: result.rows[0] });
  } catch (err) {
    console.error('Delete realtime connection error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
