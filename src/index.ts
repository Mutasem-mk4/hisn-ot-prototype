import { resolve } from 'node:path';
import Fastify from 'fastify';
import { JudgeOrchestrator } from './application/judge-orchestrator.js';
import { loadConfiguration } from './infrastructure/configuration.js';
import { createProviders } from './infrastructure/provider-factory.js';
import { SqliteAuditStore } from './infrastructure/sqlite-audit-store.js';
import { fastifyOptions, registerApplication } from './server/app.js';
import { EventHub } from './server/event-hub.js';

const configuration = loadConfiguration(process.env, process.cwd());
const store = new SqliteAuditStore(
  configuration.databasePath,
  resolve(process.cwd(), 'migrations'),
);
store.migrate();
const providers = createProviders(configuration);
const eventHub = new EventHub();
const orchestrator = new JudgeOrchestrator(
  store,
  configuration.policy,
  configuration.scenarios,
  providers.evidence,
  providers.enforcement,
  providers.reasoner,
  (snapshot) => eventHub.publish(snapshot),
);
await orchestrator.ensureRun();
const server = await registerApplication(
  Fastify(fastifyOptions(configuration)),
  configuration,
  orchestrator,
  eventHub,
);
const tickTimer = setInterval(() => void orchestrator.tick(), 250);
const heartbeatTimer = setInterval(() => eventHub.heartbeat(), 15_000);

async function shutdown() {
  clearInterval(tickTimer);
  clearInterval(heartbeatTimer);
  await server.close();
  store.close();
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

// Let the hosting runtime finish importing the entry point before accepting requests.
void server.listen({ host: '0.0.0.0', port: configuration.port }).catch(async (error: unknown) => {
  server.log.error(error);
  await shutdown();
  process.exitCode = 1;
});
