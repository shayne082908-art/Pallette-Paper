export interface StorageDriver {
  isAvailable(): boolean;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type PersistenceReadResult<T> =
  | { readonly status: 'ok'; readonly value: T }
  | { readonly status: 'missing' }
  | { readonly status: 'version-mismatch'; readonly storedVersion: number }
  | { readonly status: 'invalid' };

interface PersistenceEnvelope<T> {
  readonly schemaVersion: number;
  readonly value: T;
}

export class VersionedPersistence {
  constructor(
    private readonly driver: StorageDriver,
    private readonly schemaVersion: number,
    private readonly namespace = 'palette-and-paper:app',
  ) {}

  isAvailable(): boolean {
    return this.driver.isAvailable();
  }

  write<T>(key: string, value: T): boolean {
    try {
      const envelope: PersistenceEnvelope<T> = {
        schemaVersion: this.schemaVersion,
        value,
      };
      this.driver.setItem(this.storageKey(key), JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }

  read<T>(key: string): PersistenceReadResult<T> {
    try {
      const raw = this.driver.getItem(this.storageKey(key));
      if (raw === null) {
        return { status: 'missing' };
      }

      const parsed: unknown = JSON.parse(raw);
      if (!isPersistenceEnvelope(parsed)) {
        return { status: 'invalid' };
      }

      if (parsed.schemaVersion !== this.schemaVersion) {
        return { status: 'version-mismatch', storedVersion: parsed.schemaVersion };
      }

      return { status: 'ok', value: parsed.value as T };
    } catch {
      return { status: 'invalid' };
    }
  }

  remove(key: string): boolean {
    try {
      this.driver.removeItem(this.storageKey(key));
      return true;
    } catch {
      return false;
    }
  }

  private storageKey(key: string): string {
    return `${this.namespace}:${key}`;
  }
}

function isPersistenceEnvelope(value: unknown): value is PersistenceEnvelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    typeof value.schemaVersion === 'number' &&
    'value' in value
  );
}
