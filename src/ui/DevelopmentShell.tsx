import { useState, useSyncExternalStore } from 'react';
import type { AppConfig } from '../config/appConfig';
import type { ApplicationStateStore } from '../app/applicationState';
import type { InitializationReport } from '../app/initializeApplication';
import { DebugPanel } from '../debug/DebugPanel';
import { DrawingLab } from './DrawingLab';
import { InputLab } from './InputLab';

interface DevelopmentShellProps {
  readonly config: AppConfig;
  readonly state: ApplicationStateStore;
  readonly initialization: InitializationReport;
}

type Workspace = 'drawing' | 'input';

export function DevelopmentShell({ config, state, initialization }: DevelopmentShellProps) {
  const applicationState = useSyncExternalStore(state.subscribe, state.getSnapshot, state.getSnapshot);
  const [workspace, setWorkspace] = useState<Workspace>('drawing');

  return (
    <main className="development-shell">
      <section className="status-card" aria-labelledby="project-title">
        <p className="eyebrow">Drawing-feel prototype</p>
        <h1 id="project-title">{config.title}</h1>
        <dl>
          <div><dt>Build</dt><dd>{config.buildId}</dd></div>
          <div><dt>Initialization</dt><dd>{initialization.status}</dd></div>
          <div><dt>Application state</dt><dd>{applicationState.mode}</dd></div>
        </dl>
      </section>

      <nav className="workspace-tabs" aria-label="Lab workspace">
        <button
          type="button"
          className={workspace === 'drawing' ? 'active-workspace' : ''}
          aria-pressed={workspace === 'drawing'}
          onClick={() => setWorkspace('drawing')}
        >
          Drawing Lab
        </button>
        <button
          type="button"
          className={workspace === 'input' ? 'active-workspace' : ''}
          aria-pressed={workspace === 'input'}
          onClick={() => setWorkspace('input')}
        >
          Input Lab
        </button>
      </nav>

      {workspace === 'drawing' ? <DrawingLab /> : <InputLab />}

      <DebugPanel config={config} state={applicationState} initialization={initialization} />
    </main>
  );
}
