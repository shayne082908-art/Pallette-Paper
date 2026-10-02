import { useSyncExternalStore } from 'react';
import type { AppConfig } from '../config/appConfig';
import type { ApplicationStateStore } from '../app/applicationState';
import type { InitializationReport } from '../app/initializeApplication';
import { DebugPanel } from '../debug/DebugPanel';

interface DevelopmentShellProps {
  readonly config: AppConfig;
  readonly state: ApplicationStateStore;
  readonly initialization: InitializationReport;
}

export function DevelopmentShell({ config, state, initialization }: DevelopmentShellProps) {
  const applicationState = useSyncExternalStore(state.subscribe, state.getSnapshot, state.getSnapshot);

  return (
    <main className="development-shell">
      <section className="status-card" aria-labelledby="project-title">
        <p className="eyebrow">Technical foundation</p>
        <h1 id="project-title">{config.title}</h1>
        <dl>
          <div><dt>Build</dt><dd>{config.buildId}</dd></div>
          <div><dt>Initialization</dt><dd>{initialization.status}</dd></div>
          <div><dt>Application state</dt><dd>{applicationState.mode}</dd></div>
        </dl>
      </section>
      <DebugPanel config={config} state={applicationState} initialization={initialization} />
    </main>
  );
}
