import { Link } from 'react-router-dom'
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

// Configuration and software compliance side by side as separate KPIs, one row per region or per site.
// rows: [{ key, name, to?, summary }]; `to` makes the name a link, `summary` is a compliance summary (a row with
// none, such as a site with no nodes, shows dashes and zeros).
export default function ComplianceTable({ title, nameLabel, rows, loading, emptyText }) {
  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden">
      <div className="px-4 py-2.5 border-b border-edge">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">{title}</h3>
      </div>
      {loading ? (
        <p className="px-4 py-3 text-xs text-subtle animate-pulse">Checking…</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-3 text-xs text-subtle">{emptyText}</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-edge">
              {[nameLabel, 'Configuration', 'Software', 'Nodes', 'Assets'].map((h, i) => (
                <th key={h} className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle ${i > 2 ? 'text-right' : 'text-left'} ${i === 1 || i === 2 ? 'w-1/3' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, name, to, summary }) => (
              <tr key={key} className="border-b border-edge/50 last:border-0">
                <td className="px-4 py-2 font-medium whitespace-nowrap">
                  {to
                    ? <Link to={to} className="text-brand hover:underline">{name}</Link>
                    : <span className="text-content">{name}</span>}
                </td>
                <td className="px-4 py-2"><Kpi pct={summary?.configuration?.compliance_percentage ?? null} /></td>
                <td className="px-4 py-2"><Kpi pct={summary?.software?.compliance_percentage ?? null} /></td>
                <td className="px-4 py-2 text-right tabular-nums text-subtle">{summary?.configuration?.nodes_total ?? 0}</td>
                <td className="px-4 py-2 text-right tabular-nums text-subtle">{summary?.software?.assets_total ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
