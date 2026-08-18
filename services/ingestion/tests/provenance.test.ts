/**
 * Provenance Tests
 */

import { describe, it, expect } from 'vitest';
import { hashPayload, createProvenance, ProvenanceTracker } from '../src/provenance/index.ts';

describe('hashPayload', () => {
  it('should produce consistent SHA-256 hashes', () => {
    const data = { foo: 'bar', num: 42 };
    const h1 = hashPayload(data);
    const h2 = hashPayload(data);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64); // SHA-256 hex
  });

  it('should produce different hashes for different data', () => {
    const h1 = hashPayload({ a: 1 });
    const h2 = hashPayload({ a: 2 });
    expect(h1).not.toBe(h2);
  });
});

describe('createProvenance', () => {
  it('should create a complete provenance record', () => {
    const prov = createProvenance({
      provider: 'statsbomb',
      providerId: '12345',
      rawPayload: { id: 12345 },
    });

    expect(prov.provider).toBe('statsbomb');
    expect(prov.providerId).toBe('12345');
    expect(prov.retrievedAt).toBeInstanceOf(Date);
    expect(prov.rawPayloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(prov.normalizedVersion).toBe('0.1.0');
    expect(prov.ingestionVersion).toBe('0.1.0');
  });
});

describe('ProvenanceTracker', () => {
  it('should track records', () => {
    const tracker = new ProvenanceTracker();

    tracker.recordSuccess({
      provider: 'statsbomb',
      providerId: '12345',
      entityType: 'competition',
      internalId: 'ft:statsbomb:12345',
    });

    const stats = tracker.getStats();
    expect(stats.total).toBe(1);
    expect(stats.stored).toBe(1);
    expect(stats.failed).toBe(0);
  });

  it('should track failures', () => {
    const tracker = new ProvenanceTracker();

    tracker.recordFailure({
      provider: 'statsbomb',
      providerId: '99999',
      entityType: 'fixture',
      error: 'Not found',
    });

    const stats = tracker.getStats();
    expect(stats.total).toBe(1);
    expect(stats.stored).toBe(0);
    expect(stats.failed).toBe(1);
  });

  it('should reset', () => {
    const tracker = new ProvenanceTracker();
    tracker.recordSuccess({
      provider: 'manual',
      providerId: '1',
      entityType: 'club',
      internalId: 'ft:manual:1',
    });

    tracker.reset();
    const stats = tracker.getStats();
    expect(stats.total).toBe(0);
  });
});
