import type { ApplicationStateStore } from './applicationState';
import type { VersionedPersistence } from '../persistence/persistence';

const FOUNDATION_RECORD_KEY = 'foundation';

interface FoundationRecord {
  readonly initialized: true;
}

export interface InitializationReport {
  readonly status: 'initialized' | 'failed';
  readonly persistenceAvailable: boolean;
  readonly persistenceRecord: 'available' | 'created' | 'unavailable' | 'invalid';
}

export function initializeApplication(
  state: ApplicationStateStore,
  persistence: VersionedPersistence,
): InitializationReport {
  const persistenceAvailable = persistence.isAvailable();

  if (!persistenceAvailable) {
    state.transition('ready');
    return {
      status: 'initialized',
      persistenceAvailable: false,
      persistenceRecord: 'unavailable',
    };
  }

  const existing = persistence.read<FoundationRecord>(FOUNDATION_RECORD_KEY);

  if (existing.status === 'missing') {
    const created = persistence.write<FoundationRecord>(FOUNDATION_RECORD_KEY, { initialized: true });
    if (!created) {
      state.transition('error');
      return {
        status: 'failed',
        persistenceAvailable: true,
        persistenceRecord: 'invalid',
      };
    }

    state.transition('ready');
    return {
      status: 'initialized',
      persistenceAvailable: true,
      persistenceRecord: 'created',
    };
  }

  if (existing.status !== 'ok' || existing.value.initialized !== true) {
    state.transition('error');
    return {
      status: 'failed',
      persistenceAvailable: true,
      persistenceRecord: 'invalid',
    };
  }

  state.transition('ready');
  return {
    status: 'initialized',
    persistenceAvailable: true,
    persistenceRecord: 'available',
  };
}
