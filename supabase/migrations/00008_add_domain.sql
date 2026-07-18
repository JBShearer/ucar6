-- UCAR 6.0 — Add domain field for case context/sector

-- Add domain to filings
ALTER TABLE filings ADD COLUMN IF NOT EXISTS domain text;

-- Add domain to cases (for aggregation)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS domain text;

-- Create index for domain filtering
CREATE INDEX IF NOT EXISTS idx_filings_domain ON filings(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_domain ON cases(domain) WHERE domain IS NOT NULL;

-- Update the vocab_terms kind check to include domain
ALTER TABLE vocab_terms DROP CONSTRAINT IF EXISTS vocab_terms_kind_check;
ALTER TABLE vocab_terms ADD CONSTRAINT vocab_terms_kind_check
  CHECK (kind IN ('verb', 'object_class', 'instrument', 'domain'));

-- Add some common domain vocab terms for the ladder
INSERT INTO vocab_terms (kind, term, status) VALUES
  ('domain', 'law enforcement', 'active'),
  ('domain', 'criminal justice', 'active'),
  ('domain', 'immigration', 'active'),
  ('domain', 'workplace', 'active'),
  ('domain', 'hiring', 'active'),
  ('domain', 'healthcare', 'active'),
  ('domain', 'education', 'active'),
  ('domain', 'financial services', 'active'),
  ('domain', 'social media', 'active'),
  ('domain', 'government services', 'active'),
  ('domain', 'retail', 'active'),
  ('domain', 'transportation', 'active'),
  ('domain', 'military', 'active'),
  ('domain', 'research', 'active')
ON CONFLICT (kind, term) DO NOTHING;
