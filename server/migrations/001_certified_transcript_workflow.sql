BEGIN;
CREATE TABLE IF NOT EXISTS transcript_matters (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  matter_key TEXT NOT NULL,
  title TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('confidential','privileged','sealed')),
  legal_hold BOOLEAN NOT NULL DEFAULT false,
  retention_until DATE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,matter_key)
);
CREATE TABLE IF NOT EXISTS transcript_media_assets (
  id UUID PRIMARY KEY,
  matter_id UUID NOT NULL REFERENCES transcript_matters(id),
  tenant_id TEXT NOT NULL,
  object_uri TEXT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  duration_ms BIGINT NOT NULL CHECK (duration_ms > 0),
  authorization_reference TEXT NOT NULL,
  ingested_by TEXT NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,sha256)
);
CREATE TABLE IF NOT EXISTS transcript_custody_events (
  id BIGSERIAL PRIMARY KEY,
  media_asset_id UUID NOT NULL REFERENCES transcript_media_assets(id),
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  from_location TEXT,
  to_location TEXT,
  evidence_sha256 CHAR(64) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS transcript_versions (
  id UUID PRIMARY KEY,
  media_asset_id UUID NOT NULL REFERENCES transcript_media_assets(id),
  tenant_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  parent_version_id UUID REFERENCES transcript_versions(id),
  object_uri TEXT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  word_error_rate NUMERIC(6,5) CHECK (word_error_rate BETWEEN 0 AND 1),
  diarization_error_rate NUMERIC(6,5) CHECK (diarization_error_rate BETWEEN 0 AND 1),
  timestamp_coverage NUMERIC(6,5) CHECK (timestamp_coverage BETWEEN 0 AND 1),
  redaction_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (redaction_status IN ('unreviewed','reviewed','not_required')),
  state TEXT NOT NULL DEFAULT 'rough' CHECK (state IN ('rough','correction','proofread','certification_pending','certified','superseded')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (media_asset_id,version_number), UNIQUE (tenant_id,sha256)
);
CREATE TABLE IF NOT EXISTS transcript_corrections (
  id UUID PRIMARY KEY,
  transcript_version_id UUID NOT NULL REFERENCES transcript_versions(id),
  tenant_id TEXT NOT NULL,
  page_line_reference TEXT NOT NULL,
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  disposition TEXT NOT NULL DEFAULT 'pending' CHECK (disposition IN ('pending','accepted','rejected')),
  disposed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS transcript_certifications (
  id UUID PRIMARY KEY,
  transcript_version_id UUID NOT NULL REFERENCES transcript_versions(id),
  tenant_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  credential_reference TEXT NOT NULL,
  certification_text TEXT NOT NULL,
  signature_provider_reference TEXT,
  certified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (transcript_version_id)
);
CREATE TABLE IF NOT EXISTS transcript_delivery_outbox (
  id UUID PRIMARY KEY,
  transcript_version_id UUID NOT NULL REFERENCES transcript_versions(id),
  tenant_id TEXT NOT NULL,
  recipient_reference TEXT NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('secure_portal','court_system','matter_system','billing')),
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivering','delivered','failed','dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  provider_reference TEXT,
  next_attempt_at TIMESTAMPTZ,
  UNIQUE (tenant_id,delivery_method,idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_transcript_matter_tenant ON transcript_matters(tenant_id,matter_key);
CREATE INDEX IF NOT EXISTS idx_transcript_delivery_retry ON transcript_delivery_outbox(status,next_attempt_at);
COMMIT;
