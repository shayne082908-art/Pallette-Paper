import type { StorageDriver } from '../src/persistence/persistence';

export class TestStorageDriver implements StorageDriver {
  private readonly values = new Map<string, string>();

  constructor(private readonly available = true) {}

  isAvailable(): boolean {
    return this.available;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}
