const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT vs.*, j.case_name as job_case_name FROM video_syncs vs LEFT JOIN jobs j ON vs.job_id = j.id';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE vs.video_file ILIKE $1 OR vs.status ILIKE $1 OR j.case_name ILIKE $1';
    }
    query += ' ORDER BY vs.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List video syncs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT vs.*, j.case_name as job_case_name FROM video_syncs vs LEFT JOIN jobs j ON vs.job_id = j.id WHERE vs.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Video sync not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get video sync error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { job_id, video_file, sync_file, status, duration, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO video_syncs (job_id, video_file, sync_file, status, duration, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [job_id, video_file, sync_file, status || 'pending', duration, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create video sync error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { job_id, video_file, sync_file, status, duration, notes } = req.body;
    const result = await pool.query(
      'UPDATE video_syncs SET job_id=$1, video_file=$2, sync_file=$3, status=$4, duration=$5, notes=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [job_id, video_file, sync_file, status, duration, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Video sync not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update video sync error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM video_syncs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Video sync not found' });
    res.json({ message: 'Video sync deleted', videoSync: result.rows[0] });
  } catch (err) {
    console.error('Delete video sync error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
