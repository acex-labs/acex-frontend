import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import ComplianceRing from './ComplianceRing'
import SegmentedBar from './SegmentedBar'
import { configurationParts, softwareParts } from './compliance'

// Configuration and software compliance are separate KPIs: each its own card, with a ring for the percentage and
// a bar for what it is made of. Used on the compliance overview and the dashboard.

function CardFrame({ title, to, children }) {
  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden flex flex-col">
      <div className="px-4 py-2.5 border-b border-edge flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">{title}</h3>
        {to && (
          <Link to={to} className="flex items-center gap-0.5 text-[10px] text-subtle hover:text-content transition-colors">
            Details <ChevronRight size={10} />
          </Link>
        )}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  )
}

function Body({ pct, loading, error, lines, parts, label }) {
  if (error) return <p className="text-xs text-subtle">Compliance unavailable.</p>
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5">
        <ComplianceRing pct={pct} size={96} variant="lg" loading={loading} />
        <div className="space-y-1 text-xs">
          {loading
            ? <div className="text-subtle animate-pulse">Checking…</div>
            : lines.map(line => <div key={line.text} className={line.muted ? 'text-subtle' : 'text-content'}>{line.text}</div>)}
        </div>
      </div>
      {!loading && <SegmentedBar parts={parts} label={label} />}
    </div>
  )
}

// summary: a configuration compliance summary (nodes, components and their percentage).
export function ConfigurationComplianceCard({ summary, loading, error, to, title = 'Configuration compliance' }) {
  const s = summary ?? {}
  const lines = s.compliance_percentage == null
    ? [{ text: s.nodes_total ? 'No configuration collected yet' : 'No nodes', muted: true }]
    : [
        { text: `${s.compliant_count} of ${s.total_desired} desired components compliant` },
        ...(s.nodes_not_collected ? [{ text: `${s.nodes_not_collected} of ${s.nodes_total} nodes not collected`, muted: true }] : []),
        { text: `${s.undeclared_count} undeclared · ${s.unparsed_count} unparsed lines`, muted: true },
      ]
  return (
    <CardFrame title={title} to={to}>
      <Body pct={s.compliance_percentage ?? null} loading={loading} error={error} lines={lines} parts={configurationParts(s)} label="Desired components" />
    </CardFrame>
  )
}

// summary: a software compliance summary, counted per asset.
export function SoftwareComplianceCard({ summary, loading, error, to, title = 'Software compliance' }) {
  const s = summary ?? {}
  const compliant = (s.golden_count ?? 0) + (s.accepted_count ?? 0)
  const measured = compliant + (s.not_allowed_count ?? 0)
  const unmeasured = (s.no_policy_count ?? 0) + (s.unknown_version_count ?? 0)
  const lines = s.compliance_percentage == null
    ? [{ text: s.assets_total ? 'No asset covered by the software policy' : 'No assets', muted: true }]
    : [
        { text: `${compliant} of ${measured} assets on an approved version` },
        ...(unmeasured ? [{ text: `${unmeasured} not measured`, muted: true }] : []),
      ]
  return (
    <CardFrame title={title} to={to}>
      <Body pct={s.compliance_percentage ?? null} loading={loading} error={error} lines={lines} parts={softwareParts(s)} label="Assets" />
    </CardFrame>
  )
}
