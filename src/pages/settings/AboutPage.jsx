import { useQuery } from '@tanstack/react-query'

import { fetchAbout } from '../../api/about'
import { fetchCollectionAgents } from '../../api/inventory'
import { fetchTelemetryAgents } from '../../api/observability'
import { getAgentStatus, statusClasses, timeAgo } from '../../components/agents/agentUtils'
import PageHeader from '../../components/ui/PageHeader'
import pkg from '../../../package.json'

const FRONTEND_BUILD = import.meta.env.VITE_BUILD_ID || null
const FRONTEND_REF = import.meta.env.VITE_BUILD_REF || null

// The backend, its packages and the agents are all built from the acex repository.
const ACEX_REPO = 'https://github.com/acex-labs/acex'
const FRONTEND_REPO = 'https://github.com/acex-labs/acex-frontend'

// What a build is called. Development images are tagged dev-<commit>, so a dev build reads like its tag on GHCR
// and can be pasted into a manifest as it is. Any other build shows the commit.
function buildName(buildId, buildRef) {
  const commit = buildId.slice(0, 7)
  return buildRef === 'dev' ? `dev-${commit}` : commit
}

// The link opens the commit the image was built from.
function Build({ repo, buildId, buildRef }) {
  if (!buildId) return null
  return (
    <a
      href={`${repo}/commit/${buildId}`}
      target="_blank"
      rel="noreferrer"
      title={buildId}
      className="mr-2 px-1.5 py-0.5 rounded border border-edge text-[11px] font-mono text-subtle hover:text-content"
    >
      {buildName(buildId, buildRef)}
    </a>
  )
}

function Version({ version, repo, buildId, buildRef }) {
  return (
    <span className="text-[13px] font-mono text-content">
      <Build repo={repo} buildId={buildId} buildRef={buildRef} />
      {version}
    </span>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-edge last:border-0">
      <span className="text-[13px] text-subtle">{label}</span>
      {value}
    </div>
  )
}

function Section({ title, footer, children }) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle">{title}</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Build · Version</span>
      </div>

      <div className="rounded border border-edge px-4">{children}</div>
      {footer && <p className="mt-2 text-[11px] leading-relaxed text-subtle">{footer}</p>}
    </section>
  )
}

function CompareLink({ repo, buildId, children }) {
  return (
    <a href={`${repo}/compare/${buildId}...dev`} target="_blank" rel="noreferrer" className="underline hover:text-content">
      {children}
    </a>
  )
}

function AgentRow({ agent }) {
  const status = getAgentStatus(agent)
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-[13px] text-subtle truncate">{agent.name}</span>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusClasses(status.variant)}`}
          title={agent.acked_at ? `Last ack ${timeAgo(agent.acked_at)}` : undefined}
        >
          {status.label}
        </span>
      </span>
      {agent.agent_version
        ? <Version version={agent.agent_version} repo={ACEX_REPO} buildId={agent.build_id} buildRef={agent.build_ref} />
        : <span className="text-[12px] text-subtle">not reported</span>}
    </div>
  )
}

function AgentGroup({ title, agents }) {
  return (
    <div className="py-2 border-b border-edge last:border-0">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-subtle">{title}</div>
      {agents.length === 0
        ? <p className="py-1 text-[13px] text-subtle">None registered</p>
        : agents.map(agent => <AgentRow key={agent.id} agent={agent} />)}
    </div>
  )
}

export default function AboutPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['about'],
    queryFn: fetchAbout,
    staleTime: 300_000,
  })

  // The agents are a second look at the same page: if they cannot be read, the page still shows everything else.
  const { data: agents } = useQuery({
    queryKey: ['about-agents'],
    queryFn: () => Promise.all([fetchCollectionAgents({ limit: 100 }), fetchTelemetryAgents({ limit: 100 })]),
    staleTime: 30_000,
  })

  const packages = data?.packages ?? {}
  const drivers = data?.drivers ?? []
  const backendBuild = data?.build_id || null
  const backendRef = data?.build_ref || null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="About" description="Builds and versions of the ACEX stack components" />
      <div className="flex-1 overflow-auto px-6 py-4 max-w-xl">
        {isLoading && <p className="text-xs text-subtle">Loading…</p>}
        {error && <p className="text-xs text-red-400">Failed to load: {error.message}</p>}

        <Section
          title="Application"
          footer={(backendBuild || FRONTEND_BUILD) && (
            <>
              A development build is shown as its image tag, dev-&lt;commit&gt;, followed by the version. Versions are
              bumped at release, so different builds can have the same version; the build is the exact commit. Landed on
              dev since this build:{' '}
              {backendBuild && <CompareLink repo={ACEX_REPO} buildId={backendBuild}>backend</CompareLink>}
              {backendBuild && FRONTEND_BUILD && ' · '}
              {FRONTEND_BUILD && <CompareLink repo={FRONTEND_REPO} buildId={FRONTEND_BUILD}>frontend</CompareLink>}
            </>
          )}
        >
          <Row label="Frontend" value={<Version version={pkg.version} repo={FRONTEND_REPO} buildId={FRONTEND_BUILD} buildRef={FRONTEND_REF} />} />
          {data && <Row label="Backend (API)" value={<Version version={data.version} repo={ACEX_REPO} buildId={backendBuild} buildRef={backendRef} />} />}
          {data && <Row label="Python" value={<span className="text-[13px] font-mono text-content">{data.python}</span>} />}
        </Section>

        {data && (
          <Section title="Backend packages">
            {Object.entries(packages).map(([name, version]) => (
              <Row key={name} label={name} value={<Version version={version} repo={ACEX_REPO} buildId={backendBuild} buildRef={backendRef} />} />
            ))}
          </Section>
        )}

        {drivers.length > 0 && (
          <Section title="Drivers (NEDs)">
            {drivers.map(d => (
              <Row key={d.name} label={`${d.name} (${d.package})`} value={<Version version={d.version} repo={ACEX_REPO} buildId={backendBuild} buildRef={backendRef} />} />
            ))}
          </Section>
        )}

        {agents && (
          <Section title="Agents" footer="An agent reports its build and version each time it checks in. An agent too old to report shows “not reported”.">
            <AgentGroup title="Collection" agents={agents[0].items} />
            <AgentGroup title="Telemetry" agents={agents[1].items} />
          </Section>
        )}
      </div>
    </div>
  )
}
