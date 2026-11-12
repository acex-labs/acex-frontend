import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchSiteCompliance } from '../../api/compliance'
import { fetchNodes } from '../../api/inventory'
import ComplianceBar from '../../components/compliance/ComplianceBar'
import SegmentedBar from '../../components/compliance/SegmentedBar'
import { SOFTWARE_PARTS, formatPct, softwareParts } from '../../components/compliance/compliance'

function StatTile({ label, value, hint }) {
  return (
    <div className="bg-surface border border-edge rounded-md px-5 py-4" title={hint}>
      <div className="text-2xl font-semibold text-content">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-subtle mt-0.5">{label}</div>
    </div>
  )
}

function SectionHeading({ children }) {
  return <h2 className="text-xs font-semibold text-heading">{children}</h2>
}

function TableCard({ title, columns, children }) {
  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden">
      <div className="px-4 py-2.5 border-b border-edge">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">{title}</h3>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-edge">
            {columns.map(c => (
              <th
                key={c.label}
                title={c.hint}
                className={`text-left text-[10px] font-semibold uppercase tracking-wider text-subtle px-4 py-2 whitespace-nowrap ${c.className ?? ''}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

const CONFIGURATION_COLUMNS = [
  { label: 'Node' },
  { label: 'Compliance', className: 'w-full' },
  { label: '%', className: 'text-right' },
  { label: 'Compliant', className: 'text-right' },
  { label: 'Undeclared', className: 'text-right', hint: 'Components on the device that the desired configuration does not declare.' },
  { label: 'Unparsed', className: 'text-right', hint: 'Device configuration the driver does not cover yet.' },
]

const SOFTWARE_COLUMNS = [
  { label: 'Node' },
  { label: 'Hardware model' },
  { label: 'Running', className: 'w-full' },
  { label: 'Golden' },
  { label: 'Status' },
]

const STATUS = Object.fromEntries(SOFTWARE_PARTS.map(p => [p.key, p]))

// An asset's software status: its swatch and its name, never the color alone.
function SoftwareStatus({ status }) {
  const part = STATUS[status]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-content">
      <span className={`inline-block w-2 h-2 rounded-full ${part.fill}`} aria-hidden="true" />
      {part.label}
    </span>
  )
}

function ConfigurationSection({ summary, rows, navigate }) {
  const pct = summary.compliance_percentage ?? null
  const sorted = [...rows].sort(
    (a, b) => (a.compliance.configuration.compliance_percentage ?? Infinity) - (b.compliance.configuration.compliance_percentage ?? Infinity),
  )
  return (
    <section className="space-y-4">
      <SectionHeading>Configuration compliance</SectionHeading>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Configuration compliance" value={formatPct(pct)} />
        <StatTile label="Compliant components" value={`${summary.compliant_count ?? 0} / ${summary.total_desired ?? 0}`} />
        <StatTile label="Undeclared" value={summary.undeclared_count ?? 0} hint={CONFIGURATION_COLUMNS[4].hint} />
        <StatTile label="Unparsed lines" value={summary.unparsed_count ?? 0} hint={CONFIGURATION_COLUMNS[5].hint} />
      </div>
      <TableCard title="Configuration compliance per node" columns={CONFIGURATION_COLUMNS}>
        {sorted.map(({ id, node, compliance: { configuration } }) => {
          const nodePct = configuration.compliance_percentage ?? null
          const collected = configuration.status !== 'not_collected'
          return (
            <tr
              key={id}
              onClick={() => navigate(`/network/nodes/${id}?tab=configuration`)}
              className="border-b border-edge/50 last:border-0 hover:bg-surface-hi transition-colors cursor-pointer"
            >
              <td className="px-4 py-2 font-medium text-content whitespace-nowrap">{node?.hostname || id}</td>
              <td className="px-4 py-2">
                {nodePct === null
                  ? <span className="text-[11px] text-subtle">No configuration collected</span>
                  : <ComplianceBar pct={nodePct} />}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-content">{formatPct(nodePct)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-subtle whitespace-nowrap">
                {collected ? `${configuration.compliant_count} / ${configuration.total_desired}` : '—'}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-subtle">{collected ? configuration.undeclared_count : '—'}</td>
              <td className="px-4 py-2 text-right tabular-nums text-subtle">{collected ? configuration.unparsed_count : '—'}</td>
            </tr>
          )
        })}
      </TableCard>
    </section>
  )
}

// Assets not on an approved version first, then the ones nothing measures, then the compliant.
const STATUS_ORDER = ['not_allowed', 'unknown_version', 'no_policy', 'accepted', 'golden']

function SoftwareSection({ summary, rows, navigate }) {
  const compliant = (summary.golden_count ?? 0) + (summary.accepted_count ?? 0)
  const assets = rows
    .flatMap(({ id, node, compliance }) => compliance.software.assets.map(asset => ({ id, node, asset })))
    .sort((a, b) => STATUS_ORDER.indexOf(a.asset.status) - STATUS_ORDER.indexOf(b.asset.status))
  return (
    <section className="space-y-4">
      <SectionHeading>Software compliance</SectionHeading>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Software compliance" value={formatPct(summary.compliance_percentage ?? null)} />
        <StatTile label="On an approved version" value={`${compliant} / ${compliant + (summary.not_allowed_count ?? 0)}`} />
        <StatTile label="On golden" value={summary.golden_count ?? 0} />
        <StatTile
          label="Not measured"
          value={(summary.no_policy_count ?? 0) + (summary.unknown_version_count ?? 0)}
          hint="Assets no software policy covers, or that have not reported their version."
        />
      </div>
      <div className="bg-surface border border-edge rounded-md p-4">
        <SegmentedBar parts={softwareParts(summary)} label="Assets at the site" />
      </div>
      <TableCard title="Software per asset" columns={SOFTWARE_COLUMNS}>
        {assets.map(({ id, node, asset }) => (
          <tr
            key={asset.asset_id}
            onClick={() => navigate(`/network/nodes/${id}`)}
            className="border-b border-edge/50 last:border-0 hover:bg-surface-hi transition-colors cursor-pointer"
          >
            <td className="px-4 py-2 font-medium text-content whitespace-nowrap">{node?.hostname || id}</td>
            <td className="px-4 py-2 text-content whitespace-nowrap">{asset.hardware_model}</td>
            <td className="px-4 py-2 font-mono text-content whitespace-nowrap">
              {asset.os} {asset.os_version ?? <span className="font-sans text-subtle">unknown</span>}
            </td>
            <td className="px-4 py-2 font-mono text-subtle whitespace-nowrap">{asset.golden_version ?? '—'}</td>
            <td className="px-4 py-2"><SoftwareStatus status={asset.status} /></td>
          </tr>
        ))}
      </TableCard>
    </section>
  )
}

export default function SiteComplianceTab({ siteName }) {
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['site-compliance', siteName],
    queryFn: () => fetchSiteCompliance(siteName),
    enabled: !!siteName,
  })

  const { data: nodeData } = useQuery({
    queryKey: ['nodes', { site: siteName, limit: 100 }],
    queryFn: () => fetchNodes({ site: siteName, limit: 100 }),
    enabled: !!siteName,
  })

  if (isLoading) return <div className="p-6 text-xs text-subtle animate-pulse">Checking compliance…</div>
  if (isError) return <div className="p-6 text-xs text-subtle">Compliance unavailable.</div>

  const nodesById = new Map((nodeData?.items ?? []).map(n => [String(n.id), n]))
  const rows = Object.entries(data?.nodes ?? {}).map(([id, compliance]) => ({ id, node: nodesById.get(id), compliance }))

  if (!rows.length) return <div className="p-6 text-xs text-subtle">No nodes at this site.</div>

  return (
    <div className="p-6 space-y-8">
      <ConfigurationSection summary={data.summary.configuration} rows={rows} navigate={navigate} />
      <SoftwareSection summary={data.summary.software} rows={rows} navigate={navigate} />
    </div>
  )
}
