import type { AppConfig } from '../config/appConfig';
import type { ApplicationState } from '../app/applicationState';
import type { InitializationReport } from '../app/initializeApplication';

interface DebugPanelProps {
  readonly config: AppConfig;
  readonly state: ApplicationState;
  readonly initialization: InitializationReport;
}

export function DebugPanel({ config, state, initialization }: DebugPanelProps) {
  if (!config.debugMode) {
    return null;
  }

  return (
    <aside className="debug-panel" aria-label="Development diagnostics">
      <h2>Diagnostics</h2>
      <dl>
        <div><dt>Application state</dt><dd>{state.mode}</dd></div>
        <div><dt>Build</dt><dd>{config.buildId}</dd></div>
        <div><dt>Persistence</dt><dd>{initialization.persistenceAvailable ? 'available' : 'unavailable'}</dd></div>
        <div><dt>Environment</dt><dd>development</dd></div>
      </dl>
    </aside>
  );
}
