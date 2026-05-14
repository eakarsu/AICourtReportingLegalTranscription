const express = require('express');
const router = express.Router();
const { callAI } = require('../services/openrouter');
const { body, validationResult } = require('express-validator');
const { aiRateLimiter } = require('../middleware/rateLimiter');

const MAX_TRANSCRIPT_BYTES = 500 * 1024; // 500KB

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  return null;
}

function validateTranscriptSize(value) {
  if (Buffer.byteLength(value, 'utf8') > MAX_TRANSCRIPT_BYTES) {
    throw new Error('Transcript text exceeds 500KB limit');
  }
  return true;
}

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

// POST /api/ai/legal-term-glossary — Identify and define legal terms
router.post(
  '/legal-term-glossary',
  aiRateLimiter,
  [
    body('transcript_text').notEmpty().withMessage('transcript_text is required').custom(validateTranscriptSize)
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;
    try {
      const { transcript_text } = req.body;

      const systemPrompt = `You are an expert legal lexicographer specializing in court reporting and legal transcript analysis.
Your role is to identify and explain all legal terminology found in transcripts.`;

      const userMessage = `Identify and define all legal terms, Latin phrases, and procedural terminology in the following transcript:

${transcript_text}

Provide:
1. LEGAL TERMS GLOSSARY: Alphabetically sorted list of every legal term found with:
   - Term as it appears in transcript
   - Standard legal definition
   - Context of use in this transcript
   - Plain English explanation
2. LATIN PHRASES: All Latin legal phrases with translation and meaning
3. PROCEDURAL TERMINOLOGY: Court procedure terms with explanations
4. TECHNICAL JARGON: Industry-specific technical terms
5. ACRONYMS & ABBREVIATIONS: All abbreviations with their full forms
6. JURISDICTION-SPECIFIC TERMS: Terms that may vary by jurisdiction

Format as a structured glossary suitable for legal professionals and clients.`;

      const result = await callAI(systemPrompt, userMessage);
      res.json({ success: true, glossary: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/transcript-summary — Structured summary of transcript
router.post(
  '/transcript-summary',
  aiRateLimiter,
  [
    body('transcript_text').notEmpty().withMessage('transcript_text is required').custom(validateTranscriptSize),
    body('summary_type').optional().isIn(['brief', 'detailed', 'executive']).withMessage('summary_type must be brief, detailed, or executive')
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;
    try {
      const { transcript_text, summary_type = 'detailed' } = req.body;

      const systemPrompt = `You are an expert legal analyst specializing in court transcript summarization. You create accurate, structured summaries used by attorneys and clients.`;

      const summaryInstructions = {
        brief: `Create a concise 1-2 page summary covering only the most critical facts, parties, and rulings. Bullet points preferred.`,
        detailed: `Create a comprehensive summary covering all testimony, evidence, rulings, and proceedings in organized sections.`,
        executive: `Create a high-level executive summary suitable for non-legal stakeholders. Focus on business/outcome implications, avoid legal jargon, keep to 1 page.`
      };

      const userMessage = `${summaryInstructions[summary_type]}

Transcript to summarize:
${transcript_text}

Structure the summary with:
1. CASE OVERVIEW: Case name, number, date, court, judge
2. PARTIES: All parties and their roles (plaintiff, defendant, attorneys, witnesses)
3. KEY FACTS: Most important factual findings and testimony
4. EVIDENCE PRESENTED: Exhibits and documentary evidence discussed
5. LEGAL ARGUMENTS: Main arguments made by each side
6. RULINGS & ORDERS: Any rulings made during this proceeding
7. WITNESS TESTIMONY HIGHLIGHTS: Key points from each witness
8. OUTCOME/STATUS: Current status or outcome of proceedings
9. NEXT STEPS: Any scheduled proceedings or required actions

Summary Type: ${summary_type.toUpperCase()}`;

      const result = await callAI(systemPrompt, userMessage);
      res.json({ success: true, summary: result, summary_type });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/speaker-identification — Identify speakers from context
router.post(
  '/speaker-identification',
  aiRateLimiter,
  [
    body('transcript_text').notEmpty().withMessage('transcript_text is required').custom(validateTranscriptSize)
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;
    try {
      const { transcript_text } = req.body;

      const systemPrompt = `You are an expert court transcript analyst specializing in speaker identification. You analyze dialogue patterns, vocabulary, and context to identify and label speakers in legal proceedings.`;

      const userMessage = `Analyze the following transcript and identify all speakers from context clues:

${transcript_text}

Provide:
1. SPEAKER IDENTIFICATION: For each speaker identifier (Q, A, THE COURT, etc.):
   - Identified role (e.g., Judge, Plaintiff's Attorney, Defense Counsel, Witness, Court Reporter)
   - Confidence level (High/Medium/Low)
   - Evidence/reasoning for identification
   - Suggested label (e.g., "THE COURT: [Judge Smith]")
2. SPEAKER PROFILE: For each identified speaker:
   - Name (if mentioned in transcript)
   - Role in proceedings
   - Notable speech patterns or vocabulary
3. UNLABELED SPEAKERS: Any speakers that could not be identified with reasoning
4. SUGGESTED RELABELING: Recommended labels to replace generic identifiers (Q, A, etc.)
5. DIALOGUE FLOW: Summary of how speakers interact

Format suggestions as ready-to-use labels for transcript editing.`;

      const result = await callAI(systemPrompt, userMessage);
      res.json({ success: true, speaker_analysis: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/citation-extractor — Extract and format case citations
router.post(
  '/citation-extractor',
  aiRateLimiter,
  [
    body('transcript_text').notEmpty().withMessage('transcript_text is required').custom(validateTranscriptSize)
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;
    try {
      const { transcript_text } = req.body;

      const systemPrompt = `You are an expert legal citation specialist with comprehensive knowledge of Bluebook citation format, federal and state court systems, statutory law, and regulatory citations.`;

      const userMessage = `Extract all legal citations from the following transcript and format them in proper Bluebook format:

${transcript_text}

Provide:
1. CASE CITATIONS:
   - Original citation as stated in transcript
   - Properly formatted Bluebook citation
   - Case name, court, year
   - Brief description of relevance to current proceeding
2. STATUTORY CITATIONS:
   - Federal statutes (U.S.C. format)
   - State statutes
   - Regulations (C.F.R. format)
   - Proper Bluebook format for each
3. CONSTITUTIONAL PROVISIONS: Any constitutional citations
4. SECONDARY SOURCES: Law review articles, treatises, or other secondary sources mentioned
5. INCOMPLETE CITATIONS: Partial citations that need completion (flag for attorney review)
6. CITATION ERRORS: Any incorrectly cited sources with corrections
7. CITATION FREQUENCY: How many times each source was referenced

Output as a structured citation report suitable for legal brief preparation.`;

      const result = await callAI(systemPrompt, userMessage);
      res.json({ success: true, citations: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/conflict-checker — Identify contradictions in testimony
router.post(
  '/conflict-checker',
  aiRateLimiter,
  [
    body('transcript_text').notEmpty().withMessage('transcript_text is required').custom(validateTranscriptSize)
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;
    try {
      const { transcript_text } = req.body;

      const systemPrompt = `You are an expert legal analyst specializing in identifying inconsistencies, contradictions, and credibility issues in court testimony. You have extensive experience in trial preparation and cross-examination strategy.`;

      const userMessage = `Analyze the following transcript for contradictions, inconsistencies, and conflicts in testimony:

${transcript_text}

Provide:
1. DIRECT CONTRADICTIONS: Statements that directly contradict each other
   - Speaker, page/line reference (if available)
   - Statement A vs Statement B
   - Severity: Critical / Significant / Minor
2. INTERNAL INCONSISTENCIES: Contradictions within a single witness's testimony
3. CROSS-WITNESS CONFLICTS: Where different witnesses give conflicting accounts
4. TIMELINE INCONSISTENCIES: Conflicting dates, times, or sequences of events
5. FACTUAL DISPUTES: Areas where parties dispute underlying facts
6. CREDIBILITY FLAGS: Statements that may undermine witness credibility
7. MEMORY INCONSISTENCIES: Differences between prior statements and current testimony
8. IMPEACHMENT OPPORTUNITIES: Contradictions that could be used for cross-examination
9. MATERIALITY ASSESSMENT: Which conflicts are most legally significant
10. RECOMMENDED FOLLOW-UP: Questions or investigation prompted by inconsistencies

Severity ratings: Critical (likely outcome-determinative), Significant (may affect credibility), Minor (trivial inconsistency).`;

      const result = await callAI(systemPrompt, userMessage);
      res.json({ success: true, conflict_analysis: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/analyze-case-timeline — Audit recommendation: timeline analysis
router.post(
  '/analyze-case-timeline',
  aiRateLimiter,
  [
    body('case_summary').notEmpty().withMessage('case_summary is required').isLength({ max: 50000 }).withMessage('case_summary too long'),
    body('events').optional().isArray()
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;
    try {
      const { case_summary, events } = req.body;

      const systemPrompt = `You are an expert legal case analyst. You synthesize case summaries and event lists into structured timelines highlighting key milestones and deposition needs.`;

      const userMessage = `Analyze the following case and produce a structured timeline.

CASE SUMMARY:
${case_summary}

${events && events.length ? `KNOWN EVENTS:\n${JSON.stringify(events, null, 2)}` : ''}

Provide:
1. CHRONOLOGICAL TIMELINE: Date / event / actors / significance.
2. KEY MILESTONES: Pivotal moments that drive the case theory.
3. EVIDENTIARY GAPS: Time periods with missing information that may need depositions or discovery.
4. RECOMMENDED DEPOSITIONS: Witnesses to depose with rationale.
5. RISK FLAGS: Statute-of-limitations, deadline, or sequencing risks.`;

      const result = await callAI(systemPrompt, userMessage);
      res.json({ success: true, timeline_analysis: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

function ensureKey(res) {
  if (!process.env.OPENROUTER_API_KEY) {
    res.status(503).json({ success: false, error: 'AI service not configured (missing OPENROUTER_API_KEY)' });
    return false;
  }
  return true;
}

// POST /api/ai/extract-exhibit-metadata — Audit recommendation: exhibit metadata extraction
router.post(
  '/extract-exhibit-metadata',
  aiRateLimiter,
  [
    body('exhibit_text').notEmpty().withMessage('exhibit_text is required').isLength({ max: 100000 }).withMessage('exhibit_text too long'),
    body('exhibit_label').optional().isString()
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;
    try {
      const { exhibit_text, exhibit_label } = req.body;

      const systemPrompt = `You extract structured metadata from legal exhibits. You identify document type, parties, dates, key facts, and relevance for trial preparation.`;

      const userMessage = `Extract metadata from the following exhibit${exhibit_label ? ` (label: ${exhibit_label})` : ''}.

EXHIBIT TEXT:
${exhibit_text}

Return:
1. DOCUMENT TYPE: e.g., contract / email / invoice / medical record / photo description.
2. DATE(S) IDENTIFIED.
3. PARTIES / AUTHORS / RECIPIENTS.
4. KEY FACTS: 3-7 bullet points.
5. POTENTIAL RELEVANCE: How this might be used at trial (impeachment, foundation, etc.).
6. AUTHENTICATION CONCERNS: Any flags that might affect admissibility.
7. SUGGESTED INDEX TAGS: 3-6 short keyword tags.`;

      const result = await callAI(systemPrompt, userMessage);
      res.json({ success: true, exhibit_metadata: result, exhibit_label: exhibit_label || null });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/predict-deposition-needs — Apply pass 4: predict deposition witnesses & topics
router.post(
  '/predict-deposition-needs',
  aiRateLimiter,
  [
    body('case_summary').notEmpty().withMessage('case_summary is required').isLength({ max: 50000 }).withMessage('case_summary too long'),
    body('known_witnesses').optional().isArray()
  ],
  async (req, res) => {
    if (!ensureKey(res)) return;
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;
    try {
      const { case_summary, known_witnesses } = req.body;

      const systemPrompt = `You are an expert litigation strategist. Given a case summary, predict the depositions counsel will need: who to depose, what topics to cover, expected duration, and risks.`;

      const userMessage = `Predict deposition needs for this case.

CASE SUMMARY:
${case_summary}

${known_witnesses && known_witnesses.length ? `KNOWN WITNESSES:\n${JSON.stringify(known_witnesses, null, 2)}` : ''}

Provide:
1. PRIORITY WITNESSES: Ranked list with role, expected testimony, rationale.
2. TOPIC OUTLINE PER WITNESS: Key topics and document categories to address.
3. ESTIMATED DURATION: Hours/days per deposition with justification.
4. ORDER OF DEPOSITIONS: Strategic sequencing recommendation.
5. EXHIBITS LIKELY NEEDED: Documents to prepare.
6. RISK FLAGS: Privilege, hostile-witness, or scheduling risks.`;

      const result = await callAI(systemPrompt, userMessage);
      res.json({ success: true, deposition_prediction: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/optimize-delivery-routing — Apply pass 4: transcript delivery batching
router.post(
  '/optimize-delivery-routing',
  aiRateLimiter,
  [
    body('deliveries').notEmpty().withMessage('deliveries is required').isArray().withMessage('deliveries must be an array'),
    body('constraints').optional().isObject()
  ],
  async (req, res) => {
    if (!ensureKey(res)) return;
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;
    try {
      const { deliveries, constraints } = req.body;

      const systemPrompt = `You are an expert logistics coordinator for a court reporting firm's transcript delivery operation. Optimize batch routing across digital and physical delivery channels.`;

      const userMessage = `Optimize delivery routing for these transcript deliveries.

DELIVERIES:
${JSON.stringify(deliveries, null, 2)}

CONSTRAINTS:
${JSON.stringify(constraints || {}, null, 2)}

Provide:
1. RECOMMENDED BATCHES: Group deliveries by channel, deadline, geography.
2. ROUTING SEQUENCE: Order of stops or upload sequence per batch.
3. DEADLINE RISKS: Deliveries at risk of missing deadline; mitigation.
4. COST/TIME TRADEOFFS: Where rush courier vs. standard makes sense.
5. EXCEPTIONS: Deliveries needing special handling (sealed, certified, e-file).
6. KPI ESTIMATE: Estimated total cost / time / on-time percentage.`;

      const result = await callAI(systemPrompt, userMessage);
      res.json({ success: true, routing_plan: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/analyze-exhibit-relevance — Apply pass 4: exhibit-to-claim mapping
router.post(
  '/analyze-exhibit-relevance',
  aiRateLimiter,
  [
    body('exhibit_text').notEmpty().withMessage('exhibit_text is required').isLength({ max: 100000 }).withMessage('exhibit_text too long'),
    body('claims').notEmpty().withMessage('claims is required'),
    body('exhibit_label').optional().isString()
  ],
  async (req, res) => {
    if (!ensureKey(res)) return;
    const validErr = handleValidation(req, res);
    if (validErr !== null) return;
    try {
      const { exhibit_text, claims, exhibit_label } = req.body;

      const systemPrompt = `You are an expert trial-prep analyst. You map exhibits to legal claims and elements, scoring relevance and flagging admissibility concerns.`;

      const userMessage = `Analyze the following exhibit's relevance to the listed claims.

EXHIBIT${exhibit_label ? ` (label: ${exhibit_label})` : ''}:
${exhibit_text}

CLAIMS / ELEMENTS:
${typeof claims === 'string' ? claims : JSON.stringify(claims, null, 2)}

Provide:
1. RELEVANCE PER CLAIM: For each claim, rate relevance High/Medium/Low/None with reasoning.
2. ELEMENTS PROVED OR DISPROVED: Which legal elements this exhibit speaks to.
3. PROPOSED USES: Direct evidence, impeachment, foundation, demonstrative.
4. ADMISSIBILITY CONCERNS: Hearsay, authentication, FRE 403 issues.
5. RECOMMENDED FOLLOW-UP: Foundational witnesses or supporting exhibits needed.
6. SUGGESTED INDEX TAGS: 3-6 keyword tags for retrieval.`;

      const result = await callAI(systemPrompt, userMessage);
      res.json({ success: true, relevance_analysis: result, exhibit_label: exhibit_label || null });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
