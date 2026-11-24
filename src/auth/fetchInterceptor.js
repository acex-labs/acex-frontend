import { API_URL, NAAS_API_URL } from '../config'
import { serviceUrls } from '../services'
import { getUserManager } from './oidc'

// Whether `url` is on `base`: the same origin and under its path. Compared as
// parsed URLs, not string prefixes, so that https://api.example.net does not
// also match https://api.example.net.attacker.com.
function isUnder(url, base) {
  try {
    const u = new URL(url, window.location.href)
    const b = new URL(base, window.location.href)
    if (u.origin !== b.origin) return false
    const prefix = b.pathname.replace(/\/$/, '')
    return prefix === '' || u.pathname === prefix || u.pathname.startsWith(`${prefix}/`)
  } catch {
    return false
  }
}

// The user's token goes only to ACEX and to the services ACEX names.
const isTrusted = (url) => [API_URL, NAAS_API_URL, ...serviceUrls()].some(base => isUnder(url, base))

export function installFetchInterceptor() {
  const _fetch = window.fetch.bind(window)

  window.fetch = async (input, init = {}) => {
    const url = input instanceof Request ? input.url : String(input)

    if (isTrusted(url)) {
      const um = getUserManager()
      if (um) {
        const user = await um.getUser()
        const token = user?.access_token
        if (token) {
          if (input instanceof Request) {
            input = new Request(input, {
              headers: {
                ...Object.fromEntries(input.headers.entries()),
                Authorization: `Bearer ${token}`,
              },
            })
          } else {
            init = {
              ...init,
              headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
            }
          }
        }
      }
    }

    return _fetch(input, init)
  }
}
