import { API_URL } from './config.js'

// Other backends this deployment has, and where they are. The ACEX backend is
// the only thing the frontend is configured with; it hands these out from
// GET /api/v1/services (ACEX_SERVICES_<SERVICE>_URL there). Loaded once in
// main.jsx before the app renders, so they can be read synchronously after.
//
//   { samruai: { url: 'https://samruai.example.net' } }
let _services = {}

export async function loadServices() {
  try {
    const res = await fetch(`${API_URL}/api/v1/services`)
    // A backend from before services were listed answers 404: show none of them.
    _services = res.ok ? await res.json() : {}
  } catch (err) {
    // The app still works without them; only their modules are hidden.
    console.error('Could not fetch services:', err.message)
    _services = {}
  }
}

export const hasService = (name) => Boolean(_services[name]?.url)

export const serviceUrl = (name) => _services[name]?.url ?? null

export const serviceUrls = () => Object.values(_services).map(s => s?.url).filter(Boolean)
