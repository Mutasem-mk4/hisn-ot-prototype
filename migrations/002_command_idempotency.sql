ALTER TABLE judge_runs ADD COLUMN command_idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_judge_runs_command_idempotency
  ON judge_runs(command_idempotency_key)
  WHERE command_idempotency_key IS NOT NULL;
