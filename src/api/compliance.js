import { apiFetch } from './client.js'

// Measured when asked, every node in scope on each call, so callers cache it for a while.
export const COMPLIANCE_STALE_TIME = 5 * 60_000

// The whole installation: a summary in total, per site and per region; each with a section per compliance type.
export const fetchComplianceOverview = () => apiFetch('/api/v1/compliance')

// Compliance of every node at a site, plus a summary over the site; each with a section per compliance type.
export const fetchSiteCompliance = siteName =>
  apiFetch(`/api/v1/compliance/sites/${encodeURIComponent(siteName)}`)
