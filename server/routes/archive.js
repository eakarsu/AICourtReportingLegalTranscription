const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM transcript_archive';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE title ILIKE $1 OR case_name ILIKE $1 OR case_number ILIKE $1 OR status ILIKE $1';
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List archive error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transcript_archive WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Archive record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get archive error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { transcript_id, title, case_name, case_number, file_path, archive_date, status, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO transcript_archive (transcript_id, title, case_name, case_number, file_path, archive_date, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [transcript_id, title, case_name, case_number, file_path, archive_date || new Date(), status || 'archived', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create archive error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { transcript_id, title, case_name, case_number, file_path, archive_date, status, notes } = req.body;
    const result = await pool.query(
      'UPDATE transcript_archive SET transcript_id=$1, title=$2, case_name=$3, case_number=$4, file_path=$5, archive_date=$6, status=$7, notes=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
      [transcript_id, title, case_name, case_number, file_path, archive_date, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Archive record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update archive error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM transcript_archive WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Archive record not found' });
    res.json({ message: 'Archive record deleted', archive: result.rows[0] });
  } catch (err) {
    console.error('Delete archive error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
