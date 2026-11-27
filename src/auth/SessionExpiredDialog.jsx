import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from './AuthContext'

// Shown over the whole app when the session has expired while the page was open
// and could not be renewed (sessionExpired in AuthContext). The app behind it is
// made inert, so the one thing to do is sign in again, which brings the user back
// to this page (login() keeps it as url_state).
export default function SessionExpiredDialog() {
  const { sessionExpired, login } = useAuth()
  const button = useRef(null)

  useEffect(() => {
    if (!sessionExpired) return
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    button.current?.focus()
    return () => root?.removeAttribute('inert')
  }, [sessionExpired])

  if (!sessionExpired) return null

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        aria-describedby="session-expired-text"
        // Nothing else can take focus, so Tab stays on the button.
        onKeyDown={e => {
          if (e.key === 'Tab') {
            e.preventDefault()
            button.current?.focus()
          }
        }}
        className="w-full max-w-sm rounded-xl border border-edge bg-surface p-6 shadow-2xl"
      >
        <h2 id="session-expired-title" className="text-base font-semibold text-heading">
          Your session has expired
        </h2>
        <p id="session-expired-text" className="mt-2 text-sm text-subtle">
          Sign in again to continue. You will come back to this page.
        </p>
        <button
          ref={button}
          type="button"
          onClick={() => login()}
          className="mt-5 w-full rounded bg-brand px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-surface"
        >
          Sign in again
        </button>
      </div>
    </div>,
    document.body,
  )
}
