import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './auth/RequireAuth'
import { AiProvider } from './context/AiContext'
import { ThemeProvider } from './context/ThemeContext'
import { AdminProvider } from './context/AdminContext'
import { MODULES } from './modules'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))

function Placeholder({ title }) {
  return (
    <div className="p-8">
      <h2 className="text-lg font-semibold text-content">{title}</h2>
      <p className="mt-1 text-sm text-subtle">Coming soon.</p>
    </div>
  )
}

// Build route elements from all registered modules
const moduleRoutes = MODULES.flatMap(m =>
  m.routes.map(r => ({
    path: r.path,
    element: r.load
      ? lazy(r.load)
      : () => <Placeholder title={r.placeholder ?? r.path} />,
  }))
)

export default function App() {
  return (
    <RequireAuth>
      <ThemeProvider>
      <AdminProvider>
      <AiProvider>
      <Layout>
      <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        {moduleRoutes.map(({ path, element: Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
      </Routes>
      </Suspense>
      </Layout>
      </AiProvider>
      </AdminProvider>
      </ThemeProvider>
    </RequireAuth>
  )
}
