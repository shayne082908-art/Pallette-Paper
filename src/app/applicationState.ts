import type { Unsubscribe } from '../core/subscription';

export type ApplicationMode = 'booting' | 'ready' | 'error';

export interface ApplicationState {
  readonly mode: ApplicationMode;
}

type StateListener = (state: ApplicationState) => void;

const allowedTransitions: Readonly<Record<ApplicationMode, readonly ApplicationMode[]>> = {
  booting: ['ready', 'error'],
  ready: ['booting', 'error'],
  error: ['booting'],
};

export class ApplicationStateStore {
  private state: ApplicationState = Object.freeze({ mode: 'booting' });
  private readonly listeners = new Set<StateListener>();

  getSnapshot = (): ApplicationState => this.state;

  subscribe = (listener: StateListener): Unsubscribe => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  transition(nextMode: ApplicationMode): void {
    if (nextMode === this.state.mode) {
      return;
    }

    if (!allowedTransitions[this.state.mode].includes(nextMode)) {
      throw new Error(`Invalid application state transition: ${this.state.mode} -> ${nextMode}`);
    }

    this.state = Object.freeze({ mode: nextMode });
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
