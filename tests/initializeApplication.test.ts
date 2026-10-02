import { describe, expect, it } from 'vitest';
import { ApplicationStateStore } from '../src/app/applicationState';
import { initializeApplication } from '../src/app/initializeApplication';
import { VersionedPersistence } from '../src/persistence/persistence';
import { TestStorageDriver } from './testStorageDriver';

describe('initializeApplication', () => {
  it('initializes into ready state and creates the foundation record', () => {
    const state = new ApplicationStateStore();
    const persistence = new VersionedPersistence(new TestStorageDriver(), 1);

    const report = initializeApplication(state, persistence);

    expect(report).toEqual({
      status: 'initialized',
      persistenceAvailable: true,
      persistenceRecord: 'created',
    });
    expect(state.getSnapshot()).toEqual({ mode: 'ready' });
  });

  it('still initializes when browser persistence is unavailable', () => {
    const state = new ApplicationStateStore();
    const persistence = new VersionedPersistence(new TestStorageDriver(false), 1);

    expect(initializeApplication(state, persistence).persistenceRecord).toBe('unavailable');
    expect(state.getSnapshot().mode).toBe('ready');
  });
});
