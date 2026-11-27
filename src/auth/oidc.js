import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

let _userManager = null

export function initUserManager({ authority, clientId }) {
  _userManager = new UserManager({
    authority,
    client_id: clientId,
    redirect_uri: window.location.origin + '/',
    post_logout_redirect_uri: window.location.origin + '/',
    response_type: 'code',
    scope: 'openid profile email',
    automaticSilentRenew: true,
    stateStore: new WebStorageStateStore({ store: window.localStorage }),
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  })
  return _userManager
}

export function getUserManager() {
  return _userManager
}

// The page login() remembers, to come back to after signing in. Never an OIDC
// callback URL (?code=...&state=..., or ?error=...&state=...): when a callback
// fails its URL stays in the address bar, and remembering it would make every
// retry carry the previous URL inside its own state, one level deeper each time,
// until nginx answers 414 Request-URI Too Large.
export function loginReturnPath() {
  const { pathname, search, hash } = window.location
  const q = new URLSearchParams(search)
  if (q.has('state') && (q.has('code') || q.has('error'))) return '/'
  return pathname + search + hash
}

// Where to go after the login callback: the page the user was on when login was
// started. Only a path on this site is accepted ("/x", never "//host" or a URL).
export function safeReturnPath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : '/'
}
