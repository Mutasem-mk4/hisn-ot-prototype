CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS judge_runs (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL UNIQUE,
  runtime_mode TEXT NOT NULL,
  workflow_state TEXT,
  playback_status TEXT NOT NULL,
  presentation_cursor INTEGER NOT NULL DEFAULT 0,
  speed REAL NOT NULL DEFAULT 1,
  twin_state_json TEXT NOT NULL,
  command_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS domain_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES judge_runs(id),
  sequence INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  workflow_state TEXT,
  payload_json TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  UNIQUE(run_id, sequence)
);

CREATE TABLE IF NOT EXISTS enforcement_actions (
  idempotency_key TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES judge_runs(id),
  action_type TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE REFERENCES judge_runs(id),
  correlation_id TEXT NOT NULL,
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_domain_events_run_sequence ON domain_events(run_id, sequence);
