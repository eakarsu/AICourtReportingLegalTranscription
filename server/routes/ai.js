const express = require('express');
const router = express.Router();
const { callAI } = require('../services/openrouter');

// POST /api/ai/proofread - Transcript proofreading & correction suggestions
router.post('/proofread', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'Text is required' });

    const systemPrompt = `You are an expert court reporting transcript proofreader with 20+ years of experience.
Your role is to review legal transcripts and provide detailed correction suggestions.
Focus on:
- Spelling errors and typos
- Grammar and punctuation issues
- Legal terminology accuracy
- Speaker identification consistency
- Line and page formatting issues
- Homophone errors common in stenographic transcription (e.g., "their/there/they're", "counsel/council")
- Missing or incorrect Q&A formatting
- Proper capitalization of legal terms and proper nouns

Provide your response in a structured format with:
1. CORRECTIONS: List each error with the original text, suggested correction, and reason
2. FORMATTING ISSUES: Any formatting problems found
3. TERMINOLOGY NOTES: Any legal terms that may need verification
4. OVERALL ASSESSMENT: Brief quality assessment of the transcript`;

    const result = await callAI(systemPrompt, `Please proofread the following transcript excerpt:\n\n${text}`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/terminology - Technical terminology auto-research
router.post('/terminology', async (req, res) => {
  try {
    const { term } = req.body;
    if (!term) return res.status(400).json({ success: false, error: 'Term is required' });

    const systemPrompt = `You are a legal and technical terminology research expert specializing in court reporting.
When given a term, provide:
1. DEFINITION: Clear, concise definition
2. LEGAL CONTEXT: How the term is used in legal proceedings
3. CORRECT SPELLING: Including any common misspellings
4. PRONUNCIATION GUIDE: Phonetic pronunciation for court reporters
5. RELATED TERMS: Associated legal terminology
6. USAGE EXAMPLES: Example sentences from legal proceedings
7. JURISDICTION NOTES: Any jurisdiction-specific variations
8. STENO BRIEF: Common stenographic briefs/shortcuts for this term if applicable`;

    const result = await callAI(systemPrompt, `Research the following legal/technical term: "${term}"`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/deposition-summary - Deposition summary generation
router.post('/deposition-summary', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ success: false, error: 'Transcript text is required' });

    const systemPrompt = `You are an expert legal professional specializing in deposition summary generation.
Create a comprehensive deposition summary that includes:
1. DEPOSITION OVERVIEW: Date, parties, witness name, case caption
2. WITNESS BACKGROUND: Professional/personal background as testified
3. KEY TESTIMONY POINTS: Major facts and admissions organized by topic
4. TIMELINE OF EVENTS: Chronological summary of events discussed
5. EXHIBITS REFERENCED: List of exhibits discussed during testimony
6. OBJECTIONS & RULINGS: Notable objections and their outcomes
7. CONTRADICTIONS/INCONSISTENCIES: Any noted contradictions in testimony
8. ACTION ITEMS: Follow-up items or areas for further investigation
9. PAGE/LINE REFERENCES: Key testimony locations for easy reference

Format the summary professionally, suitable for attorney review.`;

    const result = await callAI(systemPrompt, `Generate a professional deposition summary from the following transcript:\n\n${transcript}`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/generate-index - Index/keyword generation from transcripts
router.post('/generate-index', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ success: false, error: 'Transcript text is required' });

    const systemPrompt = `You are an expert legal indexer specializing in court transcript indexing.
Generate a comprehensive index from the transcript that includes:
1. PROPER NAMES INDEX: All persons mentioned with context (attorney, witness, expert, etc.)
2. SUBJECT MATTER INDEX: Key topics and subjects discussed
3. EXHIBIT INDEX: All exhibits referenced with descriptions
4. LEGAL CITATIONS: Cases, statutes, and regulations mentioned
5. MEDICAL/TECHNICAL TERMS: Specialized terminology with page references
6. KEY PHRASES: Important statements and admissions
7. CROSS-REFERENCES: Related terms and topics linked together
8. CHRONOLOGICAL INDEX: Events organized by date/time

Format each entry with the term followed by its context and significance.
Sort alphabetically within each category.`;

    const result = await callAI(systemPrompt, `Generate a comprehensive index from the following transcript:\n\n${transcript}`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/optimize-schedule - Scheduling optimization
router.post('/optimize-schedule', async (req, res) => {
  try {
    const { jobs, reporters } = req.body;
    if (!jobs) return res.status(400).json({ success: false, error: 'Jobs data is required' });

    const systemPrompt = `You are an expert scheduling optimizer for a court reporting firm.
Analyze the provided jobs and reporter availability to create an optimized schedule.
Consider:
1. REPORTER EXPERTISE: Match reporter certifications to job requirements
2. GEOGRAPHIC EFFICIENCY: Minimize travel between assignments
3. WORKLOAD BALANCE: Distribute jobs evenly among available reporters
4. CERTIFICATION REQUIREMENTS: Ensure reporters have required certifications (RPR, RMR, CRR)
5. CONFLICT DETECTION: Identify any scheduling conflicts
6. BUFFER TIME: Allow adequate travel and preparation time between jobs
7. PRIORITY HANDLING: Rush jobs and high-priority cases take precedence
8. COST OPTIMIZATION: Minimize overtime and travel expenses

Provide:
- OPTIMIZED SCHEDULE: Recommended assignments with rationale
- CONFLICTS FOUND: Any issues detected
- RECOMMENDATIONS: Suggestions for improving scheduling efficiency
- RISK ASSESSMENT: Potential issues with the proposed schedule`;

    const result = await callAI(systemPrompt, `Optimize the following schedule:\n\nJobs: ${JSON.stringify(jobs)}\n\nReporters: ${JSON.stringify(reporters || 'Not provided - suggest optimal assignment')}`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/invoice-narrative - Invoice narrative generation
router.post('/invoice-narrative', async (req, res) => {
  try {
    const { invoice_details } = req.body;
    if (!invoice_details) return res.status(400).json({ success: false, error: 'Invoice details are required' });

    const systemPrompt = `You are an expert billing specialist for a court reporting firm.
Generate a professional invoice narrative that includes:
1. SERVICE DESCRIPTION: Clear description of services provided
2. CASE REFERENCE: Case name, number, and jurisdiction
3. DATE OF SERVICE: When the services were performed
4. ITEMIZED SERVICES: Breakdown of each service with rates
5. SPECIAL CHARGES: Rush fees, expedite fees, or other surcharges with justification
6. DELIVERY DETAILS: How and when the transcript was delivered
7. PAYMENT TERMS: Standard payment terms and due date
8. PROFESSIONAL NOTES: Any relevant notes about the services

The narrative should be:
- Professional and suitable for law firm billing departments
- Clear and detailed enough for accounts payable processing
- Compliant with standard legal billing practices`;

    const result = await callAI(systemPrompt, `Generate a professional invoice narrative for the following details:\n\n${JSON.stringify(invoice_details)}`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
