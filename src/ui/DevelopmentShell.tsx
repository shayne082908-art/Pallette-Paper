import { useState, useSyncExternalStore } from 'react';
import type { AppConfig } from '../config/appConfig';
import type { ApplicationStateStore } from '../app/applicationState';
import type { InitializationReport } from '../app/initializeApplication';
import { DebugPanel } from '../debug/DebugPanel';
import { DrawingLab } from './DrawingLab';
import { FirstSlice } from './FirstSlice';
import { InputLab } from './InputLab';

interface DevelopmentShellProps {
  readonly config: AppConfig;
  readonly state: ApplicationStateStore;
  readonly initialization: InitializationReport;
}

type Workspace = 'menu' | 'play' | 'drawing' | 'input';

export function DevelopmentShell({ config, state, initialization }: DevelopmentShellProps) {
  const applicationState = useSyncExternalStore(state.subscribe, state.getSnapshot, state.getSnapshot);
  const [workspace, setWorkspace] = useState<Workspace>('menu');
  const [playSession, setPlaySession] = useState(0);

  const startSlice = (): void => {
    setPlaySession((session) => session + 1);
    setWorkspace('play');
  };

  if (workspace === 'play') {
    return (
      <FirstSlice
        key={playSession}
        onReturnToDevelopmentMenu={() => setWorkspace('menu')}
      />
    );
  }

  return (
    <main className="development-shell">
      <section className="status-card" aria-labelledby="project-title">
        <p className="eyebrow">Build 04 tiny playable loop</p>
        <h1 id="project-title">{config.title}</h1>
        <dl>
          <div><dt>Build</dt><dd>{config.buildId}</dd></div>
          <div><dt>Initialization</dt><dd>{initialization.status}</dd></div>
          <div><dt>Application state</dt><dd>{applicationState.mode}</dd></div>
        </dl>
      </section>

      {workspace === 'menu' && (
        <section className="development-menu" aria-labelledby="development-menu-title">
          <div>
            <p className="eyebrow">Prototype menu</p>
            <h2 id="development-menu-title">Choose an experience</h2>
            <p>
              The first playable morning is separate from the technical drawing and input labs.
            </p>
          </div>
          <div className="development-menu-actions">
            <button className="play-slice-button" type="button" onClick={startSlice}>
              Play First Slice
            </button>
            <button type="button" onClick={() => setWorkspace('drawing')}>Drawing Lab</button>
            <button type="button" onClick={() => setWorkspace('input')}>Input Lab</button>
          </div>
        </section>
      )}

      {workspace !== 'menu' && (
        <nav className="workspace-tabs" aria-label="Development workspace">
          <button type="button" onClick={() => setWorkspace('menu')}>Menu</button>
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
      )}

      {workspace === 'drawing' && <DrawingLab />}
      {workspace === 'input' && <InputLab />}

      <DebugPanel config={config} state={applicationState} initialization={initialization} />
    </main>
  );
}
