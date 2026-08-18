import crypto from 'node:crypto';
import { createLogger } from '@footballterror/logger';
import type { Provenance, IngestionRecord } from '@footballterror/football-schema';

const log = createLogger('provenance');

/** Hash raw data for auditability */
export function hashPayload(data: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/** Create a provenance record */
export function createProvenance(opts: {
  provider: string;
  providerId: string;
  rawPayload?: unknown;
  normalizedVersion?: string;
  ingestionVersion?: string;
}): Provenance {
  return {
    provider: opts.provider,
    providerId: opts.providerId,
    retrievedAt: new Date(),
    rawPayloadHash: opts.rawPayload ? hashPayload(opts.rawPayload) : undefined,
    normalizedVersion: opts.normalizedVersion ?? '0.1.0',
    ingestionVersion: opts.ingestionVersion ?? '0.1.0',
  };
}

/** In-memory provenance log for a single ingestion run */
export class ProvenanceTracker {
  private records: IngestionRecord[] = [];

  record(opts: {
    provider: string;
    providerId: string;
    entityType: string;
    internalId: string;
    status: 'raw' | 'normalized' | 'stored' | 'failed';
    rawPayloadHash?: string;
    normalizedVersion?: string;
    error?: string;
  }): void {
    this.records.push({
      id: `ing:${opts.provider}:${opts.providerId}:${Date.now()}`,
      ...opts,
      normalizedVersion: opts.normalizedVersion ?? '0.1.0',
      ingestedAt: new Date(),
    });
    log.debug({ provider: opts.provider, providerId: opts.providerId, status: opts.status }, 'provenance recorded');
  }

  recordSuccess(opts: {
    provider: string;
    providerId: string;
    entityType: string;
    internalId: string;
    rawPayloadHash?: string;
    normalizedVersion?: string;
  }): void {
    this.record({ ...opts, status: 'stored' });
  }

  recordFailure(opts: {
    provider: string;
    providerId: string;
    entityType: string;
    error: string;
  }): void {
    this.record({ ...opts, internalId: '', status: 'failed' });
  }

  getRecords(): IngestionRecord[] {
    return this.records;
  }

  getStats(): { total: number; stored: number; failed: number } {
    const stored = this.records.filter((r) => r.status === 'stored').length;
    const failed = this.records.filter((r) => r.status === 'failed').length;
    return { total: this.records.length, stored, failed };
  }

  reset(): void {
    this.records = [];
  }
}
