const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return null;
}

// NCRA rate table (2024 approximations)
const NCRA_RATES = {
  // Original transcript rates (per page)
  original: {
    standard: 4.50,    // Standard delivery (21-30 days)
    expedited: 6.50,   // Expedited (8-14 days)
    rush: 8.00,        // Rush (3-7 days)
    daily: 11.00,      // Daily delivery (same day)
    immediate: 15.00   // Immediate (real-time)
  },
  // Copy rates (per page)
  copy: {
    standard: 2.00,
    expedited: 3.50,
    rush: 5.00,
    daily: 7.00,
    immediate: 10.00
  },
  // Appearance fee (per hour)
  appearance: {
    first_hour: 95.00,
    additional_hour: 55.00
  },
  // ASCII/Electronic file
  ascii: 35.00,
  // Rough draft (per page)
  rough_draft: 2.50,
  // Realtime hookup fee
  realtime: 150.00,
  // Videography (per hour)
  video: 175.00,
  // Condensed transcript
  condensed: 35.00,
  // Index/word index
  word_index: 25.00
};

// POST /api/billing/calculate — Calculate billing based on NCRA rates
router.post(
  '/calculate',
  [
    body('transcript_pages').isInt({ min: 1 }).withMessage('transcript_pages must be a positive integer'),
    body('service_type').isIn(['original', 'copy', 'rough_draft']).withMessage('service_type must be original, copy, or rough_draft'),
    body('rush_delivery').optional().isIn(['standard', 'expedited', 'rush', 'daily', 'immediate']).withMessage('Invalid rush_delivery level')
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;

    try {
      const {
        transcript_pages,
        service_type,
        rush_delivery = 'standard',
        appearance_hours = 0,
        include_ascii = false,
        include_realtime = false,
        include_video_hours = 0,
        include_condensed = false,
        include_word_index = false,
        copy_count = 0,
        client_id,
        job_id,
        notes
      } = req.body;

      const lineItems = [];
      let subtotal = 0;

      // Transcript pages
      let perPageRate;
      if (service_type === 'original') {
        perPageRate = NCRA_RATES.original[rush_delivery] || NCRA_RATES.original.standard;
      } else if (service_type === 'copy') {
        perPageRate = NCRA_RATES.copy[rush_delivery] || NCRA_RATES.copy.standard;
      } else {
        perPageRate = NCRA_RATES.rough_draft;
      }

      const transcriptTotal = transcript_pages * perPageRate;
      subtotal += transcriptTotal;
      lineItems.push({
        description: `${service_type.charAt(0).toUpperCase() + service_type.slice(1)} Transcript (${rush_delivery} delivery) — ${transcript_pages} pages @ $${perPageRate.toFixed(2)}/page`,
        quantity: transcript_pages,
        unit_rate: perPageRate,
        amount: transcriptTotal
      });

      // Appearance fee
      if (appearance_hours > 0) {
        const appearanceFee = NCRA_RATES.appearance.first_hour +
          (Math.max(0, appearance_hours - 1) * NCRA_RATES.appearance.additional_hour);
        subtotal += appearanceFee;
        lineItems.push({
          description: `Appearance Fee — ${appearance_hours} hour(s)`,
          quantity: appearance_hours,
          unit_rate: null,
          amount: appearanceFee
        });
      }

      // Additional copies
      if (copy_count > 0) {
        const copyRate = NCRA_RATES.copy[rush_delivery] || NCRA_RATES.copy.standard;
        const copyTotal = copy_count * transcript_pages * copyRate;
        subtotal += copyTotal;
        lineItems.push({
          description: `${copy_count} Copy Transcript(s) — ${transcript_pages} pages @ $${copyRate.toFixed(2)}/page`,
          quantity: copy_count * transcript_pages,
          unit_rate: copyRate,
          amount: copyTotal
        });
      }

      // ASCII/Electronic
      if (include_ascii) {
        subtotal += NCRA_RATES.ascii;
        lineItems.push({ description: 'ASCII/Electronic File', quantity: 1, unit_rate: NCRA_RATES.ascii, amount: NCRA_RATES.ascii });
      }

      // Realtime hookup
      if (include_realtime) {
        subtotal += NCRA_RATES.realtime;
        lineItems.push({ description: 'Realtime Hookup Fee', quantity: 1, unit_rate: NCRA_RATES.realtime, amount: NCRA_RATES.realtime });
      }

      // Videography
      if (include_video_hours > 0) {
        const videoTotal = include_video_hours * NCRA_RATES.video;
        subtotal += videoTotal;
        lineItems.push({
          description: `Videography — ${include_video_hours} hour(s) @ $${NCRA_RATES.video}/hr`,
          quantity: include_video_hours,
          unit_rate: NCRA_RATES.video,
          amount: videoTotal
        });
      }

      // Condensed transcript
      if (include_condensed) {
        subtotal += NCRA_RATES.condensed;
        lineItems.push({ description: 'Condensed Transcript', quantity: 1, unit_rate: NCRA_RATES.condensed, amount: NCRA_RATES.condensed });
      }

      // Word index
      if (include_word_index) {
        subtotal += NCRA_RATES.word_index;
        lineItems.push({ description: 'Word Index', quantity: 1, unit_rate: NCRA_RATES.word_index, amount: NCRA_RATES.word_index });
      }

      const tax = 0; // Court reporting typically tax-exempt
      const total = subtotal + tax;

      res.json({
        success: true,
        estimate: {
          client_id: client_id || null,
          job_id: job_id || null,
          service_type,
          rush_delivery,
          transcript_pages,
          line_items: lineItems,
          subtotal: Math.round(subtotal * 100) / 100,
          tax,
          total: Math.round(total * 100) / 100,
          currency: 'USD',
          notes: notes || null,
          ncra_rate_basis: `NCRA ${new Date().getFullYear()} approximate rates`,
          calculated_at: new Date().toISOString()
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// GET /api/billing/invoices — List invoices by job/client
router.get('/invoices', async (req, res) => {
  try {
    const { client_id, job_id, status, page: pageStr, limit: limitStr } = req.query;
    const page = Math.max(1, parseInt(pageStr) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (client_id) {
      params.push(client_id);
      conditions.push(`b.client_id = $${paramIdx}`);
      paramIdx++;
    }

    if (job_id) {
      params.push(job_id);
      conditions.push(`b.job_id = $${paramIdx}`);
      paramIdx++;
    }

    if (status) {
      params.push(status);
      conditions.push(`b.status = $${paramIdx}`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `FROM billing b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN jobs j ON b.job_id = j.id
      ${whereClause}`;

    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT b.*, c.firm_name as client_name, j.case_name as job_case_name, j.case_number as job_case_number
       ${baseQuery}
       ORDER BY b.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    // Aggregate totals
    const aggResult = await pool.query(
      `SELECT
        COUNT(*) as total_invoices,
        SUM(CASE WHEN b.status = 'paid' THEN b.amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN b.status = 'pending' THEN b.amount ELSE 0 END) as total_outstanding,
        SUM(b.amount) as total_billed
       FROM billing b
       LEFT JOIN clients c ON b.client_id = c.id
       LEFT JOIN jobs j ON b.job_id = j.id
       ${whereClause}`,
      params.slice(0, paramIdx - 1) // exclude limit/offset
    );

    res.json({
      data: dataResult.rows,
      aggregates: {
        totalInvoices: parseInt(aggResult.rows[0].total_invoices),
        totalBilled: parseFloat(aggResult.rows[0].total_billed) || 0,
        totalPaid: parseFloat(aggResult.rows[0].total_paid) || 0,
        totalOutstanding: parseFloat(aggResult.rows[0].total_outstanding) || 0
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT b.*, c.firm_name as client_name, j.case_name as job_case_name FROM billing b LEFT JOIN clients c ON b.client_id = c.id LEFT JOIN jobs j ON b.job_id = j.id';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ' WHERE b.description ILIKE $1 OR b.status ILIKE $1 OR c.name ILIKE $1 OR j.case_name ILIKE $1';
    }
    query += ' ORDER BY b.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List billing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT b.*, c.firm_name as client_name, j.case_name as job_case_name FROM billing b LEFT JOIN clients c ON b.client_id = c.id LEFT JOIN jobs j ON b.job_id = j.id WHERE b.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Billing record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get billing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, job_id, amount, description, status, due_date, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO billing (client_id, job_id, amount, description, status, due_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [client_id, job_id, amount, description, status || 'pending', due_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create billing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { client_id, job_id, amount, description, status, due_date, notes } = req.body;
    const result = await pool.query(
      'UPDATE billing SET client_id=$1, job_id=$2, amount=$3, description=$4, status=$5, due_date=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [client_id, job_id, amount, description, status, due_date, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Billing record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update billing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM billing WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Billing record not found' });
    res.json({ message: 'Billing record deleted', billing: result.rows[0] });
  } catch (err) {
    console.error('Delete billing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
