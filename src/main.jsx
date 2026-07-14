import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { initUserManager, getUserManager } from './auth/oidc.js'
import { installFetchInterceptor } from './auth/fetchInterceptor.js'
import { API_URL } from './config.js'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

installFetchInterceptor()

function renderApp() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
}

async function bootstrap() {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/config`)
    const config = await res.json()

    if (config.enabled) {
      initUserManager({ authority: config.authority, clientId: config.client_id })

      const params = new URLSearchParams(window.location.search)
      if (params.has('code') && params.has('state')) {
        try {
          await getUserManager().signinRedirectCallback()
          window.history.replaceState({}, '', '/')
        } catch (err) {
          console.error('OIDC callback error:', err)
          await getUserManager().clearStaleState()
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch auth config, running without auth:', err.message)
  }

  renderApp()
}

bootstrap()
