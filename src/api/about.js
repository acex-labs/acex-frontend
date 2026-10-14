import { apiFetch } from './client.js'

export const fetchAbout = () => apiFetch('/api/v1/health/about')