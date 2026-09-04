import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import type { AuditStore, EventAppend, IncidentReport, RunRecord } from '../application/ports.js';
import {
  DomainEventSchema,
  EnforcementCallSchema,
  IncidentReportSchema,
  RuntimeModeSchema,
  TwinStateSchema,
  WorkflowStateSchema,
  CommandSchema,
  type DomainEvent,
  type EnforcementCall,
} from '../shared/contracts.js';

type RunRow = {
  id: string;
  scenario_id: string;
  correlation_id: string;
  command_idempotency_key: string | null;
  runtime_mode: string;
  workflow_state: string | null;
  playback_status: RunRecord['playbackStatus'];
  presentation_cursor: number;
  speed: number;
  twin_state_json: string;
  command_json: string;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  run_id: string;
  sequence: number;
  event_type: string;
  workflow_state: string | null;
  payload_json: string;
  previous_hash: string;
  integrity_hash: string;
  occurred_at: string;
};

export class SqliteAuditStore implements AuditStore {
  readonly database: Database.Database;

  constructor(
    databasePath: string,
    private readonly migrationDirectory: string,
  ) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new Database(databasePath);
    this.database.pragma('journal_mode = WAL');
    this.database.pragma('foreign_keys = ON');
  }

  migrate(): void {
    const files = readdirSync(this.migrationDirectory)
      .filter((file) => /^\d+.*\.sql$/.test(file))
      .sort();
    for (const file of files) {
      const version = Number.parseInt(file.split('_')[0] ?? '', 10);
      if (!Number.isInteger(version)) continue;
      const migration = readFileSync(resolve(this.migrationDirectory, file), 'utf8');
      if (version === 1) {
        this.database.exec(migration);
        this.recordMigration(version);
        continue;
      }
      const applied = this.database
        .prepare('SELECT 1 FROM schema_migrations WHERE version = ?')
        .get(version);
      if (applied) continue;
      this.database.transaction(() => {
        this.database.exec(migration);
        this.recordMigration(version);
      })();
    }
  }

  createRun(run: RunRecord): void {
    this.database
      .prepare(
        `INSERT INTO judge_runs (
          id, scenario_id, correlation_id, command_idempotency_key, runtime_mode, workflow_state, playback_status,
          presentation_cursor, speed, twin_state_json, command_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(...runParameters(run));
  }

  updateRun(run: RunRecord): void {
    this.database
      .prepare(
        `UPDATE judge_runs SET workflow_state = ?, playback_status = ?, presentation_cursor = ?,
          speed = ?, twin_state_json = ?, command_json = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        run.workflowState,
        run.playbackStatus,
        run.presentationCursor,
        run.speed,
        JSON.stringify(run.twin),
        JSON.stringify(run.command),
        run.updatedAt,
        run.id,
      );
  }

  currentRun(): RunRecord | null {
    const row = this.database
      .prepare('SELECT * FROM judge_runs ORDER BY created_at DESC, rowid DESC LIMIT 1')
      .get() as RunRow | undefined;
    return row ? mapRun(row) : null;
  }

  runById(runId: string): RunRecord | null {
    const row = this.database.prepare('SELECT * FROM judge_runs WHERE id = ?').get(runId) as
      RunRow | undefined;
    return row ? mapRun(row) : null;
  }

  runByCommandIdempotencyKey(idempotencyKey: string): RunRecord | null {
    const row = this.database
      .prepare('SELECT * FROM judge_runs WHERE command_idempotency_key = ?')
      .get(idempotencyKey) as RunRow | undefined;
    return row ? mapRun(row) : null;
  }

  appendEvent(event: EventAppend): DomainEvent {
    const sequence = this.nextSequence(event.runId);
    const previousHash = this.previousHash(event.runId);
    const integrityHash = eventHash(event, sequence, previousHash);
    const persisted = DomainEventSchema.parse({
      id: randomUUID(),
      runId: event.runId,
      sequence,
      eventType: event.eventType,
      workflowState: event.workflowState,
      payload: event.payload,
      previousHash,
      integrityHash,
      occurredAt: event.occurredAt,
    });
    this.insertEvent(persisted);
    return persisted;
  }

  eventsForRun(runId: string): DomainEvent[] {
    const rows = this.database
      .prepare('SELECT * FROM domain_events WHERE run_id = ? ORDER BY sequence ASC')
      .all(runId) as EventRow[];
    return rows.map(mapEvent);
  }

  saveEnforcement(call: EnforcementCall, runId: string): EnforcementCall {
    const existing = this.database
      .prepare('SELECT response_json FROM enforcement_actions WHERE idempotency_key = ?')
      .get(call.idempotencyKey) as { response_json: string } | undefined;
    if (existing) return EnforcementCallSchema.parse(JSON.parse(existing.response_json));
    this.database
      .prepare(
        'INSERT INTO enforcement_actions(idempotency_key, run_id, action_type, response_json, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(call.idempotencyKey, runId, call.action, JSON.stringify(call), call.timestamp);
    return call;
  }

  enforcementForRun(runId: string): EnforcementCall[] {
    const rows = this.database
      .prepare(
        'SELECT response_json FROM enforcement_actions WHERE run_id = ? ORDER BY created_at ASC',
      )
      .all(runId) as Array<{ response_json: string }>;
    return rows.map((row) => EnforcementCallSchema.parse(JSON.parse(row.response_json)));
  }

  saveIncident(runId: string, correlationId: string, report: IncidentReport): void {
    const validated = IncidentReportSchema.parse(report);
    this.database
      .prepare(
        'INSERT OR REPLACE INTO incidents(id, run_id, correlation_id, report_json, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(validated.id, runId, correlationId, JSON.stringify(validated), validated.generatedAt);
  }

  incidentForRun(runId: string): IncidentReport | null {
    const row = this.database
      .prepare('SELECT report_json FROM incidents WHERE run_id = ?')
      .get(runId) as { report_json: string } | undefined;
    return row ? IncidentReportSchema.parse(JSON.parse(row.report_json)) : null;
  }

  close(): void {
    this.database.close();
  }

  private nextSequence(runId: string): number {
    const row = this.database
      .prepare('SELECT COALESCE(MAX(sequence), 0) AS sequence FROM domain_events WHERE run_id = ?')
      .get(runId) as { sequence: number };
    return row.sequence + 1;
  }

  private previousHash(runId: string): string {
    const row = this.database
      .prepare(
        'SELECT integrity_hash FROM domain_events WHERE run_id = ? ORDER BY sequence DESC LIMIT 1',
      )
      .get(runId) as { integrity_hash: string } | undefined;
    return row?.integrity_hash ?? 'GENESIS';
  }

  private insertEvent(event: DomainEvent): void {
    this.database
      .prepare(
        `INSERT INTO domain_events (
          id, run_id, sequence, event_type, workflow_state, payload_json,
          previous_hash, integrity_hash, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.id,
        event.runId,
        event.sequence,
        event.eventType,
        event.workflowState,
        JSON.stringify(event.payload),
        event.previousHash,
        event.integrityHash,
        event.occurredAt,
      );
  }

  private recordMigration(version: number): void {
    this.database
      .prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)')
      .run(version, new Date().toISOString());
  }
}

function runParameters(run: RunRecord): unknown[] {
  return [
    run.id,
    run.scenarioId,
    run.correlationId,
    run.commandIdempotencyKey,
    run.runtimeMode,
    run.workflowState,
    run.playbackStatus,
    run.presentationCursor,
    run.speed,
    JSON.stringify(run.twin),
    JSON.stringify(run.command),
    run.createdAt,
    run.updatedAt,
  ];
}

function mapRun(row: RunRow): RunRecord {
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    correlationId: row.correlation_id,
    commandIdempotencyKey: row.command_idempotency_key ?? row.correlation_id,
    runtimeMode: RuntimeModeSchema.parse(row.runtime_mode),
    workflowState: row.workflow_state ? WorkflowStateSchema.parse(row.workflow_state) : null,
    playbackStatus: row.playback_status,
    presentationCursor: row.presentation_cursor,
    speed: row.speed,
    twin: TwinStateSchema.parse(JSON.parse(row.twin_state_json)),
    command: CommandSchema.parse(JSON.parse(row.command_json)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(row: EventRow): DomainEvent {
  const payload: unknown = JSON.parse(row.payload_json);
  return DomainEventSchema.parse({
    id: row.id,
    runId: row.run_id,
    sequence: row.sequence,
    eventType: row.event_type,
    workflowState: row.workflow_state,
    payload,
    previousHash: row.previous_hash,
    integrityHash: row.integrity_hash,
    occurredAt: row.occurred_at,
  });
}

function eventHash(event: EventAppend, sequence: number, previousHash: string): string {
  const canonical = JSON.stringify({ ...event, sequence, previousHash });
  return createHash('sha256').update(canonical).digest('hex');
}
