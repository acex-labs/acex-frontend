import { apiFetch } from './client.js'

// Release notes of the backend and of every installed component that publishes
// them, plus planned work. Sections after the first are deployment-specific.
export const fetchChangelog = () => apiFetch('/api/v1/changelog')
