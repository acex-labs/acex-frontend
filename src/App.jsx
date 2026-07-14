import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './auth/RequireAuth'
import DashboardPage from './pages/DashboardPage'
import NodesPage from './pages/network/NodesPage'
import NodePage from './pages/network/NodePage'
import SitesPage from './pages/network/SitesPage'
import SitePage from './pages/network/SitePage'
import RegionsPage from './pages/network/RegionsPage'
import LogicalNodesPage from './pages/network/LogicalNodesPage'
import AssetsPage from './pages/network/AssetsPage'
import ContactsPage from './pages/network/ContactsPage'
import ContactPage from './pages/network/ContactPage'
import NEDsPage from './pages/network/NEDsPage'
import CredentialsPage from './pages/settings/CredentialsPage'
import ConfigMapsPage from './pages/configs/ConfigMapsPage'
import TranslatorPage from './pages/configs/TranslatorPage'
import TelemetryAgentsPage from './pages/settings/TelemetryAgentsPage'
import CollectionAgentsPage from './pages/settings/CollectionAgentsPage'

function Placeholder({ title }) {
  return (
    <div className="p-8">
      <h2 className="text-lg font-semibold text-content">{title}</h2>
      <p className="mt-1 text-sm text-subtle">Coming soon.</p>
    </div>
  )
}

import { AiProvider } from './context/AiContext'

export default function App() {
  return (
    <RequireAuth>
      <AiProvider>
      <Layout>
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
      </Layout>
      </AiProvider>
    </RequireAuth>
  )
}
