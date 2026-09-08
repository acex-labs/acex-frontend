export const API_URL        = window.RUNTIME_CONFIG?.API_URL        || import.meta.env.VITE_API_URL        || 'http://localhost:8080'
export const NAAS_API_URL   = window.RUNTIME_CONFIG?.NAAS_API_URL   || import.meta.env.VITE_NAAS_API_URL   || 'http://localhost:8081'
export const GRAFANA_URL    = window.RUNTIME_CONFIG?.GRAFANA_URL    || import.meta.env.VITE_GRAFANA_URL    || 'http://localhost:3001'
export const NAAS_ADMIN_URL = window.RUNTIME_CONFIG?.NAAS_ADMIN_URL || import.meta.env.VITE_NAAS_ADMIN_URL || ''
