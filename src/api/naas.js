import { NAAS_API_URL } from '../config.js'

async function naasFetch(path, options = {}) {
  const res = await fetch(`${NAAS_API_URL}/v1${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (res.status === 204) return null
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error || `NaaS API error ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

export const fetchWorkspaces = () => naasFetch('/workspaces')
export const fetchWorkspace  = (name) => naasFetch(`/workspaces/${name}`)
export const createWorkspace = ({ name, owner }) =>
  naasFetch('/workspaces', { method: 'POST', body: JSON.stringify({ name, owner }) })
export const updateWorkspace = (name, { owner }) =>
  naasFetch(`/workspaces/${name}`, { method: 'PATCH', body: JSON.stringify({ owner }) })
export const deleteWorkspace = (name) =>
  naasFetch(`/workspaces/${name}`, { method: 'DELETE' })

export const fetchCustomers = () => naasFetch('/customers')
export const fetchCustomer  = (name) => naasFetch(`/customers/${name}`)
export const createCustomer = ({ name, active = true }) =>
  naasFetch('/customers', { method: 'POST', body: JSON.stringify({ name, active }) })
export const updateCustomer = (name, { active }) =>
  naasFetch(`/customers/${name}`, { method: 'PATCH', body: JSON.stringify({ active }) })
export const deleteCustomer = (name) =>
  naasFetch(`/customers/${name}`, { method: 'DELETE' })
