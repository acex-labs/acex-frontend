import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './auth/RequireAuth'
import { AiProvider } from './context/AiContext'
import { ThemeProvider } from './context/ThemeContext'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const NodesPage = lazy(() => import('./pages/network/NodesPage'))
const NodePage = lazy(() => import('./pages/network/NodePage'))
const SitesPage = lazy(() => import('./pages/network/SitesPage'))
const SitePage = lazy(() => import('./pages/network/SitePage'))
const RegionsPage = lazy(() => import('./pages/network/RegionsPage'))
const LogicalNodesPage = lazy(() => import('./pages/network/LogicalNodesPage'))
const AssetsPage = lazy(() => import('./pages/network/AssetsPage'))
const ContactsPage = lazy(() => import('./pages/network/ContactsPage'))
const ContactPage = lazy(() => import('./pages/network/ContactPage'))
const NEDsPage = lazy(() => import('./pages/network/NEDsPage'))
const CredentialsPage = lazy(() => import('./pages/settings/CredentialsPage'))
const ConfigMapsPage = lazy(() => import('./pages/configs/ConfigMapsPage'))
const TranslatorPage = lazy(() => import('./pages/configs/TranslatorPage'))
const TelemetryAgentsPage = lazy(() => import('./pages/settings/TelemetryAgentsPage'))
const CollectionAgentsPage = lazy(() => import('./pages/settings/CollectionAgentsPage'))

function Placeholder({ title }) {
  return (
    <div className="p-8">
      <h2 className="text-lg font-semibold text-content">{title}</h2>
      <p className="mt-1 text-sm text-subtle">Coming soon.</p>
    </div>
  )
}

export default function App() {
  return (
    <RequireAuth>
      <ThemeProvider>
      <AiProvider>
      <Layout>
      <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />

        <Route path="/network/nodes" element={<NodesPage />} />
        <Route path="/network/nodes/:id" element={<NodePage />} />
        <Route path="/network/sites" element={<SitesPage />} />
        <Route path="/network/sites/:id" element={<SitePage />} />
        <Route path="/network/regions" element={<RegionsPage />} />
        <Route path="/network/logical-nodes" element={<LogicalNodesPage />} />
        <Route path="/network/assets" element={<AssetsPage />} />
        <Route path="/network/contacts" element={<ContactsPage />} />
        <Route path="/network/contacts/:id" element={<ContactPage />} />
        <Route path="/configs/neds" element={<NEDsPage />} />

        <Route path="/configs/config-maps" element={<ConfigMapsPage />} />
        <Route path="/configs/translator" element={<TranslatorPage />} />
        <Route path="/network/import" element={<Placeholder title="Import" />} />
        <Route path="/configs/drivers" element={<Placeholder title="Drivers" />} />

        <Route path="/operations/workflows" element={<Placeholder title="Workflows" />} />
        <Route path="/operations/bulk-actions" element={<Placeholder title="Bulk Actions" />} />
        <Route path="/operations/triggers" element={<Placeholder title="Triggers" />} />
        <Route path="/operations/scheduled" element={<Placeholder title="Scheduled" />} />

        <Route path="/observe/icmp" element={<Placeholder title="ICMP" />} />
        <Route path="/observe/telemetry" element={<Placeholder title="Telemetry" />} />
        <Route path="/observe/dashboards" element={<Placeholder title="Dashboards" />} />
        <Route path="/observe/config-history" element={<Placeholder title="Config History" />} />

        <Route path="/autopilot/ai-ops" element={<Placeholder title="AI Ops" />} />
        <Route path="/autopilot/agents" element={<Placeholder title="Agents" />} />

        <Route path="/settings/credentials" element={<CredentialsPage />} />
        <Route path="/settings/telemetry-agents" element={<TelemetryAgentsPage />} />
        <Route path="/settings/collection-agents" element={<CollectionAgentsPage />} />
        <Route path="/settings/about" element={<Placeholder title="About" />} />
      </Routes>
      </Suspense>
      </Layout>
      </AiProvider>
      </ThemeProvider>
    </RequireAuth>
  )
}
