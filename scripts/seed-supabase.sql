-- ShipComply DB seed: schema + RLS policies
-- Run via: psql $DATABASE_URL -f scripts/seed-supabase.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Core Tables ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    github_url TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    repo_id UUID REFERENCES repos(id),
    status TEXT NOT NULL DEFAULT 'queued',
    compliance_score NUMERIC(5,2),
    scanned_files INT DEFAULT 0,
    excluded_files INT DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_elements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    sources JSONB NOT NULL DEFAULT '[]',
    sinks JSONB NOT NULL DEFAULT '[]',
    compliance_flags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT,
    storage_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    rule TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    file_path TEXT,
    line_number INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pr_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    repo_id UUID REFERENCES repos(id),
    pr_number INT NOT NULL,
    scan_id UUID REFERENCES scans(id),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llm_cache (
    cache_key TEXT PRIMARY KEY,
    response TEXT NOT NULL,
    provider TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

-- RAG corpus chunks
CREATE TABLE IF NOT EXISTS corpus_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chunk_id TEXT NOT NULL UNIQUE,
    jurisdiction TEXT NOT NULL,
    regulation_version TEXT NOT NULL,
    section TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS corpus_chunks_embedding_idx ON corpus_chunks USING ivfflat (embedding vector_cosine_ops);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Default deny — only org members can see their own data
CREATE POLICY org_isolation ON organizations
    USING (id = (current_setting('app.org_id', true))::UUID);

CREATE POLICY org_isolation ON users
    USING (org_id = (current_setting('app.org_id', true))::UUID);

CREATE POLICY org_isolation ON repos
    USING (org_id = (current_setting('app.org_id', true))::UUID);

CREATE POLICY org_isolation ON scans
    USING (org_id = (current_setting('app.org_id', true))::UUID);

CREATE POLICY org_isolation ON data_elements
    USING (org_id = (current_setting('app.org_id', true))::UUID);

CREATE POLICY org_isolation ON artifacts
    USING (org_id = (current_setting('app.org_id', true))::UUID);

CREATE POLICY org_isolation ON compliance_findings
    USING (org_id = (current_setting('app.org_id', true))::UUID);

CREATE POLICY org_isolation ON pr_scans
    USING (org_id = (current_setting('app.org_id', true))::UUID);

CREATE POLICY org_isolation ON audit_log
    USING (org_id = (current_setting('app.org_id', true))::UUID);

-- Service role bypass (for API backend)
CREATE POLICY service_bypass ON organizations TO service_role USING (true);
CREATE POLICY service_bypass ON users TO service_role USING (true);
CREATE POLICY service_bypass ON repos TO service_role USING (true);
CREATE POLICY service_bypass ON scans TO service_role USING (true);
CREATE POLICY service_bypass ON data_elements TO service_role USING (true);
CREATE POLICY service_bypass ON artifacts TO service_role USING (true);
CREATE POLICY service_bypass ON compliance_findings TO service_role USING (true);
CREATE POLICY service_bypass ON pr_scans TO service_role USING (true);
CREATE POLICY service_bypass ON audit_log TO service_role USING (true);

-- Corpus chunks are public (legal texts)
ALTER TABLE corpus_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE llm_cache DISABLE ROW LEVEL SECURITY;
