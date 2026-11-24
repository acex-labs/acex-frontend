import { apiFetch } from './client.js'

// Measured when asked, every node in scope on each call, so callers cache it for a while.
export const COMPLIANCE_STALE_TIME = 5 * 60_000

// The whole installation: a summary in total, per site and per region; each with a section per compliance type.
export const fetchComplianceOverview = () => apiFetch('/api/v1/compliance')

// The cache key of the list of assets against the software policy (see fetchSoftwareAssets). A change to the policy
// invalidates it, so the list asks again. Not all of ['compliance']: the overview is the server's last measurement,
// so asking for it before the next one returns the same.
export const SOFTWARE_ASSETS_KEY = ['compliance', 'software-assets']

// A page of the assets of every node, each against the software policy. Read live from the inventory and the policy
// (never a node's configuration), so it is current whenever it is asked for; the browser keeps it for the default
// stale time, and a change to the policy asks again. `status` may be several; `q` is one search text; `site` and
// `region` are whole names. `status_counts` says how many assets each status has among those every other filter
// matches.
export const fetchSoftwareAssets = ({ status = [], q, site, region, sort, order, limit, offset } = {}) => {
  const qs = new URLSearchParams()
  for (const s of status) qs.append('status', s)
  for (const [k, v] of Object.entries({ q, site, region, sort, order, limit, offset })) {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v)
  }
  return apiFetch(`/api/v1/compliance/software/assets?${qs}`)
}

// Compliance of every node at a site, plus a summary over the site; each with a section per compliance type.
export const fetchSiteCompliance = siteName =>
  apiFetch(`/api/v1/compliance/sites/${encodeURIComponent(siteName)}`)
