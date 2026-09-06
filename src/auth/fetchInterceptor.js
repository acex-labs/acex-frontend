import { API_URL } from '../config'
import { getUserManager } from './oidc'

export function installFetchInterceptor() {
  const _fetch = window.fetch.bind(window)

  window.fetch = async (input, init = {}) => {
    const url = input instanceof Request ? input.url : String(input)

    if (url.startsWith(API_URL)) {
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
