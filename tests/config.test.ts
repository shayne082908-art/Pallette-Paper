import { describe, expect, it } from 'vitest';
import { loadAppConfig } from '../src/config/appConfig';

describe('application configuration', () => {
  it('loads centralized defaults and explicit build metadata', () => {
    const config = loadAppConfig({ DEV: true, VITE_BUILD_ID: 'build-01-test' });

    expect(config).toEqual({
      title: 'Palette & Paper',
      buildId: 'build-01-test',
      persistenceSchemaVersion: 1,
      debugMode: true,
    });
  });

  it('falls back to an environment-derived build identifier', () => {
    expect(loadAppConfig({ DEV: false }).buildId).toBe('production');
  });
});
