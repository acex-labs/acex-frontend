import { apiFetch } from './client.js'

export const SEARCH_MIN_LENGTH = 2

export const searchInventory = (q, limit = 5) =>
  apiFetch(`/api/v1/search?${new URLSearchParams({ q, limit })}`)
