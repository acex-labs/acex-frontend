import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchSiteCompliance } from '../../api/compliance'
import { fetchNodes } from '../../api/inventory'
import { complianceTone } from '../../components/sites/compliance'

function StatTile({ label, value, hint }) {
  return (
    <div className="bg-surface border border-edge rounded-md px-5 py-4" title={hint}>
      <div className="text-2xl font-semibold text-content tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-subtle mt-0.5">{label}</div>
    </div>
  )
}

// A meter from 0 to 100 %: the bar grows from the left and ends rounded at its value.
function ComplianceBar({ pct }) {
  const tone = complianceTone(pct)
  return (
    <div className="h-2 w-full rounded-r bg-surface-hi">
      {tone && pct > 0 && (
        <div className={`h-full rounded-r ${tone.fill}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      )}
    </div>
  )
}

const COLUMNS = [
  { label: 'Node' },
  { label: 'Compliance', className: 'w-full' },
  { label: '%', className: 'text-right' },
  { label: 'Compliant', className: 'text-right' },
  { label: 'Undeclared', className: 'text-right', hint: 'Components on the device that the desired configuration does not declare.' },
  { label: 'Unparsed', className: 'text-right', hint: 'Device configuration the driver does not cover yet.' },
]

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

  const summary = data?.summary?.configuration ?? {}
  const pct = summary.compliance_percentage ?? null
  const nodesById = new Map((nodeData?.items ?? []).map(n => [String(n.id), n]))
  const rows = Object.entries(data?.nodes ?? {})
    .map(([id, { configuration: compliance }]) => ({ id, node: nodesById.get(id), compliance }))
    .sort((a, b) => (a.compliance.compliance_percentage ?? Infinity) - (b.compliance.compliance_percentage ?? Infinity))

  if (!rows.length) return <div className="p-6 text-xs text-subtle">No nodes at this site.</div>

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Site compliance" value={pct === null ? '—' : `${pct}%`} />
        <StatTile label="Compliant components" value={`${summary.compliant_count ?? 0} / ${summary.total_desired ?? 0}`} />
        <StatTile label="Undeclared" value={summary.undeclared_count ?? 0} hint={COLUMNS[4].hint} />
        <StatTile label="Unparsed lines" value={summary.unparsed_count ?? 0} hint={COLUMNS[5].hint} />
      </div>

      <div className="bg-surface border border-edge rounded-md overflow-hidden">
        <div className="px-4 py-2.5 border-b border-edge">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Compliance per node</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-edge">
              {COLUMNS.map(c => (
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
          <tbody>
            {rows.map(({ id, node, compliance }) => {
              const nodePct = compliance.compliance_percentage ?? null
              const collected = compliance.status !== 'not_collected'
              return (
                <tr
                  key={id}
                  onClick={() => navigate(`/network/nodes/${id}?tab=configuration`)}
                  className="border-b border-edge/50 last:border-0 hover:bg-surface-hi transition-colors cursor-pointer"
                >
                  <td className="px-4 py-2 font-medium text-content whitespace-nowrap">{node?.hostname || id}</td>
                  <td className="px-4 py-2">
                    {nodePct === null
                      ? <span className="text-[11px] text-subtle">Not collected</span>
                      : <ComplianceBar pct={nodePct} />}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-content">{nodePct === null ? '—' : `${nodePct}%`}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-subtle whitespace-nowrap">
                    {collected ? `${compliance.compliant_count} / ${compliance.total_desired}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-subtle">{collected ? compliance.undeclared_count : '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-subtle">{collected ? compliance.unparsed_count : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
