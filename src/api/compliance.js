import { apiFetch } from './client.js'

// Compliance of every node at a site, and a summary over the site. Each has a section per type, so the
// configuration compliance is under `configuration`, next to `software`.
export const fetchSiteCompliance = siteName =>
  apiFetch(`/api/v1/compliance/sites/${encodeURIComponent(siteName)}`)
