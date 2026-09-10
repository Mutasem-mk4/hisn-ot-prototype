import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  PolicySchema,
  RuntimeModeSchema,
  ScenarioFileSchema,
  type Policy,
  type RuntimeMode,
  type Scenario,
} from '../shared/contracts.js';
import { HisnError } from '../shared/errors.js';

const DEFAULT_POLICY_PATH = './config/policy.v1.json';
const DEFAULT_SCENARIO_PATH = './config/scenarios.v1.json';
const defaultConfigurationFiles = new Map([
  [resolve(process.cwd(), DEFAULT_POLICY_PATH), readFileSync(DEFAULT_POLICY_PATH, 'utf8')],
  [resolve(process.cwd(), DEFAULT_SCENARIO_PATH), readFileSync(DEFAULT_SCENARIO_PATH, 'utf8')],
]);

const EnvironmentSchema = z
  .object({
    HISN_MODE: RuntimeModeSchema.default('DEMO'),
    HISN_PORT: z.coerce.number().int().min(1024).max(65_535).default(4310),
    HISN_DATABASE_PATH: z.string().default('./var/hisn-ot.db'),
    HISN_POLICY_PATH: z.string().default(DEFAULT_POLICY_PATH),
    HISN_SCENARIO_PATH: z.string().default(DEFAULT_SCENARIO_PATH),
    HISN_REHEARSAL_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(120).default(12),
    HISN_LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    HISN_AGENT_PROVIDER: z.enum(['AUTO', 'DETERMINISTIC', 'GROQ']).default('AUTO'),
    HISN_SESSION_SECRET: z.string().min(32).optional(),
    VERCEL: z.literal('1').optional(),
    HISN_NOKIA_SIMULATOR: z.enum(['true', 'false']).default('false'),
    NOKIA_NAC_BASE_URL: z.string().url().optional(),
    NOKIA_NAC_API_KEY: z.string().min(8).optional(),
    NOKIA_NAC_RAPIDAPI_HOST: z.string().min(3).default('network-as-code.nokia.rapidapi.com'),
    NOKIA_NAC_ACCESS_TOKEN: z.string().min(8).optional(),
    HISN_OPERATOR_PHONE: z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/)
      .optional(),
    HISN_BACKUP_PHONE: z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/)
      .optional(),
    HISN_GATEWAY_NAI: z.string().min(3).optional(),
    HISN_BACKUP_IPV4: z.ipv4().optional(),
    HISN_APP_SERVER_IPV4: z.ipv4().optional(),
    HISN_OPERATIONAL_SLICE_ID: z.string().min(3).optional(),
    HISN_GEOFENCE_LATITUDE: z.coerce.number().min(-90).max(90).optional(),
    HISN_GEOFENCE_LONGITUDE: z.coerce.number().min(-180).max(180).optional(),
    HISN_GEOFENCE_RADIUS_METERS: z.coerce.number().positive().max(100_000).optional(),
    HISN_LLM_BASE_URL: z.string().url().optional(),
    HISN_LLM_API_KEY: z.string().min(8).optional(),
    HISN_LLM_MODEL: z.string().min(2).optional(),
  })
  .strict();

export type NacCredentials = {
  baseUrl: string;
  apiKey: string;
  rapidapiHost: string;
  accessToken?: string | undefined;
  operatorPhone: string;
  backupPhone: string;
  gatewayNai?: string | undefined;
  backupIpv4?: string | undefined;
  appServerIpv4: string;
  operationalSliceId?: string | undefined;
  geofence: { latitude: number; longitude: number; radiusMeters: number };
};

export type LlmCredentials = { baseUrl: string; apiKey: string; model: string };

export type AppConfiguration = {
  mode: RuntimeMode;
  port: number;
  databasePath: string;
  logLevel: z.infer<typeof EnvironmentSchema>['HISN_LOG_LEVEL'];
  sessionSecret: string;
  secureCookies: boolean;
  rehearsalRateLimitMax: number;
  agentProvider: z.infer<typeof EnvironmentSchema>['HISN_AGENT_PROVIDER'];
  nokiaSimulatorEnabled: boolean;
  policy: Policy;
  scenarios: Scenario[];
  nac: NacCredentials | null;
  llm: LlmCredentials | null;
};

export function loadConfiguration(
  environment: NodeJS.ProcessEnv,
  workingDirectory: string,
): AppConfiguration {
  const parsedEnvironment = parseEnvironment(environment);
  const policy = readJson(parsedEnvironment.HISN_POLICY_PATH, workingDirectory, PolicySchema);
  const scenariosFile = readJson(
    parsedEnvironment.HISN_SCENARIO_PATH,
    workingDirectory,
    ScenarioFileSchema,
  );
  const nac = nacCredentials(parsedEnvironment);
  const llm = llmCredentials(parsedEnvironment);
  assertLiveConfiguration(parsedEnvironment.HISN_MODE, nac);
  if (parsedEnvironment.HISN_NOKIA_SIMULATOR === 'true' && nac === null) {
    throw configurationError('HISN_NOKIA_SIMULATOR requires Nokia simulator configuration');
  }
  return {
    mode: parsedEnvironment.HISN_MODE,
    port: parsedEnvironment.HISN_PORT,
    databasePath: resolve(workingDirectory, parsedEnvironment.HISN_DATABASE_PATH),
    logLevel: parsedEnvironment.HISN_LOG_LEVEL,
    sessionSecret: sessionSecret(parsedEnvironment),
    secureCookies: parsedEnvironment.VERCEL === '1' || parsedEnvironment.HISN_MODE === 'LIVE',
    rehearsalRateLimitMax: parsedEnvironment.HISN_REHEARSAL_RATE_LIMIT_MAX,
    agentProvider: parsedEnvironment.HISN_AGENT_PROVIDER,
    nokiaSimulatorEnabled: parsedEnvironment.HISN_NOKIA_SIMULATOR === 'true',
    policy,
    scenarios: scenariosFile.scenarios,
    nac,
    llm,
  };
}

function parseEnvironment(environment: NodeJS.ProcessEnv) {
  const relevantEntries = Object.fromEntries(
    Object.entries(environment).filter(
      ([key]) => key.startsWith('HISN_') || key.startsWith('NOKIA_') || key === 'VERCEL',
    ),
  );
  const parsed = EnvironmentSchema.safeParse(relevantEntries);
  if (!parsed.success)
    throw configurationError('Environment validation failed', parsed.error.flatten());
  return parsed.data;
}

function sessionSecret(environment: z.infer<typeof EnvironmentSchema>): string {
  if (environment.HISN_SESSION_SECRET) return environment.HISN_SESSION_SECRET;
  if (environment.VERCEL === '1' || environment.HISN_MODE === 'LIVE') {
    throw configurationError('HISN_SESSION_SECRET is required for hosted or LIVE operation');
  }
  return randomBytes(32).toString('hex');
}

function readJson<T>(path: string, workingDirectory: string, schema: z.ZodType<T>): T {
  const resolvedPath = resolve(workingDirectory, path);
  const serialized =
    defaultConfigurationFiles.get(resolvedPath) ?? readFileSync(resolvedPath, 'utf8');
  const parsed = schema.safeParse(JSON.parse(serialized));
  if (!parsed.success)
    throw configurationError(`Configuration validation failed for ${path}`, parsed.error.flatten());
  return parsed.data;
}

function nacCredentials(environment: z.infer<typeof EnvironmentSchema>): NacCredentials | null {
  const {
    NOKIA_NAC_BASE_URL: baseUrl,
    NOKIA_NAC_API_KEY: apiKey,
    NOKIA_NAC_RAPIDAPI_HOST: rapidapiHost,
    NOKIA_NAC_ACCESS_TOKEN: accessToken,
    HISN_OPERATOR_PHONE: operatorPhone,
    HISN_BACKUP_PHONE: backupPhone,
    HISN_GATEWAY_NAI: gatewayNai,
    HISN_BACKUP_IPV4: backupIpv4,
    HISN_APP_SERVER_IPV4: appServerIpv4,
    HISN_OPERATIONAL_SLICE_ID: operationalSliceId,
    HISN_GEOFENCE_LATITUDE: latitude,
    HISN_GEOFENCE_LONGITUDE: longitude,
    HISN_GEOFENCE_RADIUS_METERS: radiusMeters,
  } = environment;
  const required = [
    baseUrl,
    apiKey,
    operatorPhone,
    backupPhone,
    appServerIpv4,
    latitude,
    longitude,
    radiusMeters,
  ];
  if (required.every((value) => value === undefined)) return null;
  if (required.some((value) => value === undefined)) {
    throw configurationError(
      'Nokia configuration requires base URL, API key, operator/backup phones, application server IPv4, and geofence values',
    );
  }
  if ((gatewayNai === undefined) !== (operationalSliceId === undefined)) {
    throw configurationError('Nokia slice ID and gateway NAI must be configured together');
  }
  return {
    baseUrl: baseUrl!,
    apiKey: apiKey!,
    rapidapiHost,
    accessToken,
    operatorPhone: operatorPhone!,
    backupPhone: backupPhone!,
    gatewayNai,
    backupIpv4,
    appServerIpv4: appServerIpv4!,
    operationalSliceId,
    geofence: { latitude: latitude!, longitude: longitude!, radiusMeters: radiusMeters! },
  };
}

function llmCredentials(environment: z.infer<typeof EnvironmentSchema>): LlmCredentials | null {
  if (environment.HISN_AGENT_PROVIDER === 'DETERMINISTIC') return null;
  const entries = [
    environment.HISN_LLM_BASE_URL,
    environment.HISN_LLM_API_KEY,
    environment.HISN_LLM_MODEL,
  ];
  if (entries.every((entry) => entry === undefined)) {
    if (environment.HISN_AGENT_PROVIDER === 'GROQ')
      throw configurationError('HISN_AGENT_PROVIDER=GROQ requires all HISN_LLM_* values');
    return null;
  }
  if (entries.some((entry) => entry === undefined))
    throw configurationError('All HISN_LLM_* values must be set together');
  return { baseUrl: entries[0]!, apiKey: entries[1]!, model: entries[2]! };
}

function assertLiveConfiguration(mode: RuntimeMode, credentials: NacCredentials | null): void {
  if (mode === 'LIVE' && credentials === null) {
    throw configurationError('LIVE mode requires all Nokia Network as Code configuration');
  }
}

function configurationError(message: string, context: unknown = {}): HisnError {
  return new HisnError('CONFIGURATION_INVALID', message, 500, { validation: context });
}
