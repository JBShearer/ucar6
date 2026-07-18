-- UCAR 6.0 — Comments table for case discussions

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) > 0 AND length(body) <= 2000),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_case ON comments(case_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- RLS: anyone can read, users can insert their own, users can delete their own
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comments_read ON comments;
CREATE POLICY comments_read ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS comments_insert ON comments;
CREATE POLICY comments_insert ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS comments_delete ON comments;
CREATE POLICY comments_delete ON comments FOR DELETE USING (auth.uid() = user_id);

-- Grant access
GRANT SELECT, INSERT, DELETE ON comments TO anon, authenticated;
