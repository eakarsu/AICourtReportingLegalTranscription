require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
const deadlineRoutes = require('./routes/deadlines');

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

app.use('/api/ai', require('./routes/caseComplexity'));

app.use('/api/ai', require('./routes/exhibitExtract'));

app.use('/api/ai', require('./routes/precedentDeposition'));

app.use('/api/ai', require('./routes/filingAutomation'));

app.use('/api/ai', require('./routes/reporterWellness'));
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/deadlines', deadlineRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.SERVER_PORT || 3001;
// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-cases-lacks-analyze-case-timeline-or-predict-deposition-need', require('./routes/gap_cases_lacks_analyze_case_timeline_or_predict_deposition_need'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-deliveries-lacks-optimize-delivery-routing', require('./routes/gap_deliveries_lacks_optimize_delivery_routing'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-exhibits-lacks-extract-exhibit-metadata-or-analyze-exhibit-r', require('./routes/gap_exhibits_lacks_extract_exhibit_metadata_or_analyze_exhibit_r'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-videosyncs-lacks-ai-driven-audio-video-alignment', require('./routes/gap_videosyncs_lacks_ai_driven_audio_video_alignment'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-limited-integration-with-court-calendars-legal-research-lexi', require('./routes/gap_limited_integration_with_court_calendars_legal_research_lexi'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-secure-cloud-vault-for-sensitive-transcripts', require('./routes/gap_no_secure_cloud_vault_for_sensitive_transcripts'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-continuing-education-tracking-layered-on-certifications', require('./routes/gap_no_continuing_education_tracking_layered_on_certifications'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-webhooks-or-notification-system', require('./routes/gap_no_webhooks_or_notification_system'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
