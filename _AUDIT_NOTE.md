# Audit Apply Notes — AICourtReportingLegalTranscription

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_02.md` (lines 414-462).

## Original audit recommendations

### Existing AI features
6 AI endpoints: `/proofread`, `/terminology`, `/deposition-summary`,
`/generate-index`, `/optimize-schedule`, `/invoice-narrative` (plus 5 more
already in `routes/ai.js`).

### Missing AI counterparts (audit gaps)
- `cases.js` lacks `/analyze-case-timeline` or `/predict-deposition-needs`.
- `deliveries.js` lacks `/optimize-delivery-routing`.
- `exhibits.js` lacks `/extract-exhibit-metadata` or
  `/analyze-exhibit-relevance`.

### Missing non-AI features
- Court-calendar / legal-research integration (LexisNexis, PACER).
- Real-time video sync with audio.
- Secure cloud vault for sensitive transcripts.
- Reporter certification / continuing-education tracking.

### Custom feature suggestions
- Predictive case complexity scoring.
- Automated exhibit extraction with OCR.
- Precedent deposition search.
- Court filing automation from transcripts.
- Reporter wellness & utilization modeling.

## Implemented in this pass (mechanical)

1. `POST /api/ai/analyze-case-timeline` — closes audit gap for
   `cases.js` timeline analysis.
2. `POST /api/ai/extract-exhibit-metadata` — closes audit gap for
   `exhibits.js` metadata extraction.

Both added to `server/routes/ai.js`, follow the existing `callAI` +
`aiRateLimiter` + `express-validator` style. No new files, no new deps.
Verified with `node --check`.

## Backlog (not implemented this pass)

### Mechanical, low-risk
- `/api/ai/predict-deposition-needs` — case-driven recommendation.
- `/api/ai/optimize-delivery-routing` — transcript delivery batch routing.
- `/api/ai/analyze-exhibit-relevance` — exhibit-to-claim mapping.

### Needs product decision
- Persisted timeline / exhibit metadata models (currently stateless endpoints).
- Reporter wellness scoring (data-collection design needed).

### Needs credentials / external SDK
- LexisNexis, PACER, court-calendar integrations.
- Video/audio real-time sync hardware integrations.

### Too risky / large refactor
- Precedent deposition search across full transcript library (vector store
  build).
- Court filing automation (jurisdiction-by-jurisdiction work).

## Apply pass 3 (frontend)

- **Action:** LEFT-AS-IS — frontend already wired.
- `client/src/pages/AIFeaturesNewPage.js` calls the two apply2 endpoints (`/ai/analyze-case-timeline`, `/ai/extract-exhibit-metadata`) via `services/api.js` (JWT Bearer from localStorage interceptor).
- Routes registered in `client/src/App.js` at `/ai-new` (ProtectedRoute).
- Error handling covers 503-no-key path via `react-toastify` (`error.response?.data?.error`).
- See `_AUDIT/apply3_logs/ab3_82.md`.

## Apply pass 4 (mechanical backlog)

- **Action:** VERIFIED-EXISTING — all 3 mechanical backlog items had already been implemented in `server/routes/ai.js` (lines 498-619) and `client/src/pages/AIFeaturesNewPage.js`.
- Endpoints: `POST /api/ai/predict-deposition-needs`, `POST /api/ai/optimize-delivery-routing`, `POST /api/ai/analyze-exhibit-relevance`.
- BE pattern matches existing routes: `callAI` helper, `aiRateLimiter`, `express-validator`, plus explicit `ensureKey(res)` 503 guard on missing `OPENROUTER_API_KEY`.
- FE: each form is a card on `/ai-new` (ProtectedRoute) using `services/api.js` axios with JWT Bearer interceptor; 503 surfaced via `error.response?.data?.error`.
- Syntax: `node --check` PASS. No new deps.
- See `_AUDIT/apply4_logs/ab3_82.md`.
