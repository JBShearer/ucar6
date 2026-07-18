-- UCAR 6.0 — Comment votes and moderation

-- Add vote counts to comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS good_votes int DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS evil_votes int DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS fake_votes int DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS status text DEFAULT 'live' CHECK (status IN ('live', 'hidden', 'flagged'));

-- Comment votes table (separate from case votes)
CREATE TABLE IF NOT EXISTS comment_votes (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('good', 'evil', 'fake')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

-- RLS for comment_votes
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comment_votes_read ON comment_votes;
CREATE POLICY comment_votes_read ON comment_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS comment_votes_insert ON comment_votes;
CREATE POLICY comment_votes_insert ON comment_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS comment_votes_update ON comment_votes;
CREATE POLICY comment_votes_update ON comment_votes FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS comment_votes_delete ON comment_votes;
CREATE POLICY comment_votes_delete ON comment_votes FOR DELETE USING (auth.uid() = user_id);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON comment_votes TO anon, authenticated;

-- Trigger to update comment vote counts
CREATE OR REPLACE FUNCTION update_comment_vote_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET
      good_votes = good_votes + CASE WHEN NEW.kind = 'good' THEN 1 ELSE 0 END,
      evil_votes = evil_votes + CASE WHEN NEW.kind = 'evil' THEN 1 ELSE 0 END,
      fake_votes = fake_votes + CASE WHEN NEW.kind = 'fake' THEN 1 ELSE 0 END
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET
      good_votes = good_votes - CASE WHEN OLD.kind = 'good' THEN 1 ELSE 0 END,
      evil_votes = evil_votes - CASE WHEN OLD.kind = 'evil' THEN 1 ELSE 0 END,
      fake_votes = fake_votes - CASE WHEN OLD.kind = 'fake' THEN 1 ELSE 0 END
    WHERE id = OLD.comment_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE comments SET
      good_votes = good_votes - CASE WHEN OLD.kind = 'good' THEN 1 ELSE 0 END + CASE WHEN NEW.kind = 'good' THEN 1 ELSE 0 END,
      evil_votes = evil_votes - CASE WHEN OLD.kind = 'evil' THEN 1 ELSE 0 END + CASE WHEN NEW.kind = 'evil' THEN 1 ELSE 0 END,
      fake_votes = fake_votes - CASE WHEN OLD.kind = 'fake' THEN 1 ELSE 0 END + CASE WHEN NEW.kind = 'fake' THEN 1 ELSE 0 END
    WHERE id = NEW.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comment_vote_counts_trigger ON comment_votes;
CREATE TRIGGER comment_vote_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON comment_votes
  FOR EACH ROW EXECUTE FUNCTION update_comment_vote_counts();

-- Auto-hide comments with too many fake votes
CREATE OR REPLACE FUNCTION auto_hide_comment() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fake_votes >= 3 AND NEW.status = 'live' THEN
    NEW.status := 'flagged';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_hide_comment_trigger ON comments;
CREATE TRIGGER auto_hide_comment_trigger
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION auto_hide_comment();
