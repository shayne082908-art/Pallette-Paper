export interface AppEnvironment {
  readonly DEV?: boolean;
  readonly VITE_BUILD_ID?: string;
}

export interface AppConfig {
  readonly title: string;
  readonly buildId: string;
  readonly persistenceSchemaVersion: number;
  readonly debugMode: boolean;
}

const APP_TITLE = 'Palette & Paper';
const PERSISTENCE_SCHEMA_VERSION = 1;

export function loadAppConfig(environment: AppEnvironment): AppConfig {
  const explicitBuildId = environment.VITE_BUILD_ID?.trim();

  return Object.freeze({
    title: APP_TITLE,
    buildId: explicitBuildId || (environment.DEV ? 'development' : 'production'),
    persistenceSchemaVersion: PERSISTENCE_SCHEMA_VERSION,
    debugMode: environment.DEV === true,
  });
}
