import { describe, expect, it } from 'vitest';
import { VersionedPersistence } from '../src/persistence/persistence';
import { TestStorageDriver } from './testStorageDriver';

describe('VersionedPersistence', () => {
  it('handles a missing record without throwing', () => {
    const persistence = new VersionedPersistence(new TestStorageDriver(), 1);

    expect(persistence.read('missing')).toEqual({ status: 'missing' });
  });

  it('round-trips versioned browser-local data', () => {
    const persistence = new VersionedPersistence(new TestStorageDriver(), 3);
    const value = { marker: 'foundation' };

    expect(persistence.write('smoke', value)).toBe(true);
    expect(persistence.read<typeof value>('smoke')).toEqual({ status: 'ok', value });
  });
});
