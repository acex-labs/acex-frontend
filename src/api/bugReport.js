import { apiFetch } from './client.js'

export async function submitBugReport(payload) {
  return apiFetch('/api/v1/bug-reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
