// ============================================================
// NagarMitra AI — Library Barrel Exports
// Provides clean, unified entry points for types, store, services, and schemas
// ============================================================

export * from './types';
export * from './validations/schemas';
export * from './repositories/store';
export { apiClient, apiClient as api, NagarMitraApiClient } from './services/api-client';
