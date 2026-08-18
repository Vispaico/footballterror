export interface Provenance {
  provider: string;
  providerId: string;
  retrievedAt: Date;
  originalTimestamp?: Date;
  rawPayloadHash?: string;
  rawPayloadRef?: string;
  normalizedVersion: string;
  ingestionVersion: string;
}

export interface IngestionRecord {
  id: string;
  provider: string;
  providerId: string;
  entityType: string;
  internalId: string;
  status: 'raw' | 'normalized' | 'stored' | 'failed';
  rawPayloadHash?: string;
  rawPayloadRef?: string;
  normalizedVersion: string;
  ingestedAt: Date;
  error?: string;
}
