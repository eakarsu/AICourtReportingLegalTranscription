require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Route imports
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const reporterRoutes = require('./routes/reporters');
const clientRoutes = require('./routes/clients');
const caseRoutes = require('./routes/cases');
const transcriptRoutes = require('./routes/transcripts');
const billingRoutes = require('./routes/billing');
const deliveryRoutes = require('./routes/deliveries');
const exhibitRoutes = require('./routes/exhibits');
const videoSyncRoutes = require('./routes/videoSyncs');
const realtimeRoutes = require('./routes/realtimeConnections');
const scopistRoutes = require('./routes/scopists');
const proofreaderRoutes = require('./routes/proofreaders');
const equipmentRoutes = require('./routes/equipment');
const certificationRoutes = require('./routes/certifications');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payments');
const archiveRoutes = require('./routes/archive');
const courtRoutes = require('./routes/courts');
const contactRoutes = require('./routes/contacts');
const travelRoutes = require('./routes/travelExpenses');
const rushFeeRoutes = require('./routes/rushFees');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/reporters', reporterRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/exhibits', exhibitRoutes);
app.use('/api/video-syncs', videoSyncRoutes);
app.use('/api/realtime-connections', realtimeRoutes);
app.use('/api/scopists', scopistRoutes);
app.use('/api/proofreaders', proofreaderRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/transcript-archive', archiveRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/travel-expenses', travelRoutes);
app.use('/api/rush-fees', rushFeeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.SERVER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
