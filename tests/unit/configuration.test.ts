import { describe, expect, it } from 'vitest';
import { loadConfiguration } from '../../src/infrastructure/configuration.js';

describe('runtime-mode configuration', () => {
  it('starts DEMO without external credentials', () => {
    const configuration = loadConfiguration({ HISN_MODE: 'DEMO' }, process.cwd());
    expect(configuration.mode).toBe('DEMO');
    expect(configuration.nac).toBeNull();
  });

  it('refuses LIVE startup when Nokia configuration is incomplete', () => {
    expect(() => loadConfiguration({ HISN_MODE: 'LIVE' }, process.cwd())).toThrow(
      'LIVE mode requires all Nokia Network as Code configuration',
    );
  });
});
