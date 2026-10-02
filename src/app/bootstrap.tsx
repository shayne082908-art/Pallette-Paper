import { createRoot } from 'react-dom/client';
import { loadAppConfig } from '../config/appConfig';
import { BrowserLocalStorageDriver } from '../persistence/browserLocalStorageDriver';
import { VersionedPersistence } from '../persistence/persistence';
import { DevelopmentShell } from '../ui/DevelopmentShell';
import { ApplicationStateStore } from './applicationState';
import { initializeApplication } from './initializeApplication';

export function bootstrapApplication(rootElement: HTMLElement): void {
  const config = loadAppConfig(import.meta.env);
  document.title = config.title;
  const state = new ApplicationStateStore();
  const persistence = new VersionedPersistence(
    new BrowserLocalStorageDriver(),
    config.persistenceSchemaVersion,
  );
  const initialization = initializeApplication(state, persistence);

  createRoot(rootElement).render(
    <DevelopmentShell config={config} state={state} initialization={initialization} />,
  );
}
