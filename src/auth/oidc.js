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

// Where to go after the login callback: the page the user was on when login was
// started. Only a path on this site is accepted ("/x", never "//host" or a URL).
export function safeReturnPath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : '/'
}
