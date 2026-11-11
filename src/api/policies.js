import { apiFetch } from './client.js'

// Software policy: per vendor, or per hardware model (which beats the vendor's rule), the OS to run at a golden
// version and the older versions still accepted. 422 with a reason when a rule doesn't hold together (an OS the
// hardware doesn't run, a version the OS can't report), 409 when the vendor and model already have a rule.
export const fetchSoftwarePolicies = () => apiFetch('/api/v1/policies/software')

// The versions assets in the inventory report on the OS, newest first, each with how many assets run it: suggestions
// for what to approve. Without a hardware model, every model of the vendor.
export const fetchVersionsInUse = ({ vendor, os, hardware_model }) =>
  apiFetch(`/api/v1/policies/software/versions?${new URLSearchParams({ vendor, os, ...(hardware_model && { hardware_model }) })}`)

export const createSoftwarePolicy = rule =>
  apiFetch('/api/v1/policies/software', { method: 'POST', body: JSON.stringify(rule) })

// changes: any of the rule's fields; only those sent change, hardware_model null makes it the vendor's rule.
export const updateSoftwarePolicy = (id, changes) =>
  apiFetch(`/api/v1/policies/software/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })

export const deleteSoftwarePolicy = id => apiFetch(`/api/v1/policies/software/${id}`, { method: 'DELETE' })
