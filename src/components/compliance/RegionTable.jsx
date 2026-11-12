import ComplianceBar from './ComplianceBar'
import { formatPct } from './compliance'

function Kpi({ pct }) {
  return (
    <div className="flex items-center gap-2">
      <ComplianceBar pct={pct} className="min-w-16" />
      <span className="w-12 text-right tabular-nums text-content">{formatPct(pct)}</span>
    </div>
  )
}

// Configuration and software compliance per region, side by side as separate KPIs.
// regions: { [regionName]: compliance summary }.
export default function RegionTable({ regions, loading }) {
  const rows = Object.entries(regions ?? {})
  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden">
      <div className="px-4 py-2.5 border-b border-edge">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Compliance per region</h3>
      </div>
      {loading ? (
        <p className="px-4 py-3 text-xs text-subtle animate-pulse">Checking…</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-3 text-xs text-subtle">No regions with sites yet.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-edge">
              {['Region', 'Configuration', 'Software', 'Nodes', 'Assets'].map((h, i) => (
                <th key={h} className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle ${i > 2 ? 'text-right' : 'text-left'} ${i === 1 || i === 2 ? 'w-1/3' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, summary]) => (
              <tr key={name} className="border-b border-edge/50 last:border-0">
                <td className="px-4 py-2 font-medium text-content whitespace-nowrap">{name}</td>
                <td className="px-4 py-2"><Kpi pct={summary.configuration.compliance_percentage} /></td>
                <td className="px-4 py-2"><Kpi pct={summary.software.compliance_percentage} /></td>
                <td className="px-4 py-2 text-right tabular-nums text-subtle">{summary.configuration.nodes_total}</td>
                <td className="px-4 py-2 text-right tabular-nums text-subtle">{summary.software.assets_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
