import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { z } from 'zod';
import type { JudgeOrchestrator } from '../application/judge-orchestrator.js';
import type { AppConfiguration } from '../infrastructure/configuration.js';
import { ControlRequestSchema, TwinStateSchema } from '../shared/contracts.js';
import { HisnError } from '../shared/errors.js';
import type { EventHub } from './event-hub.js';
import { SessionGuard } from './session-guard.js';
import { createRehearsalExecutor, judgeBaseline } from '../infrastructure/judge-rehearsal.js';
import {
  connectedPreflight,
  verifyConnectedContext,
  verifyConnectedEvidenceComparison,
} from '../infrastructure/connected-verification.js';

const NewRunSchema = z
  .object({ scenarioId: z.string().min(3), idempotencyKey: z.string().uuid() })
  .strict();
const RehearsalRequestSchema = NewRunSchema.extend({ continuingTwin: TwinStateSchema.optional() });

export async function buildServer(
  configuration: AppConfiguration,
  orchestrator: JudgeOrchestrator,
  eventHub: EventHub,
) {
  return registerApplication(
    Fastify(fastifyOptions(configuration)),
    configuration,
    orchestrator,
    eventHub,
  );
}

export function fastifyOptions(configuration: AppConfiguration): FastifyServerOptions {
  return {
    logger: {
      level: configuration.logLevel,
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers.x-csrf-token'],
        censor: '[REDACTED]',
      },
    },
    bodyLimit: 32 * 1024,
    requestIdHeader: 'x-correlation-id',
  };
}

export async function registerApplication(
  server: FastifyInstance,
  configuration: AppConfiguration,
  orchestrator: JudgeOrchestrator,
  eventHub: EventHub,
) {
  const sessions = new SessionGuard(configuration.sessionSecret, configuration.secureCookies);
  const executeRehearsal = createRehearsalExecutor(configuration);
  await server.register(rateLimit, { global: false });
  server.addHook('onRequest', (request, _reply, done) => {
    if (configuration.mode !== 'DEMO' && request.url.startsWith('/api/')) {
      throw new HisnError(
        'AUTHORIZATION_DENIED',
        'Interactive control is DEMO-only. Operator authentication and gateway identity binding are required for external operation.',
        403,
      );
    }
    done();
  });
  server.addHook('onSend', async (_request, reply) => {
    reply
      .header('x-content-type-options', 'nosniff')
      .header('x-frame-options', 'DENY')
      .header('referrer-policy', 'no-referrer')
      .header(
        'content-security-policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'",
      );
  });

  server.setErrorHandler(async (error, request, reply) => {
    if (error instanceof HisnError) {
      return reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
    }
    if (error instanceof z.ZodError) {
      return reply
        .code(400)
        .send({ error: { code: 'COMMAND_INVALID', message: 'Request validation failed' } });
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 429
    ) {
      return reply
        .code(429)
        .send({ error: { code: 'RATE_LIMITED', message: 'Request rate exceeded' } });
    }
    request.log.error({ err: error }, 'Unhandled request error');
    return reply
      .code(500)
      .send({ error: { code: 'INTERNAL_ERROR', message: 'The request failed safely' } });
  });

  server.get('/healthz', () => ({ status: 'ok', service: 'hisn-ot' }));
  server.get('/readyz', async (_request, reply) => {
    const readiness = await orchestrator.readiness();
    const ready =
      readiness.database === 'READY' &&
      readiness.digitalTwin === 'READY' &&
      readiness.policy === 'READY';
    return reply
      .code(ready ? 200 : 503)
      .send({ status: ready ? 'ready' : 'not_ready', checks: readiness });
  });
  server.get('/api/v1/session', (request, reply) => {
    const session = sessions.establish(request, reply);
    return { csrfToken: session.csrfToken, role: session.role, runtimeMode: configuration.mode };
  });
  server.get('/api/v1/scenarios', (request) => {
    sessions.authorize(request);
    return configuration.scenarios.map(({ id, name }) => ({ id, name }));
  });
  server.get('/api/v1/connected-verification', (request) => {
    sessions.authorize(request);
    return connectedPreflight(configuration);
  });
  server.post(
    '/api/v1/connected-verification',
    {
      config: { rateLimit: { max: 2, timeWindow: '1 minute' } },
    },
    async (request) => {
      sessions.verifyMutation(request);
      const body = z
        .object({
          context: z.enum(['A', 'B', 'BOTH']),
          stage: z.enum(['evidence', 'investigation']),
        })
        .strict()
        .refine((input) => input.context !== 'BOTH' || input.stage === 'evidence')
        .parse(request.body);
      if (body.context === 'BOTH') return verifyConnectedEvidenceComparison(configuration);
      return verifyConnectedContext(configuration, { context: body.context, stage: body.stage });
    },
  );
  server.get('/api/v1/judge-run', async (request) => {
    sessions.authorize(request);
    if (configuration.nokiaSimulatorEnabled) return judgeBaseline(configuration);
    return orchestrator.ensureRun();
  });
  server.post(
    '/api/v1/judge-run',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request) => {
      sessions.verifyMutation(request);
      const body = NewRunSchema.parse(request.body);
      return orchestrator.createRun(body.scenarioId, body.idempotencyKey);
    },
  );
  server.post(
    '/api/v1/judge-run/command',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request) => {
      sessions.verifyMutation(request);
      const body = NewRunSchema.parse(request.body);
      return orchestrator.submitCommand(body.scenarioId, body.idempotencyKey);
    },
  );
  server.post(
    '/api/v1/judge-run/rehearsal',
    {
      config: {
        rateLimit: { max: configuration.rehearsalRateLimitMax, timeWindow: '1 minute' },
      },
    },
    async (request) => {
      sessions.verifyMutation(request);
      const body = RehearsalRequestSchema.parse(request.body);
      return executeRehearsal(sessions.authorize(request).id, body);
    },
  );
  server.post(
    '/api/v1/judge-run/control',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async (request) => {
      sessions.verifyMutation(request);
      const body = ControlRequestSchema.parse(request.body);
      return orchestrator.control(body.action, body.speed ? Number(body.speed) : undefined);
    },
  );
  server.get<{ Params: { runId: string } }>(
    '/api/v1/judge-run/:runId/incident',
    async (request, reply) => {
      sessions.authorize(request);
      const report = orchestrator.incident(request.params.runId);
      if (!report) throw new HisnError('RUN_NOT_FOUND', 'Incident report is not available', 404);
      if (request.query && (request.query as Record<string, string>).download === '1') {
        reply.header(
          'content-disposition',
          `attachment; filename="hisn-oil-incident-${report.correlationId}.json"`,
        );
      }
      return report;
    },
  );
  server.get('/api/v1/events', async (request, reply) => {
    sessions.authorize(request);
    const initial = await orchestrator.ensureRun();
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    reply.raw.write(': connected\n\n');
    reply.raw.write(`event: snapshot\ndata: ${JSON.stringify(initial)}\n\n`);
    const unsubscribe = eventHub.subscribe(reply.raw);
    reply.raw.on('close', unsubscribe);
  });

  const webRoot = resolve(process.cwd(), 'dist/web');
  if (existsSync(webRoot)) {
    await server.register(fastifyStatic, { root: webRoot, wildcard: false });
    server.setNotFoundHandler(async (request, reply) => {
      if (
        request.url.startsWith('/api/') ||
        request.url === '/healthz' ||
        request.url === '/readyz'
      ) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
      }
      return reply.sendFile('index.html');
    });
  }

  return server;
}
