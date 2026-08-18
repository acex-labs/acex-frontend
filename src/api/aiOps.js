import { apiFetch } from './client.js'

/**
 * AI Ops discovery: providers, their models (with metadata) and per-task
 * failover chains. Fetched once at app level; the model picker pre-selects
 * the first level of the "chat" (or "default") chain.
 */
export const fetchAiProviders = () => apiFetch('/api/v1/ai_ops/providers')

export const fetchAiModels = (provider, refresh = false) =>
  apiFetch(`/api/v1/ai_ops/models?provider=${encodeURIComponent(provider)}${refresh ? '&refresh=true' : ''}`)
