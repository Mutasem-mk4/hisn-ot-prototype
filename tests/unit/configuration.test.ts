import { describe, expect, it } from 'vitest';
import { loadConfiguration } from '../../src/infrastructure/configuration.js';

describe('runtime-mode configuration', () => {
  it('starts DEMO without external credentials', () => {
    const configuration = loadConfiguration({ HISN_MODE: 'DEMO' }, process.cwd());
    expect(configuration.mode).toBe('DEMO');
    expect(configuration.nac).toBeNull();
    expect(configuration.sessionSecret).toHaveLength(64);
    expect(configuration.secureCookies).toBe(false);
  });

  it('refuses LIVE startup when Nokia configuration is incomplete', () => {
    expect(() =>
      loadConfiguration(
        {
          HISN_MODE: 'LIVE',
          HISN_SESSION_SECRET: 'test-session-signing-key-at-least-32-characters',
        },
        process.cwd(),
      ),
    ).toThrow('LIVE mode requires all Nokia Network as Code configuration');
  });

  it('requires a stable session secret when hosted on Vercel', () => {
    expect(() => loadConfiguration({ HISN_MODE: 'DEMO', VERCEL: '1' }, process.cwd())).toThrow(
      'HISN_SESSION_SECRET is required for hosted or LIVE operation',
    );
  });

  it('loads Nokia simulator configuration without a subscriber access token', () => {
    const configuration = loadConfiguration(
      {
        HISN_MODE: 'DEMO',
        HISN_NOKIA_SIMULATOR: 'true',
        NOKIA_NAC_BASE_URL: 'https://network-as-code.p-eu.rapidapi.com',
        NOKIA_NAC_API_KEY: 'test-api-key',
        HISN_OPERATOR_PHONE: '+99999991001',
        HISN_BACKUP_PHONE: '+99999991001',
        HISN_APP_SERVER_IPV4: '233.252.0.2',
        HISN_GEOFENCE_LATITUDE: '29.5267',
        HISN_GEOFENCE_LONGITUDE: '35.0078',
        HISN_GEOFENCE_RADIUS_METERS: '500',
      },
      process.cwd(),
    );

    expect(configuration.nokiaSimulatorEnabled).toBe(true);
    expect(configuration.nac?.accessToken).toBeUndefined();
    expect(configuration.nac?.rapidapiHost).toBe('network-as-code.nokia.rapidapi.com');
  });

  it('rejects an enabled Nokia simulator with incomplete connection settings', () => {
    expect(() =>
      loadConfiguration(
        {
          HISN_MODE: 'DEMO',
          HISN_NOKIA_SIMULATOR: 'true',
          NOKIA_NAC_BASE_URL: 'https://network-as-code.p-eu.rapidapi.com',
          NOKIA_NAC_API_KEY: 'test-api-key',
        },
        process.cwd(),
      ),
    ).toThrow('Nokia configuration requires');
  });
});
