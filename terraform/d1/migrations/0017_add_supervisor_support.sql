-- Add session_role to sessions index (D1)
ALTER TABLE sessions ADD COLUMN session_role TEXT NOT NULL DEFAULT 'default';

-- Track supervisor→watched-session relationships
CREATE TABLE IF NOT EXISTS supervisor_watches (
  supervisor_session_id TEXT NOT NULL,
  watched_session_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (supervisor_session_id, watched_session_id)
);
CREATE INDEX idx_sw_watched ON supervisor_watches(watched_session_id);
