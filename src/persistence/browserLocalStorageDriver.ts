import type { StorageDriver } from './persistence';

const PROBE_KEY = 'palette-and-paper:storage-probe';

export class BrowserLocalStorageDriver implements StorageDriver {
  constructor(private readonly storage: Storage = globalThis.localStorage) {}

  isAvailable(): boolean {
    try {
      this.storage.setItem(PROBE_KEY, '1');
      this.storage.removeItem(PROBE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }
}
