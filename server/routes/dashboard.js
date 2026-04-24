const router = require('express').Router();
const pool = require('../db');

// GET / - Dashboard overview with all entity counts
router.get('/', async (req, res) => {
  try {
    const tables = [
      { key: 'jobs', table: 'jobs' },
      { key: 'reporters', table: 'reporters' },
      { key: 'clients', table: 'clients' },
      { key: 'cases', table: 'cases' },
      { key: 'transcripts', table: 'transcripts' },
      { key: 'billing', table: 'billing' },
      { key: 'deliveries', table: 'deliveries' },
      { key: 'exhibits', table: 'exhibits' },
      { key: 'video_syncs', table: 'video_syncs' },
      { key: 'realtime_connections', table: 'realtime_connections' },
      { key: 'scopists', table: 'scopists' },
      { key: 'proofreaders', table: 'proofreaders' },
      { key: 'equipment', table: 'equipment' },
      { key: 'certifications', table: 'certifications' },
      { key: 'invoices', table: 'invoices' },
      { key: 'payments', table: 'payments' },
      { key: 'archive', table: 'transcript_archive' },
      { key: 'courts', table: 'courts' },
      { key: 'contacts', table: 'contacts' },
      { key: 'travel_expenses', table: 'travel_expenses' },
      { key: 'rush_fees', table: 'rush_fees' },
    ];

    const counts = await Promise.all(
      tables.map(t => pool.query(`SELECT COUNT(*) FROM ${t.table}`))
    );

    const result = {};
    tables.forEach((t, i) => {
      result[t.key] = parseInt(counts[i].rows[0].count);
    });

    // Get total revenue from payments
    const revenueResult = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'"
    );
    result.total_revenue = parseFloat(revenueResult.rows[0].total);

    res.json(result);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
