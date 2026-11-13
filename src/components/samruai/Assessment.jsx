import { useQuery } from '@tanstack/react-query'
import { fetchPriorityMatrix } from '../../api/samruai'

const LABEL = 'text-[10px] font-semibold uppercase tracking-widest text-subtle'

const PRIORITY_STYLES = {
  1: 'text-red-400 border-red-500/50 bg-red-500/10',
  2: 'text-orange-400 border-orange-400/50 bg-orange-400/10',
  3: 'text-amber-300 border-amber-300/40 bg-amber-300/10',
  4: 'text-subtle border-edge',
}

// P1 to P4, or a quiet dash until impact and urgency are both assessed.
export function PriorityBadge({ priority, className = '' }) {
  if (!priority) return <span className={`text-subtle ${className}`} title="Impact and urgency not assessed">—</span>
  return <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${PRIORITY_STYLES[priority]} ${className}`}>P{priority}</span>
}

// One scale, 1 (worst) to 4, each level with what it means.
function Scale({ label, about, levels, value, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className={LABEL}>{label}</span>
        <span className="text-[11px] text-subtle truncate" title={about}>{about}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {levels.map(l => (
          <button
            key={l.level}
            type="button"
            onClick={() => onChange(l.level === value ? null : l.level)}
            className={`text-left px-2.5 py-1.5 rounded-md border ${l.level === value ? 'border-brand/60 bg-brand/10' : 'border-edge hover:border-brand/30 hover:bg-surface-hi'}`}
          >
            <div className={`text-xs font-semibold ${l.level === value ? 'text-content' : 'text-subtle'}`}>{l.level} · {l.label}</div>
            <div className="text-[10px] leading-snug text-subtle">{l.about}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// The matrix with the chosen pair marked: impact down the side, urgency across.
function Matrix({ data, impact, urgency }) {
  return (
    <table className="text-[10px] border-collapse">
      <thead>
        <tr>
          <th className="px-1.5 py-1 text-left font-normal text-subtle">Impact ↓ Urgency →</th>
          {data.urgency.map(u => <th key={u.level} className={`px-1.5 py-1 font-normal ${u.level === urgency ? 'text-content' : 'text-subtle'}`}>{u.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.impact.map((i, row) => (
          <tr key={i.level}>
            <td className={`px-1.5 py-1 ${i.level === impact ? 'text-content' : 'text-subtle'}`}>{i.label}</td>
            {data.matrix[row].map((p, col) => {
              const chosen = i.level === impact && col + 1 === urgency
              return (
                <td key={col} className="px-1 py-0.5 text-center">
                  <span className={chosen ? 'inline-block ring-2 ring-brand rounded' : 'opacity-60'}><PriorityBadge priority={p} /></span>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const priorityOf = (data, impact, urgency) => (data && impact && urgency ? data.matrix[impact - 1][urgency - 1] : null)

// Impact and urgency, each on its own scale, and the priority they give (the ITIL priority matrix). The levels
// and the matrix come from SamruAI, which keeps the priority with the triage.
export default function Assessment({ impact, urgency, onChange }) {
  const { data, error } = useQuery({ queryKey: ['samruai', 'priority-matrix'], queryFn: fetchPriorityMatrix, staleTime: Infinity, retry: false })
  if (error) return <p className="text-[11px] text-red-400">Could not load the priority matrix: {error.detail ?? error.message}</p>
  if (!data) return <p className="text-[11px] text-subtle">Loading…</p>
  const priority = priorityOf(data, impact, urgency)
  return (
    <div className="space-y-3">
      <Scale label="Impact" about="How much harm is done: how many are affected, and how critical is what they lose." levels={data.impact} value={impact} onChange={v => onChange({ impact: v })} />
      <Scale label="Urgency" about="How fast the harm grows if nothing is done." levels={data.urgency} value={urgency} onChange={v => onChange({ urgency: v })} />
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2 px-3 py-2 rounded-md border border-edge">
        <div className="space-y-1">
          <div className={LABEL}>Priority</div>
          <div className="text-lg"><PriorityBadge priority={priority} className="text-sm px-2 py-1" /></div>
          {!priority && <p className="text-[11px] text-subtle">Choose impact and urgency.</p>}
        </div>
        <Matrix data={data} impact={impact} urgency={urgency} />
      </div>
    </div>
  )
}
