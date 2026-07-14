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
