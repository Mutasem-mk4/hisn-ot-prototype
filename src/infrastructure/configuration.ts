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

const EnvironmentSchema = z
  .object({
    HISN_MODE: RuntimeModeSchema.default('DEMO'),
    HISN_PORT: z.coerce.number().int().min(1024).max(65_535).default(4310),
    HISN_DATABASE_PATH: z.string().default('./var/hisn-ot.db'),
    HISN_POLICY_PATH: z.string().default('./config/policy.v1.json'),
    HISN_SCENARIO_PATH: z.string().default('./config/scenarios.v1.json'),
    HISN_LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    NOKIA_NAC_BASE_URL: z.string().url().optional(),
    NOKIA_NAC_API_KEY: z.string().min(8).optional(),
    NOKIA_NAC_ACCESS_TOKEN: z.string().min(8).optional(),
    HISN_OPERATOR_PHONE: z
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
  accessToken: string;
  operatorPhone: string;
  gatewayNai: string;
  backupIpv4: string;
  appServerIpv4: string;
  operationalSliceId: string;
  geofence: { latitude: number; longitude: number; radiusMeters: number };
};

export type LlmCredentials = { baseUrl: string; apiKey: string; model: string };

export type AppConfiguration = {
  mode: RuntimeMode;
  port: number;
  databasePath: string;
  logLevel: z.infer<typeof EnvironmentSchema>['HISN_LOG_LEVEL'];
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
  assertLiveConfiguration(parsedEnvironment.HISN_MODE, nac);
  return {
    mode: parsedEnvironment.HISN_MODE,
    port: parsedEnvironment.HISN_PORT,
    databasePath: resolve(workingDirectory, parsedEnvironment.HISN_DATABASE_PATH),
    logLevel: parsedEnvironment.HISN_LOG_LEVEL,
    policy,
    scenarios: scenariosFile.scenarios,
    nac,
    llm: llmCredentials(parsedEnvironment),
  };
}

function parseEnvironment(environment: NodeJS.ProcessEnv) {
  const relevantEntries = Object.fromEntries(
    Object.entries(environment).filter(
      ([key]) => key.startsWith('HISN_') || key.startsWith('NOKIA_'),
    ),
  );
  const parsed = EnvironmentSchema.safeParse(relevantEntries);
  if (!parsed.success)
    throw configurationError('Environment validation failed', parsed.error.flatten());
  return parsed.data;
}

function readJson<T>(path: string, workingDirectory: string, schema: z.ZodType<T>): T {
  const resolvedPath = resolve(workingDirectory, path);
  const parsed = schema.safeParse(JSON.parse(readFileSync(resolvedPath, 'utf8')));
  if (!parsed.success)
    throw configurationError(`Configuration validation failed for ${path}`, parsed.error.flatten());
  return parsed.data;
}

function nacCredentials(environment: z.infer<typeof EnvironmentSchema>): NacCredentials | null {
  const {
    NOKIA_NAC_BASE_URL: baseUrl,
    NOKIA_NAC_API_KEY: apiKey,
    NOKIA_NAC_ACCESS_TOKEN: accessToken,
    HISN_OPERATOR_PHONE: operatorPhone,
    HISN_GATEWAY_NAI: gatewayNai,
    HISN_BACKUP_IPV4: backupIpv4,
    HISN_APP_SERVER_IPV4: appServerIpv4,
    HISN_OPERATIONAL_SLICE_ID: operationalSliceId,
    HISN_GEOFENCE_LATITUDE: latitude,
    HISN_GEOFENCE_LONGITUDE: longitude,
    HISN_GEOFENCE_RADIUS_METERS: radiusMeters,
  } = environment;
  if (
    baseUrl === undefined ||
    apiKey === undefined ||
    accessToken === undefined ||
    operatorPhone === undefined ||
    gatewayNai === undefined ||
    backupIpv4 === undefined ||
    appServerIpv4 === undefined ||
    operationalSliceId === undefined ||
    latitude === undefined ||
    longitude === undefined ||
    radiusMeters === undefined
  ) {
    return null;
  }
  return {
    baseUrl,
    apiKey,
    accessToken,
    operatorPhone,
    gatewayNai,
    backupIpv4,
    appServerIpv4,
    operationalSliceId,
    geofence: { latitude, longitude, radiusMeters },
  };
}

function llmCredentials(environment: z.infer<typeof EnvironmentSchema>): LlmCredentials | null {
  const entries = [
    environment.HISN_LLM_BASE_URL,
    environment.HISN_LLM_API_KEY,
    environment.HISN_LLM_MODEL,
  ];
  if (entries.every((entry) => entry === undefined)) return null;
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
