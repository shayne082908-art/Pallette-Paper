import { describe, expect, it, vi } from 'vitest';
import { ApplicationStateStore } from '../src/app/applicationState';

describe('ApplicationStateStore', () => {
  it('represents and publishes broad application state transitions', () => {
    const store = new ApplicationStateStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.transition('ready');

    expect(store.getSnapshot()).toEqual({ mode: 'ready' });
    expect(listener).toHaveBeenCalledWith({ mode: 'ready' });
  });

  it('rejects invalid transitions', () => {
    const store = new ApplicationStateStore();
    store.transition('error');

    expect(() => store.transition('ready')).toThrow(/Invalid application state transition/);
  });
});
