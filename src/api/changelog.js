import { apiFetch } from './client.js'

export const fetchChangelog = () => apiFetch('/api/v1/changelog')